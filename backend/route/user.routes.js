import { Router } from 'express';
import * as userController from '../controller/user.controller.js';
import { validate } from '../validators/validator.wrapper.js';
import { createUserSchema, updateUserSchema } from '../validators/user.validator.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';
import { enforceTenant } from '../middleware/tenant.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { requireActiveSubscription } from '../middleware/subscription.middleware.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticateJWT);
router.use(enforceTenant);
router.use(requireActiveSubscription);

router.get('/', authorizeRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER), userController.getUsers);
router.get('/:id', userController.getUserById);

router.post(
  '/',
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN),
  validate(createUserSchema),
  userController.createUser
);

router.put(
  '/:id',
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN),
  validate(updateUserSchema),
  userController.updateUser
);

router.patch(
  '/:id/toggle-status',
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN),
  userController.toggleStatus
);

export default router;
