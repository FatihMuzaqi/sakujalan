import { Router } from 'express';
import * as superadminController from '../controller/superadmin.controller.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';
import { requireSuperAdmin } from '../middleware/superadmin.middleware.js';

const router = Router();

// Public SuperAdmin Authentication
router.post('/auth/login', superadminController.login);

// Protected SuperAdmin Routes (Requires valid JWT & SUPER_ADMIN role)
router.use(authenticateJWT);
router.use(requireSuperAdmin);

// Analytics & KPI
router.get('/analytics/summary', superadminController.getAnalyticsSummary);

// Tenant / Company Management
router.get('/companies', superadminController.getAllCompanies);
router.get('/companies/:id', superadminController.getCompanyDetails);
router.patch('/companies/:id/trial', superadminController.updateCompanyTrial);
router.patch('/companies/:id/status', superadminController.updateCompanyStatus);
router.patch('/companies/:id/subscription', superadminController.updateCompanySubscription);
router.post('/companies/:id/reset-owner-password', superadminController.resetCompanyOwnerPassword);

// SaaS Plan & Pricing Management (Harga per Bulan)
router.get('/plans', superadminController.getAllPlans);
router.get('/plans/:id', superadminController.getPlanById);
router.post('/plans', superadminController.createPlan);
router.patch('/plans/:id', superadminController.updatePlan);
router.patch('/plans/:id/price', superadminController.updatePlanPrice);

// Subscription Monitoring
router.get('/subscriptions', superadminController.getAllSubscriptions);

// Payment Transactions Monitoring
router.get('/payments', superadminController.getAllPayments);
router.post('/payments/:invoiceNumber/sync', superadminController.syncPaymentStatus);

// User & Password Administration
router.get('/users', superadminController.getAllUsers);
router.post('/users/:id/reset-password', superadminController.resetUserPassword);
router.patch('/profile/password', superadminController.changeSuperAdminPassword);

export default router;

