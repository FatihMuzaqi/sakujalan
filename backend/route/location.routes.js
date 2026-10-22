import { Router } from 'express';
import * as locationController from '../controller/location.controller.js';
import { validate } from '../validators/validator.wrapper.js';
import { logLocationSchema, batchLocationSchema } from '../validators/location.validator.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';
import { enforceTenant } from '../middleware/tenant.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { requireActiveSubscription } from '../middleware/subscription.middleware.js';
import { ROLES } from '../config/constants.js';

const router = Router();

router.use(authenticateJWT);
router.use(enforceTenant);
router.use(requireActiveSubscription);

router.post(
  '/',
  authorizeRoles(ROLES.OFFICER),
  validate(logLocationSchema),
  locationController.logLocation
);

router.post(
  '/batch',
  authorizeRoles(ROLES.OFFICER),
  validate(batchLocationSchema),
  locationController.batchLogLocations
);

router.get('/trip/:trip_id', locationController.getTripLocations);
router.get('/trip/:trip_id/latest', locationController.getLatestLocation);
router.get('/trip/:trip_id/stats', locationController.getTripStats);

export default router;
