import { sequelize } from '../config/database.js';
import '../model/index.js';
import { logger } from '../utils/logger.util.js';

const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    logger.info('🔌 Connected to MySQL database.');
    logger.info('🔄 Altering and syncing tables with Sequelize models...');
    await sequelize.sync({ alter: true });
    logger.info('✅ Database synchronization complete. All columns (including google_id and auth_provider) are now up to date.');
  } catch (error) {
    logger.error('❌ Database sync failed: ' + error.message, error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

syncDatabase();
