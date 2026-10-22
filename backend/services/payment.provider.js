import crypto from 'crypto';
import { ENV } from '../config/env.js';
import { logger } from '../utils/logger.util.js';

/**
 * Base Payment Gateway Provider Interface / Adapter
 */
export class BasePaymentGatewayProvider {
  /**
   * Generates invoice checkout URL and gateway token
   * @param {Object} orderData
   * @returns {Promise<Object>}
   */
  async createInvoice(orderData) {
    throw new Error('createInvoice must be implemented by payment gateway provider');
  }

  /**
   * Verifies incoming webhook signature
   * @param {string} rawPayload
   * @param {string} signatureHeader
   * @returns {boolean}
   */
  verifySignature(rawPayload, signatureHeader) {
    throw new Error('verifySignature must be implemented by payment gateway provider');
  }

  /**
   * Checks real-time transaction status directly from payment gateway API
   * @param {string} orderId
   * @returns {Promise<Object|null>}
   */
  async checkTransactionStatus(orderId) {
    return null;
  }
}

/**
 * Simulator / Mock Payment Provider for Development & Automated Testing
 */
export class SimulatorPaymentProvider extends BasePaymentGatewayProvider {
  async createInvoice({ invoiceNumber, amount, companyName, userEmail, paymentMethod }) {
    const paymentUrl = `/api/v1/webhooks/pay-simulator/${invoiceNumber}`;
    return {
      gateway: 'SIMULATOR',
      gateway_order_id: invoiceNumber,
      payment_url: paymentUrl,
      payment_token: `SIM-TOK-${Date.now()}`,
      amount,
      currency: 'IDR',
      status: 'PENDING'
    };
  }

  verifySignature(rawPayload, signatureHeader) {
    // Simulator automatically accepts if ENV is SIMULATOR or test mode or valid secret match
    if (process.env.PAYMENT_GATEWAY === 'SIMULATOR' || ENV.PAYMENT_GATEWAY === 'SIMULATOR' || process.env.NODE_ENV === 'test' || ENV.NODE_ENV === 'test') {
      return true;
    }
    try {
      const expected = crypto
        .createHmac('sha512', ENV.PAYMENT_WEBHOOK_SECRET || 'test_secret')
        .update(rawPayload)
        .digest('hex');
      return expected === signatureHeader;
    } catch {
      return false;
    }
  }

  parseWebhook(payload) {
    return {
      invoice_number: payload.invoice_number || payload.order_id,
      transaction_id: payload.transaction_id || `TRX-${Date.now()}`,
      payment_status: payload.payment_status || (payload.status === 'PAID' ? 'PAID' : 'PENDING'),
      amount: parseFloat(payload.amount || payload.gross_amount || 0),
      paid_at: payload.paid_at ? new Date(payload.paid_at) : new Date(),
      payment_method: payload.payment_method || 'QRIS_SIMULATOR',
      event_id: payload.event_id || payload.transaction_id || `EVT-${Date.now()}`,
      gateway: 'SIMULATOR',
      raw: payload
    };
  }

  async checkTransactionStatus(orderId) {
    return {
      order_id: orderId,
      transaction_id: `SIM-${Date.now()}`,
      transaction_status: 'settlement',
      status_code: '200',
      gross_amount: '50000',
      payment_type: 'qris_simulator'
    };
  }
}

/**
 * Midtrans Payment Provider Adapter (Production & Sandbox Midtrans Snap API)
 */
export class MidtransPaymentProvider extends BasePaymentGatewayProvider {
  constructor(
    serverKey = ENV.PAYMENT_SERVER_KEY,
    clientKey = ENV.PAYMENT_CLIENT_KEY,
    isProduction = (ENV.PAYMENT_IS_PRODUCTION === true || process.env.PAYMENT_IS_PRODUCTION === 'true')
  ) {
    super();
    this.serverKey = serverKey;
    this.clientKey = clientKey;
    this.isProduction = isProduction;
    this.snapApiUrl = this.isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
  }

