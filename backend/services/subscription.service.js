import { Company, Subscription, Plan, Payment, User, CompanyMember } from '../model/index.js';
import { SUBSCRIPTION_STATUS, COMPANY_STATUS, DEFAULT_PLANS, USER_STATUS, MEMBER_STATUS } from '../config/constants.js';
import { createSubscriptionCheckout, syncCompanyPendingPayments } from './payment.service.js';
import { Op } from 'sequelize';
import { logger } from '../utils/logger.util.js';

/**
 * Creates a trial subscription for a new company using the default or specified Plan from DB
 * @param {string} companyId
 * @param {string} planCode
 */
export const createTrialSubscription = async (companyId, planCode = 'MONTHLY') => {
  const company = await Company.findByPk(companyId);
  if (!company) {
    const err = new Error('Company not found');
    err.statusCode = 404;
    throw err;
  }

  // Fetch plan from database (Never hardcode pricing in business logic)
  let plan = await Plan.findOne({ where: { code: planCode, is_active: true } });
  if (!plan) {
    plan = await Plan.create({
      name: DEFAULT_PLANS.MONTHLY.name,
      code: DEFAULT_PLANS.MONTHLY.code,
      price: DEFAULT_PLANS.MONTHLY.price,
      billing_interval: DEFAULT_PLANS.MONTHLY.billing_interval,
      trial_days: DEFAULT_PLANS.MONTHLY.trial_days || 30,
      max_users: DEFAULT_PLANS.MONTHLY.max_users,
      max_active_trips: DEFAULT_PLANS.MONTHLY.max_active_trips,
      max_expenses: DEFAULT_PLANS.MONTHLY.max_expenses,
      is_active: true
    });
  }

  const now = new Date();
  const trialDays = plan.trial_days || 30;
  const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

  const subscription = await Subscription.create({
    company_id: company.id,
    plan_id: plan.id,
    status: SUBSCRIPTION_STATUS.TRIAL,
    trial_started_at: now,
    trial_ends_at: trialEndsAt,
    current_period_start: null,
    current_period_end: null
  });

  await company.update({
    status: COMPANY_STATUS.TRIAL,
    trial_ends_at: trialEndsAt
  });

  return {
    subscription,
    plan,
    company
  };
};

/**
 * Retrieves the latest subscription details and plan for a company
 * @param {string} companyId
 */
export const getCompanySubscription = async (companyId) => {
  const company = await Company.findByPk(companyId);
  if (!company) {
    const err = new Error('Company not found');
    err.statusCode = 404;
    throw err;
  }

  // If company is not active, check if there are pending payments that were actually completed on Midtrans
  if (company.status !== COMPANY_STATUS.ACTIVE && process.env.NODE_ENV !== 'test') {
    try {
      await syncCompanyPendingPayments(companyId);
    } catch (e) {
      // Non-blocking sync attempt
    }
  }

  const subscription = await Subscription.findOne({
    where: { company_id: companyId },
    order: [['created_at', 'DESC']],
    include: [
      { model: Plan, as: 'plan' },
      { model: Payment, as: 'payments', limit: 5, order: [['created_at', 'DESC']] }
    ]
  });

  let activePlan = subscription?.plan;
  if (!activePlan && subscription?.plan_id) {
    activePlan = await Plan.findByPk(subscription.plan_id);
  }
  if (!activePlan) {
    activePlan = await Plan.findOne({ where: { is_active: true }, order: [['price', 'ASC']] });
  }

  const statusInfo = await checkSubscriptionStatus(companyId);

  return {
    company: {
      id: company.id,
      name: company.name,
      status: company.status
    },
    subscription,
    plan: activePlan ? {
      name: activePlan.name,
      code: activePlan.code,
      price: parseFloat(activePlan.price),
      billing_interval: activePlan.billing_interval,
      trial_days: activePlan.trial_days,
      max_users: activePlan.max_users
    } : null,
    status_info: statusInfo
  };
};

/**
 * Checks and computes current subscription status, validity, and remaining duration
 * @param {string} companyId
 */
