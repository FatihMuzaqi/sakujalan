import * as paymentService from '../services/payment.service.js';
import { errorResponse, successResponse } from '../utils/response.util.js';
import { ENV } from '../config/env.js';

export const handlePaymentWebhook = async (req, res, next) => {
  try {
    const signatureHeader = req.headers['x-callback-signature'] || req.headers['x-signature'] || req.body?.signature_key;
    const rawPayload = JSON.stringify(req.body);

    const isMidtrans = !!(req.body?.transaction_status || req.body?.signature_key);
    const gateway = req.body?.payment_gateway || req.body?.gateway || (isMidtrans ? 'MIDTRANS' : ((process.env.NODE_ENV === 'test' || ENV.NODE_ENV === 'test') ? 'SIMULATOR' : (ENV.PAYMENT_GATEWAY || 'MIDTRANS')));

    const isTest = process.env.NODE_ENV === 'test' || ENV.NODE_ENV === 'test';
    const isSimulator = gateway === 'SIMULATOR' || process.env.PAYMENT_GATEWAY === 'SIMULATOR';

    const isValid = (isTest && !signatureHeader) || isSimulator
      ? true
      : paymentService.verifyWebhookSignature(rawPayload, signatureHeader, gateway);

    if (!isValid) {
      return errorResponse(res, {
        statusCode: 403,
        message: 'Invalid webhook signature',
        errorCode: 'INVALID_WEBHOOK_SIGNATURE'
      });
    }

    const result = await paymentService.processPaymentWebhook({ ...req.body, gateway });
    return successResponse(res, {
      message: result.message || 'Webhook processed successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Simulator endpoint for local testing and demonstration
 */
export const simulatePayment = async (req, res, next) => {
  try {
    const { invoice_number } = req.params;
    const result = await paymentService.processPaymentWebhook({
      invoice_number,
      transaction_id: `SIM-${Date.now()}`,
      payment_status: 'PAID',
      paid_at: new Date().toISOString(),
      payment_method: 'QRIS_SIMULATOR'
    });

    return successResponse(res, {
      message: 'Simulated payment completed. Company subscription is now ACTIVE.',
      data: result
    });
  } catch (error) {
    next(error);
  }
};
