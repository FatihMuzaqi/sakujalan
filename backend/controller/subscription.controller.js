import * as subscriptionService from '../services/subscription.service.js';
import * as paymentService from '../services/payment.service.js';
import { successResponse } from '../utils/response.util.js';

export const getSubscriptionStatus = async (req, res, next) => {
  try {
    const result = await subscriptionService.getCompanySubscription(req.user.company_id);
    return successResponse(res, {
      message: 'Subscription information retrieved',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const checkout = async (req, res, next) => {
  try {
    const result = await subscriptionService.initiateCheckout(req.user.company_id, req.body);
    return successResponse(res, {
      statusCode: 201,
      message: 'Subscription invoice created. Please complete payment.',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentHistory = async (req, res, next) => {
  try {
    const result = await subscriptionService.getCompanyPaymentHistory(req.user.company_id, req.query);
    return successResponse(res, {
      message: 'Payment transaction history retrieved',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const cancelSubscription = async (req, res, next) => {
  try {
    const result = await subscriptionService.cancelSubscription(req.user.company_id, req.body.reason);
    return successResponse(res, {
      message: 'Subscription cancelled successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const syncPayment = async (req, res, next) => {
  try {
    const { invoice_number } = req.body;
    let result;
    if (invoice_number) {
      result = await paymentService.syncPaymentStatus(invoice_number);
    } else {
      result = await paymentService.syncCompanyPendingPayments(req.user.company_id);
    }
    return successResponse(res, {
      message: result?.message || 'Status pembayaran berhasil disinkronkan',
      data: result
    });
  } catch (error) {
    next(error);
  }
};
