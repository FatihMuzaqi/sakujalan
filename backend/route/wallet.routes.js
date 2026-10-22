import { Router } from 'express';
import * as walletController from '../controller/wallet.controller.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';
import { enforceTenant } from '../middleware/tenant.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { requireActiveSubscription } from '../middleware/subscription.middleware.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticateJWT);
router.use(enforceTenant);
router.use(requireActiveSubscription);

// Ledger (all roles: Officer gets own tx, Manager/Admin/Owner gets company tx)
router.get('/ledger', walletController.getLedger);
router.get('/balance/:tripId', walletController.getTripBalance);
router.get(
  '/officer/:officerId',
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER),
  walletController.getOfficerLedger
);

export default router;