export const checkSubscriptionStatus = async (companyId) => {
  const subscription = await Subscription.findOne({
    where: { company_id: companyId },
    order: [['created_at', 'DESC']],
    include: [{ model: Plan, as: 'plan' }]
  });

  let activePlan = subscription?.plan;
  if (!activePlan && subscription?.plan_id) {
    activePlan = await Plan.findByPk(subscription.plan_id);
  }
  if (!activePlan) {
    activePlan = await Plan.findOne({ where: { is_active: true }, order: [['price', 'ASC']] });
  }

  if (!subscription) {
    return {
      status: COMPANY_STATUS.EXPIRED,
      is_active: false,
      is_read_only: true,
      days_remaining: 0,
      plan: activePlan ? {
        name: activePlan.name,
        code: activePlan.code,
        price: parseFloat(activePlan.price)
      } : null
    };
  }

  const now = new Date();
  let status = subscription.status;
  let isActive = false;
  let isReadOnly = false;
  let daysRemaining = 0;

  if (status === SUBSCRIPTION_STATUS.ACTIVE && subscription.current_period_end) {
    if (new Date(subscription.current_period_end) > now) {
      isActive = true;
      daysRemaining = Math.ceil((new Date(subscription.current_period_end) - now) / (1000 * 60 * 60 * 24));
    } else {
      status = SUBSCRIPTION_STATUS.EXPIRED;
      isReadOnly = true;
    }
  } else if (status === SUBSCRIPTION_STATUS.TRIAL && subscription.trial_ends_at) {
    if (new Date(subscription.trial_ends_at) > now) {
      isActive = true;
      daysRemaining = Math.ceil((new Date(subscription.trial_ends_at) - now) / (1000 * 60 * 60 * 24));
    } else {
      status = SUBSCRIPTION_STATUS.EXPIRED;
      isReadOnly = true;
    }
  } else if (status === SUBSCRIPTION_STATUS.PAST_DUE) {
    isActive = false;
    isReadOnly = false;
  } else {
    isReadOnly = true;
  }

  return {
    status,
    is_active: isActive,
    is_read_only: isReadOnly,
    days_remaining: Math.max(0, daysRemaining),
    trial_ends_at: subscription.trial_ends_at,
    current_period_start: subscription.current_period_start,
    current_period_end: subscription.current_period_end,
    plan: activePlan ? {
      name: activePlan.name,
      code: activePlan.code,
      price: parseFloat(activePlan.price)
    } : null
  };
};

/**
 * Activates a subscription upon verified payment
 * @param {string} companyId
 * @param {string} planId
 * @param {number} durationDays
 * @param {Object} options
 */
export const activateSubscription = async (companyId, planId = null, durationDays = 30, { transaction } = {}) => {
  const company = await Company.findByPk(companyId, { transaction });
  if (!company) {
    const err = new Error('Company not found');
    err.statusCode = 404;
    throw err;
  }

  const subscription = await Subscription.findOne({
    where: { company_id: companyId },
    order: [['created_at', 'DESC']],
    transaction
  });

  const now = new Date();
  let periodStart = now;
  let periodEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  // Early Payment Rule: If existing active period is not expired, extend from existing period end
  if (subscription && subscription.status === SUBSCRIPTION_STATUS.ACTIVE && subscription.current_period_end) {
    const existingEnd = new Date(subscription.current_period_end);
    if (existingEnd > now) {
      periodStart = subscription.current_period_start || now;
      periodEnd = new Date(existingEnd.getTime() + durationDays * 24 * 60 * 60 * 1000);
    }
  }

  let updatedSub;
  if (subscription) {
    updatedSub = await subscription.update(
      {
        plan_id: planId || subscription.plan_id,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        cancelled_at: null,
        cancellation_reason: null
      },
      { transaction }
    );
  } else {
    updatedSub = await Subscription.create(
      {
        company_id: companyId,
        plan_id: planId,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        current_period_start: periodStart,
        current_period_end: periodEnd
      },
      { transaction }
    );
  }

  await company.update(
    {
      status: COMPANY_STATUS.ACTIVE,
      subscription_ends_at: periodEnd
    },
    { transaction }
  );

  // Automatically restore active status for company users and members
  await User.update(
    { status: USER_STATUS.ACTIVE, is_active: true },
    { where: { company_id: companyId, status: { [Op.ne]: USER_STATUS.SUSPENDED } }, transaction }
  );
  await CompanyMember.update(
    { status: MEMBER_STATUS.ACTIVE },
    { where: { company_id: companyId, status: { [Op.ne]: MEMBER_STATUS.SUSPENDED } }, transaction }
  );

  logger.info(`✅ Subscription activated for company ${company.name} (${companyId}) until ${periodEnd.toISOString()}`);
  return updatedSub;
};

