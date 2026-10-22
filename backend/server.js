import http from 'http';
import app from './app.js';
import { ENV } from './config/env.js';
import { connectDatabase, sequelize } from './config/database.js';
import { initializeSocket } from './services/socket.service.js';
import { startSubscriptionJob } from './jobs/subscription.job.js';
import { seedDefaultSuperAdmin } from './services/superadmin.service.js';
import { logger } from './utils/logger.util.js';
// Import models to ensure associations are registered
import './model/index.js';

const httpServer = http.createServer(app);

// Initialize Realtime Socket.IO Gateway
initializeSocket(httpServer);

// Start Server Function
const startServer = async () => {
  try {
    // 1. Connect & Sync Database
    await connectDatabase();
    
    // In development mode, auto sync models if enabled
    if (ENV.NODE_ENV === 'development') {
      try {
        await sequelize.sync({ alter: true });
        logger.info('📦 Database models synchronized successfully');
      } catch (syncErr) {
        logger.warn('Database sync skipped/failed (ensure MySQL is running): ' + syncErr.message);
      }
    }

    // 2. Seed Default SuperAdmin Account
    await seedDefaultSuperAdmin();

    // 3. Start Background Jobs
    startSubscriptionJob();

    // 3. Listen on HTTP port
    httpServer.listen(ENV.PORT, () => {
      logger.info(`🚀 TripEx SaaS Backend Server running on http://localhost:${ENV.PORT}`);
      logger.info(`📡 Socket.IO Real-time Gateway active on port ${ENV.PORT}`);
      logger.info(`🛠️ Environment: ${ENV.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Fatal Server Initialization Error: ' + error.message, error);
    process.exit(1);
  }
};

// Graceful Shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Closing HTTP server and database pool gracefully...');
  httpServer.close(async () => {
    await sequelize.close();
    logger.info('Process terminated.');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Closing HTTP server and database pool gracefully...');
  httpServer.close(async () => {
    await sequelize.close();
    logger.info('Process terminated.');
    process.exit(0);
  });
});

startServer();