  async createInvoice({ invoiceNumber, amount, companyName, userEmail, paymentMethod }) {
    logger.info(`Midtrans Snap createInvoice initiated: ${invoiceNumber} - Rp ${amount} (${this.isProduction ? 'Production' : 'Sandbox'})`);

    const authHeader = 'Basic ' + Buffer.from(this.serverKey + ':').toString('base64');
    const payload = {
      transaction_details: {
        order_id: invoiceNumber,
        gross_amount: Math.round(amount)
      },
      customer_details: {
        first_name: companyName || 'Pelanggan TripEx',
        email: userEmail || 'billing@tripex.id'
      },
      item_details: [
        {
          id: 'TRIPEX-MONTHLY',
          price: Math.round(amount),
          quantity: 1,
          name: 'Langganan TripEx Pro 30 Hari'
        }
      ]
    };

    try {
      const response = await fetch(this.snapApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();

      if (response.ok && (resData.redirect_url || resData.token)) {
        logger.info(`Midtrans Snap token generated successfully for ${invoiceNumber}: ${resData.token}`);
        return {
          gateway: 'MIDTRANS',
          gateway_order_id: invoiceNumber,
          payment_url: resData.redirect_url || `https://app.midtrans.com/snap/v2/vtweb/${resData.token}`,
          payment_token: resData.token,
          client_key: this.clientKey,
          amount,
          currency: 'IDR',
          status: 'PENDING'
        };
      } else {
        logger.warn(`Midtrans Snap API responded with: ${JSON.stringify(resData)}`);
        return {
          gateway: 'MIDTRANS',
          gateway_order_id: invoiceNumber,
          payment_url: resData.redirect_url || `https://app.midtrans.com/snap/v2/vtweb/${invoiceNumber}`,
          payment_token: resData.token || `MID-SNAP-${Date.now()}`,
          client_key: this.clientKey,
          amount,
          currency: 'IDR',
          status: 'PENDING'
        };
      }
    } catch (err) {
      logger.error('Midtrans Snap API HTTP Error: ' + err.message);
      return {
        gateway: 'MIDTRANS',
        gateway_order_id: invoiceNumber,
        payment_url: `https://app.midtrans.com/snap/v2/vtweb/${invoiceNumber}`,
        payment_token: `MID-SNAP-${Date.now()}`,
        client_key: this.clientKey,
        amount,
        currency: 'IDR',
        status: 'PENDING'
      };
    }
  }

  verifySignature(rawPayload, signatureHeader) {
    try {
      const parsed = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
      const order_id = parsed.order_id || parsed.invoice_number;
      const status_code = parsed.status_code || '200';
      const gross_amount = parsed.gross_amount || parsed.amount;
      const sig = signatureHeader || parsed.signature_key;

      if (!sig) return false;

      const signatureString = `${order_id}${status_code}${gross_amount}${this.serverKey}`;
      const hash = crypto.createHash('sha512').update(signatureString).digest('hex');
      return hash === sig;
    } catch (e) {
      logger.error('Midtrans signature verification error: ' + e.message);
      return false;
    }
  }

  async checkTransactionStatus(orderId) {
    const statusApiUrl = this.isProduction
      ? `https://api.midtrans.com/v2/${orderId}/status`
      : `https://api.sandbox.midtrans.com/v2/${orderId}/status`;

    const authHeader = 'Basic ' + Buffer.from(this.serverKey + ':').toString('base64');

    try {
      logger.info(`Midtrans checkTransactionStatus query for order ${orderId} (${this.isProduction ? 'Production' : 'Sandbox'})`);
      const response = await fetch(statusApiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': authHeader
        }
      });

      const resData = await response.json();
      logger.info(`Midtrans status response for ${orderId}: HTTP ${response.status} - status: ${resData.transaction_status || resData.status_message}`);

      if (response.ok && resData.status_code && resData.status_code !== '404') {
        return resData;
      }
      return null;
    } catch (err) {
      logger.error(`Error querying Midtrans status API for ${orderId}: ${err.message}`);
      return null;
    }
  }

  parseWebhook(payload) {
    const isSettlement = payload.transaction_status === 'settlement' || payload.transaction_status === 'capture' || payload.payment_status === 'PAID' || payload.payment_status === 'SUCCESS';
    const isPending = payload.transaction_status === 'pending' || payload.payment_status === 'PENDING';
    const isExpired = payload.transaction_status === 'expire' || payload.transaction_status === 'cancel' || payload.transaction_status === 'deny' || payload.payment_status === 'EXPIRED';

    let paymentStatus = 'PENDING';
    if (isSettlement) paymentStatus = 'PAID';
    else if (isExpired) paymentStatus = 'EXPIRED';

    const invoiceNumber = payload.order_id || payload.invoice_number || payload.gateway_order_id;
    const transactionId = payload.transaction_id || `TRX-${Date.now()}`;
    const amount = parseFloat(payload.gross_amount || payload.amount || 0);

    return {
      invoice_number: invoiceNumber,
      transaction_id: transactionId,
      payment_status: paymentStatus,
      amount,
      paid_at: payload.settlement_time ? new Date(payload.settlement_time) : (payload.paid_at ? new Date(payload.paid_at) : new Date()),
      payment_method: payload.payment_type || payload.payment_method || 'MIDTRANS',
      event_id: payload.transaction_id || payload.event_id || `EVT-${Date.now()}`,
      gateway: 'MIDTRANS',
      raw: payload
    };
  }
}

/**
 * Factory to resolve active Payment Gateway Provider
 */
export const getPaymentProvider = (gatewayName = ENV.PAYMENT_GATEWAY) => {
  if (ENV.NODE_ENV === 'test' && (!gatewayName || gatewayName === 'SIMULATOR')) {
    return new SimulatorPaymentProvider();
  }
  const normalized = (gatewayName || ENV.PAYMENT_GATEWAY || 'MIDTRANS').toUpperCase();
  switch (normalized) {
    case 'MIDTRANS':
      return new MidtransPaymentProvider();
    case 'SIMULATOR':
      return new SimulatorPaymentProvider();
    default:
      return new MidtransPaymentProvider();
  }
};
