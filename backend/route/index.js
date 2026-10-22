import { Router } from 'express';
import { getHealthStatus } from '../controller/health.controller.js';
import authRoutes from './auth.routes.js';
import companyRoutes from './company.routes.js';
import userRoutes from './user.routes.js';
import tripRoutes from './trip.routes.js';
import locationRoutes from './location.routes.js';
import expenseRoutes from './expense.routes.js';
import walletRoutes from './wallet.routes.js';
import subscriptionRoutes from './subscription.routes.js';
import webhookRoutes from './webhook.routes.js';
import reportRoutes from './report.routes.js';
import superadminRoutes from './superadmin.routes.js';

const apiRouter = Router();

// Health check endpoint: GET /api/v1/health
apiRouter.get('/health', getHealthStatus);

apiRouter.use('/auth', authRoutes);
apiRouter.use('/company', companyRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/trips', tripRoutes);
apiRouter.use('/locations', locationRoutes);
apiRouter.use('/expenses', expenseRoutes);
apiRouter.use('/wallet', walletRoutes);
apiRouter.use('/wallets', walletRoutes);
apiRouter.use('/subscriptions', subscriptionRoutes);
apiRouter.use('/subscription', subscriptionRoutes);
apiRouter.use('/webhooks', webhookRoutes);
apiRouter.use('/reports', reportRoutes);
apiRouter.use('/superadmin', superadminRoutes);

export default apiRouter;
