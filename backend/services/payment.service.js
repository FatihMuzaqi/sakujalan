import { sequelize, Subscription, Payment, Company, PaymentWebhookLog, Plan } from '../model/index.js';
import { SUBSCRIPTION_STATUS, PAYMENT_STATUS, COMPANY_STATUS, DEFAULT_PLANS } from '../config/constants.js';
import { getPaymentProvider } from './payment.provider.js';
import { activateSubscription } from './subscription.service.js';
import { logger } from '../utils/logger.util.js';

import { ENV } from '../config/env.js';

/**
 * Creates a subscription checkout session and records PENDING payment
 */
export const createSubscriptionCheckout = async (companyId, { payment_method = 'QRIS', gateway = ENV.PAYMENT_GATEWAY || 'MIDTRANS', plan_code } = {}) => {
  const transaction = await sequelize.transaction();
  try {
    const company = await Company.findByPk(companyId, { transaction });
    if (!company) {
      const err = new Error('Company not found');
      err.statusCode = 404;
      throw err;
    }

    // Find latest subscription
    let subscription = await Subscription.findOne({
      where: { company_id: companyId },
      order: [['created_at', 'DESC']],
      include: [{ model: Plan, as: 'plan' }],
      transaction
    });

    // Dynamic Plan Pricing from Database (SuperAdmin configurable)
    let plan;
    if (plan_code) {
      plan = await Plan.findOne({ where: { code: plan_code, is_active: true }, transaction });
    }
    if (!plan && subscription?.plan) {
      plan = subscription.plan;
    }
    if (!plan && subscription?.plan_id) {
      plan = await Plan.findByPk(subscription.plan_id, { transaction });
    }
    if (!plan) {
      plan = await Plan.findOne({ where: { is_active: true }, order: [['price', 'ASC']], transaction });
    }
    if (!plan) {
      plan = await Plan.create({
        name: DEFAULT_PLANS.MONTHLY.name,
        code: DEFAULT_PLANS.MONTHLY.code,
        price: DEFAULT_PLANS.MONTHLY.price,
        billing_interval: DEFAULT_PLANS.MONTHLY.billing_interval,
        trial_days: DEFAULT_PLANS.MONTHLY.trial_days || 30,
        max_users: DEFAULT_PLANS.MONTHLY.max_users,
        max_active_trips: DEFAULT_PLANS.MONTHLY.max_active_trips,
        max_expenses: DEFAULT_PLANS.MONTHLY.max_expenses,
        is_active: true
      }, { transaction });
    }

    const price = parseFloat(plan.price);
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Resolve Provider
    const provider = getPaymentProvider(gateway);
    const invoiceResult = await provider.createInvoice({
      invoiceNumber,
      amount: price,
      companyName: company.name,
      userEmail: company.email,
      paymentMethod: payment_method
    });

    if (!subscription) {
      subscription = await Subscription.create(
        {
          company_id: companyId,
          plan_id: plan.id,
          status: SUBSCRIPTION_STATUS.PAST_DUE
        },
        { transaction }
      );
    } else if (subscription.plan_id !== plan.id) {
      await subscription.update({ plan_id: plan.id }, { transaction });
    }

    // Create Payment record
    const payment = await Payment.create(
      {
        company_id: companyId,
        subscription_id: subscription.id,
        gateway_order_id: invoiceNumber,
        amount: price,
        currency: 'IDR',
        payment_gateway: gateway,
        payment_method,
        status: PAYMENT_STATUS.PENDING
      },
      { transaction }
    );

    await transaction.commit();

    return {
      subscription,
      payment,
      checkout_info: {
        invoice_number: invoiceNumber,
        amount: price,
        plan_name: plan.name,
        plan_code: plan.code,
        payment_method,
        payment_url: invoiceResult.payment_url,
        payment_token: invoiceResult.payment_token,
        gateway: invoiceResult.gateway,
        client_key: invoiceResult.client_key || ENV.PAYMENT_CLIENT_KEY
      }
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Verifies incoming webhook signature against configured secret
 */
export const verifyWebhookSignature = (payloadString, signatureHeader, gateway = 'SIMULATOR') => {
  const provider = getPaymentProvider(gateway);
  return provider.verifySignature(payloadString, signatureHeader);
};

/**
 * Processes incoming payment gateway webhook with strict idempotency and atomic transactional updates
 */
export const processPaymentWebhook = async (webhookPayload) => {
  const gateway = webhookPayload.payment_gateway || webhookPayload.gateway || 'SIMULATOR';
  const provider = getPaymentProvider(gateway);
  const normalized = provider.parseWebhook(webhookPayload);

  const { invoice_number, transaction_id, payment_status, paid_at, payment_method, event_id, amount } = normalized;

  // 1. Check idempotency: Have we already processed this event_id?
  const existingEventLog = await PaymentWebhookLog.findOne({
    where: { event_id: event_id }
  });

  if (existingEventLog && existingEventLog.status === 'PROCESSED') {
    await PaymentWebhookLog.create({
      payment_gateway: gateway,
      event_type: payment_status,
      event_id: `DUP-${event_id}-${Date.now()}`,
      payload: webhookPayload,
      status: 'DUPLICATE',
      processed_at: new Date()
    });
    return {
      success: true,
      message: 'Duplicate webhook event ignored (Idempotent)',
      status: 'DUPLICATE'
    };
  }

  // 2. Log initial webhook receipt
  const webhookLog = await PaymentWebhookLog.create({
    payment_gateway: gateway,
    event_type: payment_status || 'PAYMENT_UPDATE',
    event_id: event_id || transaction_id || `EVT-${Date.now()}`,
    payload: webhookPayload,
    status: 'RECEIVED'
  });

  const transaction = await sequelize.transaction();
  try {
    const payment = await Payment.findOne({
      where: { gateway_order_id: invoice_number },
      include: [
        { model: Subscription, as: 'subscription' },
        { model: Company, as: 'company' }
      ],
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!payment) {
      await webhookLog.update({ status: 'FAILED', error_message: `Invoice ${invoice_number} not found` });
      await transaction.rollback();
      const err = new Error(`Payment with invoice ${invoice_number} not found`);
      err.statusCode = 404;
      throw err;
    }

    // Idempotency check on payment status: If already paid, do not re-extend
    if (payment.status === PAYMENT_STATUS.PAID) {
      await webhookLog.update({ status: 'DUPLICATE', processed_at: new Date() });
      await transaction.commit();
      return { success: true, message: 'Payment was already processed (Idempotent)', status: 'DUPLICATE' };
    }

    if (payment_status === 'SUCCESS' || payment_status === 'PAID') {
      const paidDate = paid_at ? new Date(paid_at) : new Date();

      // Update Payment record
      await payment.update(
        {
          status: PAYMENT_STATUS.PAID,
          gateway_transaction_id: transaction_id || `TRX-${Date.now()}`,
          payment_method: payment_method || payment.payment_method,
          paid_at: paidDate,
          raw_response: webhookPayload
        },
        { transaction }
      );

      // Activate/Renew Subscription (with Early Payment remaining period preservation)
      await activateSubscription(payment.company_id, payment.subscription?.plan_id, 30, { transaction });

      await webhookLog.update({ status: 'PROCESSED', processed_at: new Date() });
      await transaction.commit();

      return {
        success: true,
        message: 'Payment processed successfully and subscription activated',
        status: 'PAID'
      };
    } else if (payment_status === 'FAILED' || payment_status === 'EXPIRED') {
      await payment.update(
        {
          status: payment_status === 'FAILED' ? PAYMENT_STATUS.FAILED : PAYMENT_STATUS.EXPIRED,
          raw_response: webhookPayload
        },
        { transaction }
      );

      await webhookLog.update({ status: 'PROCESSED', processed_at: new Date() });
      await transaction.commit();

      return {
        success: true,
        message: `Payment status marked as ${payment_status}`,
        status: payment_status
      };
    }

    await transaction.commit();
    return { success: true, message: 'Webhook received and recorded' };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Query Midtrans/Gateway directly to sync payment and activate subscription if paid
 * @param {string} invoiceNumber
 */
export const syncPaymentStatus = async (invoiceNumber) => {
  const payment = await Payment.findOne({
    where: { gateway_order_id: invoiceNumber },
    include: [
      { model: Subscription, as: 'subscription' },
      { model: Company, as: 'company' }
    ]
  });

  if (!payment) {
    const err = new Error(`Transaksi dengan invoice ${invoiceNumber} tidak ditemukan`);
    err.statusCode = 404;
    throw err;
  }

  // If already marked as PAID in local DB, return success immediately
  if (payment.status === PAYMENT_STATUS.PAID) {
    return {
      success: true,
      synced: true,
      status: PAYMENT_STATUS.PAID,
      message: 'Pembayaran sudah terverifikasi dan berstatus PAID',
      payment
    };
  }

  const gateway = payment.payment_gateway || ENV.PAYMENT_GATEWAY || 'MIDTRANS';
  const provider = getPaymentProvider(gateway);

  if (typeof provider.checkTransactionStatus === 'function') {
    const gatewayStatus = await provider.checkTransactionStatus(invoiceNumber);
    if (gatewayStatus) {
      const isSettlement = gatewayStatus.transaction_status === 'settlement' ||
        gatewayStatus.transaction_status === 'capture' ||
        gatewayStatus.payment_status === 'PAID' ||
        gatewayStatus.payment_status === 'SUCCESS';

      if (isSettlement) {
        // Process as successful webhook
        const webhookResult = await processPaymentWebhook({
          ...gatewayStatus,
          gateway,
          invoice_number: invoiceNumber
        });

        // Re-fetch updated payment record
        const updatedPayment = await Payment.findOne({
          where: { gateway_order_id: invoiceNumber },
          include: [
            { model: Subscription, as: 'subscription' },
            { model: Company, as: 'company' }
          ]
        });

        return {
          success: true,
          synced: true,
          status: PAYMENT_STATUS.PAID,
          message: 'Status pembayaran berhasil disinkronkan dengan Midtrans (PAID) dan langganan aktif!',
          payment: updatedPayment,
          webhookResult
        };
      } else if (gatewayStatus.transaction_status === 'expire' || gatewayStatus.transaction_status === 'cancel' || gatewayStatus.transaction_status === 'deny') {
        await payment.update({
          status: PAYMENT_STATUS.EXPIRED,
          raw_response: gatewayStatus
        });
        return {
          success: true,
          synced: true,
          status: PAYMENT_STATUS.EXPIRED,
          message: `Status pembayaran di Midtrans adalah ${gatewayStatus.transaction_status}`,
          payment
        };
      } else {
        return {
          success: true,
          synced: false,
          status: PAYMENT_STATUS.PENDING,
          message: 'Status di Midtrans masih menunggu pembayaran (PENDING). Selesaikan pembayaran di channel yang dipilih.',
          payment
        };
      }
    }
  }

  return {
    success: false,
    synced: false,
    status: payment.status,
    message: 'Tidak dapat menghubungi payment gateway untuk verifikasi status saat ini',
    payment
  };
};

/**
 * Sync all pending payments for a specific company
 * @param {string} companyId
 */
export const syncCompanyPendingPayments = async (companyId) => {
  const pendingPayments = await Payment.findAll({
    where: {
      company_id: companyId,
      status: PAYMENT_STATUS.PENDING
    },
    order: [['createdAt', 'DESC']],
    limit: 5
  });

  const syncResults = [];
  for (const p of pendingPayments) {
    try {
      const res = await syncPaymentStatus(p.gateway_order_id);
      syncResults.push(res);
    } catch (e) {
      logger.warn(`Failed to sync payment ${p.gateway_order_id}: ${e.message}`);
    }
  }

  return syncResults;
};
