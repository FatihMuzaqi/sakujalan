import { Router } from 'express';
import * as webhookController from '../controller/webhook.controller.js';

const router = Router();

// Endpoint for Payment Gateway webhook callbacks (Midtrans / Xendit / etc)
router.post('/payment', webhookController.handlePaymentWebhook);

// Development simulator endpoint for testing instant subscription renewal
router.get('/pay-simulator/:invoice_number', webhookController.simulatePayment);

export default router;
