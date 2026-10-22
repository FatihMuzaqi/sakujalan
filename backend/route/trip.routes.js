import { Router } from 'express';
import * as tripController from '../controller/trip.controller.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';
import { enforceTenant } from '../middleware/tenant.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { requireSubscriptionAccess } from '../middleware/subscription.middleware.js';
import { validate } from '../validators/validator.wrapper.js';
import {
  createTripSchema,
  updateTripSchema,
  assignOfficerSchema,
  updateTripStatusSchema
} from '../validators/trip.validator.js';
import { ROLES } from '../config/constants.js';

const router = Router();

// Apply JWT Authentication, Tenant Isolation, and Subscription Access Guard
router.use(authenticateJWT);
router.use(enforceTenant);
router.use(requireSubscriptionAccess);

// --- Officer Dashboard Route ---
router.get('/officer/dashboard', tripController.getOfficerDashboard);

// --- Trip CRUD & Listings ---
router.get('/', tripController.getTrips);

router.post(
  '/',
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER),
  validate(createTripSchema),
  tripController.createTrip
);

router.get('/:id', tripController.getTripById);

router.put(
  '/:id',
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER),
  validate(updateTripSchema),
  tripController.updateTrip
);

router.delete(
  '/:id',
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER),
  tripController.deleteTrip
);

// --- Officer Assignment ---
router.post(
  '/:id/assign',
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER),
  validate(assignOfficerSchema),
  tripController.assignOfficer
);

router.put(
  '/:id/assign',
  authorizeRoles(ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER),
  validate(assignOfficerSchema),
  tripController.assignOfficer
);

// --- Lifecycle State Transitions ---
router.post('/:id/start', tripController.startTrip);

router.post('/:id/complete', tripController.completeTrip);

router.put(
  '/:id/status',
  validate(updateTripStatusSchema),
  tripController.updateTripStatus
);

router.patch(
  '/:id/status',
  validate(updateTripStatusSchema),
  tripController.updateTripStatus
);

export default router;
