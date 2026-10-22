import { Router } from 'express';
import * as subscriptionController from '../controller/subscription.controller.js';
import { validate } from '../validators/validator.wrapper.js';
import { checkoutSubscriptionSchema } from '../validators/subscription.validator.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';
import { enforceTenant } from '../middleware/tenant.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticateJWT);
router.use(enforceTenant);

// Subscription details & status
router.get('/', subscriptionController.getSubscriptionStatus);
router.get('/status', subscriptionController.getSubscriptionStatus);

// Payment history ledger
router.get('/history', subscriptionController.getPaymentHistory);
router.get('/payments', subscriptionController.getPaymentHistory);

// Checkout
router.post(
  '/checkout',
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN),
  validate(checkoutSubscriptionSchema),
  subscriptionController.checkout
);

// Cancellation
router.post(
  '/cancel',
  authorizeRoles(ROLES.OWNER),
  subscriptionController.cancelSubscription
);

// Sync / Verify Payment Status Directly with Midtrans
router.post(
  '/sync-payment',
  subscriptionController.syncPayment
);

export default router;
