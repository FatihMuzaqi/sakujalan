import { Router } from 'express';
import * as authController from '../controller/auth.controller.js';
import { validate } from '../validators/validator.wrapper.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  googleAuthSchema
} from '../validators/auth.validator.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';

const router = Router();

// Public Authentication Endpoints
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/google', validate(googleAuthSchema), authController.googleAuth);
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);

// Protected Authentication Endpoints
router.post('/logout', authenticateJWT, authController.logout);
router.get('/me', authenticateJWT, authController.getMe);
router.put('/change-password', authenticateJWT, validate(changePasswordSchema), authController.changePassword);

export default router;
