import { Router } from 'express';
import * as reportController from '../controller/report.controller.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';
import { enforceTenant } from '../middleware/tenant.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticateJWT);
router.use(enforceTenant);

router.get(
  '/dashboard',
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER),
  reportController.getDashboardSummary
);

router.get(
  '/expenses',
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER),
  reportController.getExpenseAnalytics
);

export default router;