/**
 * Renews subscription for another billing period with Early Payment preservation
 */
export const renewSubscription = async (companyId, durationDays = 30, { transaction } = {}) => {
  return await activateSubscription(companyId, null, durationDays, { transaction });
};

/**
 * Manually expire a subscription and company status
 */
export const expireSubscription = async (companyId) => {
  const subscription = await Subscription.findOne({
    where: { company_id: companyId },
    order: [['created_at', 'DESC']]
  });

  if (subscription) {
    await subscription.update({
      status: SUBSCRIPTION_STATUS.EXPIRED,
      expired_at: new Date()
    });
  }

  await Company.update(
    { status: COMPANY_STATUS.EXPIRED },
    { where: { id: companyId } }
  );

  return subscription;
};

/**
 * Cancels a subscription
 */
export const cancelSubscription = async (companyId, reason = 'User requested cancellation') => {
  const subscription = await Subscription.findOne({
    where: { company_id: companyId },
    order: [['created_at', 'DESC']]
  });

  if (!subscription) {
    const err = new Error('Subscription not found');
    err.statusCode = 404;
    throw err;
  }

  await subscription.update({
    status: SUBSCRIPTION_STATUS.CANCELLED,
    cancelled_at: new Date(),
    cancellation_reason: reason
  });

  await Company.update(
    { status: COMPANY_STATUS.CANCELLED },
    { where: { id: companyId } }
  );

  return subscription;
};

/**
 * Evaluates whether a company has full operational access
 * @param {string} companyId
 * @returns {Promise<boolean>}
 */
export const isSubscriptionActive = async (companyId) => {
  const statusInfo = await checkSubscriptionStatus(companyId);
  return statusInfo.is_active;
};

/**
 * Transitions subscription and company to EXPIRED if their validity period has ended (Lazy Evaluation)
 * @param {string} companyId
 */
export const expireSubscriptionIfNeeded = async (companyId) => {
  const subscription = await Subscription.findOne({
    where: { company_id: companyId },
    order: [['created_at', 'DESC']]
  });

  if (!subscription) return null;

  const now = new Date();
  let shouldExpire = false;

  if (subscription.status === SUBSCRIPTION_STATUS.TRIAL && subscription.trial_ends_at && new Date(subscription.trial_ends_at) <= now) {
    shouldExpire = true;
  } else if (subscription.status === SUBSCRIPTION_STATUS.ACTIVE && subscription.current_period_end && new Date(subscription.current_period_end) <= now) {
    shouldExpire = true;
  }

  if (shouldExpire && subscription.status !== SUBSCRIPTION_STATUS.EXPIRED) {
    await subscription.update({
      status: SUBSCRIPTION_STATUS.EXPIRED,
      expired_at: now
    });

    await Company.update(
      { status: COMPANY_STATUS.EXPIRED },
      { where: { id: companyId } }
    );
  }

  return subscription;
};

/**
 * Retrieves payment history ledger for a company
 */
export const getCompanyPaymentHistory = async (companyId, query = {}) => {
  const { page = 1, limit = 20 } = query;
  const offset = (page - 1) * limit;

  const { rows: payments, count: total } = await Payment.findAndCountAll({
    where: { company_id: companyId },
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
    order: [['created_at', 'DESC']]
  });

  return {
    payments,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total_pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Initiate subscription checkout
 */
export const initiateCheckout = async (companyId, checkoutOptions) => {
  return await createSubscriptionCheckout(companyId, checkoutOptions);
};
