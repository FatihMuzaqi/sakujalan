import { Router } from 'express';
import * as companyController from '../controller/company.controller.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';
import { enforceTenant } from '../middleware/tenant.middleware.js';
import { authorizeRoles, requireAdmin } from '../middleware/role.middleware.js';
import { requireActiveSubscription } from '../middleware/subscription.middleware.js';
import { validate } from '../validators/validator.wrapper.js';
import {
  updateCompanySchema,
  addMemberSchema,
  updateMemberSchema
} from '../validators/company.validator.js';
import { ROLES } from '../config/constants.js';

const router = Router();

// Apply Global JWT Authentication and Tenant Isolation to all company routes
router.use(authenticateJWT);
router.use(enforceTenant);

// --- Company Profile Endpoints ---
router.get('/', companyController.getCompany);
router.put(
  '/',
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN),
  requireActiveSubscription,
  validate(updateCompanySchema),
  companyController.updateCompany
);

// Backward-compatibility aliases
router.get('/profile', companyController.getCompany);
router.put(
  '/profile',
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN),
  requireActiveSubscription,
  validate(updateCompanySchema),
  companyController.updateCompany
);

// --- Company Members Endpoints ---
router.get('/members', companyController.getMembers);

router.post(
  '/members',
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN),
  requireActiveSubscription,
  validate(addMemberSchema),
  companyController.addMember
);

router.put(
  '/members/:id',
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN),
  requireActiveSubscription,
  validate(updateMemberSchema),
  companyController.updateMember
);

router.delete(
  '/members/:id',
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN),
  requireActiveSubscription,
  companyController.deleteMember
);

export default router;
