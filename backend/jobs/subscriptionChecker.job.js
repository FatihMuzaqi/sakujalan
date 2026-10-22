import cron from 'node-cron';
import { Company } from '../model/Company.js';
import { COMPANY_STATUS } from '../config/constants.js';
import { Op } from 'sequelize';
import { logger } from '../utils/logger.util.js';

export const startSubscriptionCronJob = () => {
  // Run daily at midnight: 0 0 * * *
  cron.schedule('0 0 * * *', async () => {
    logger.info('⏰ Running Daily Subscription Expiration Checker...');
    try {
      const now = new Date();

      // 1. Expire Trials
      const [expiredTrialsCount] = await Company.update(
        { status: COMPANY_STATUS.EXPIRED },
        {
          where: {
            status: COMPANY_STATUS.TRIAL,
            trial_ends_at: { [Op.lt]: now }
          }
        }
      );

      // 2. Expire Paid Subscriptions
      const [expiredSubsCount] = await Company.update(
        { status: COMPANY_STATUS.EXPIRED },
        {
          where: {
            status: COMPANY_STATUS.ACTIVE,
            subscription_ends_at: { [Op.lt]: now }
          }
        }
      );

      logger.info(`✅ Subscription Checker complete. Expired trials: ${expiredTrialsCount}, Expired subscriptions: ${expiredSubsCount}`);
    } catch (error) {
      logger.error('Error during subscription cron execution: ' + error.message);
    }
  });

  logger.info('📅 Subscription Cron Job scheduled successfully (0 0 * * *)');
};
