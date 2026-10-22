import cron from 'node-cron';
import { Company, Subscription } from '../model/index.js';
import { COMPANY_STATUS, SUBSCRIPTION_STATUS } from '../config/constants.js';
import { Op } from 'sequelize';
import { logger } from '../utils/logger.util.js';

/**
 * Runs the subscription checker algorithm to expire overdue trials and paid subscriptions
 */
export const checkAndExpireSubscriptions = async () => {
  const now = new Date();
  let expiredTrialsCount = 0;
  let expiredSubsCount = 0;

  try {
    // 1. Expire Trials
    const expiredTrialSubs = await Subscription.findAll({
      where: {
        status: SUBSCRIPTION_STATUS.TRIAL,
        trial_ends_at: { [Op.lt]: now }
      }
    });

    for (const sub of expiredTrialSubs) {
      await sub.update({
        status: SUBSCRIPTION_STATUS.EXPIRED,
        expired_at: now
      });
      await Company.update(
        { status: COMPANY_STATUS.EXPIRED },
        { where: { id: sub.company_id } }
      );
      expiredTrialsCount++;
    }

    // 2. Expire Paid Subscriptions
    const expiredActiveSubs = await Subscription.findAll({
      where: {
        status: SUBSCRIPTION_STATUS.ACTIVE,
        current_period_end: { [Op.lt]: now }
      }
    });

    for (const sub of expiredActiveSubs) {
      await sub.update({
        status: SUBSCRIPTION_STATUS.EXPIRED,
        expired_at: now
      });
      await Company.update(
        { status: COMPANY_STATUS.EXPIRED },
        { where: { id: sub.company_id } }
      );
      expiredSubsCount++;
    }

    logger.info(`⏰ Subscription Job finished. Expired trials: ${expiredTrialsCount}, Expired subscriptions: ${expiredSubsCount}`);
  } catch (error) {
    logger.error('Error during subscription cron execution: ' + error.message);
  }

  return { expiredTrialsCount, expiredSubsCount };
};

/**
 * Schedules daily subscription expiration cron job
 */
export const startSubscriptionJob = () => {
  // Run daily at midnight: 0 0 * * *
  cron.schedule('0 0 * * *', async () => {
    logger.info('⏰ Running Daily Subscription Expiration Checker...');
    await checkAndExpireSubscriptions();
  });

  logger.info('📅 Subscription Cron Job scheduled successfully (0 0 * * *)');
};

// Backwards compatibility alias
export const startSubscriptionCronJob = startSubscriptionJob;
