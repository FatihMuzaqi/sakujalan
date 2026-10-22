import { Op, fn, col, literal } from 'sequelize';
import { sequelize, Company, User, CompanyMember, Plan, Subscription, Payment, Trip, Expense } from '../model/index.js';
import { ROLES, USER_STATUS, COMPANY_STATUS, SUBSCRIPTION_STATUS, PAYMENT_STATUS } from '../config/constants.js';
import { hashPassword, comparePassword } from '../utils/hash.util.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.util.js';
import { logger } from '../utils/logger.util.js';

/**
 * SuperAdmin Service - Core business operations for TripEx SaaS platform management.
 */

/**
 * SuperAdmin Login
 * @param {string} email
 * @param {string} password
 */
export const loginSuperAdmin = async (email, password) => {
  const normalizedEmail = (email || '').toLowerCase().trim();
  
  const user = await User.findOne({
    where: {
      email: normalizedEmail,
      role: ROLES.SUPER_ADMIN
    }
  });

  if (!user) {
    const err = new Error('Invalid SuperAdmin credentials');
    err.statusCode = 401;
    err.errorCode = 'SUPERADMIN_AUTH_FAILED';
    throw err;
  }

  if (user.status !== USER_STATUS.ACTIVE && !user.is_active) {
    const err = new Error('SuperAdmin account is deactivated');
    err.statusCode = 403;
    err.errorCode = 'ACCOUNT_DEACTIVATED';
    throw err;
  }

  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    const err = new Error('Invalid SuperAdmin credentials');
    err.statusCode = 401;
    err.errorCode = 'SUPERADMIN_AUTH_FAILED';
    throw err;
  }

  const tokenPayload = {
    userId: user.id,
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    isSuperAdmin: true
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatar_url: user.avatar_url
    },
    accessToken,
    refreshToken
  };
};

/**
 * Get Comprehensive Platform KPI Analytics
 */
export const getAnalyticsSummary = async () => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // 1. Company Status Breakdown
  const totalCompanies = await Company.count();
  const trialCompanies = await Company.count({ where: { status: COMPANY_STATUS.TRIAL } });
  const activeCompanies = await Company.count({ where: { status: COMPANY_STATUS.ACTIVE } });
  const expiredCompanies = await Company.count({ where: { status: COMPANY_STATUS.EXPIRED } });
  const pastDueCompanies = await Company.count({ where: { status: COMPANY_STATUS.PAST_DUE } });
  const suspendedCompanies = await Company.count({ where: { status: COMPANY_STATUS.SUSPENDED } });

  // 2. User Stats
  const totalUsers = await User.count({ where: { role: { [Op.ne]: ROLES.SUPER_ADMIN } } });
  const totalOwners = await User.count({ where: { role: ROLES.OWNER } });
  const totalManagers = await User.count({ where: { role: ROLES.MANAGER } });
  const totalOfficers = await User.count({ where: { role: ROLES.OFFICER } });

  // 3. Financial & Revenue Metrics
  const paidPayments = await Payment.findAll({
    where: { status: PAYMENT_STATUS.PAID },
    attributes: ['amount']
  });

  const totalRevenue = paidPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  const totalPaidTransactions = paidPayments.length;
  const pendingTransactions = await Payment.count({ where: { status: PAYMENT_STATUS.PENDING } });
  const failedTransactions = await Payment.count({
    where: {
      status: {
        [Op.in]: [PAYMENT_STATUS.FAILED, PAYMENT_STATUS.EXPIRED, PAYMENT_STATUS.CANCELLED]
      }
    }
  });

  // Estimated Monthly Recurring Revenue (MRR) based on active paying subscriptions
  const defaultMonthlyPrice = 50000;
  const estimatedMRR = activeCompanies * defaultMonthlyPrice;

  // 4. Usage Statistics
  const totalTrips = await Trip.count();
  const totalExpenses = await Expense.count();

  // 5. Recent 5 Registered Companies
  const recentCompanies = await Company.findAll({
    limit: 5,
    order: [['createdAt', 'DESC']],
    attributes: ['id', 'name', 'email', 'phone', 'status', 'createdAt']
  });

  // 6. Recent 5 Payment Transactions
  const recentPayments = await Payment.findAll({
    limit: 5,
    order: [['createdAt', 'DESC']],
    include: [
      { model: Company, as: 'company', attributes: ['id', 'name', 'email'] }
    ]
  });

  return {
    kpi: {
      companies: {
        total: totalCompanies,
        trial: trialCompanies,
        active: activeCompanies,
        expired: expiredCompanies,
        pastDue: pastDueCompanies,
        suspended: suspendedCompanies
      },
      users: {
        total: totalUsers,
        owners: totalOwners,
        managers: totalManagers,
        officers: totalOfficers
      },
      financial: {
        totalRevenue,
        totalPaidTransactions,
        pendingTransactions,
        failedTransactions,
        estimatedMRR,
        currency: 'IDR'
      },
      usage: {
        totalTrips,
        totalExpenses
      }
    },
    recentCompanies,
    recentPayments
  };
};

/**
 * List All Companies with Filters, Search, and Pagination
 * @param {object} query
 */
export const getAllCompanies = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 10));
  const offset = (page - 1) * limit;

  const whereClause = {};

  if (query.status) {
    whereClause.status = query.status.toUpperCase();
  }

  if (query.search) {
    whereClause[Op.or] = [
      { name: { [Op.like]: `%${query.search}%` } },
      { email: { [Op.like]: `%${query.search}%` } },
      { phone: { [Op.like]: `%${query.search}%` } }
    ];
  }

  const { count, rows } = await Company.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Subscription,
        as: 'subscriptions',
        required: false,
        include: [{ model: Plan, as: 'plan', required: false }]
      }
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
    distinct: true
  });

  // Attach enriched details for each company (Owner, Members count, Sisa Hari Berlangganan / Trial)
  const now = new Date();
  const enrichedRows = await Promise.all(
    rows.map(async (company) => {
      const plain = company.toJSON();

      // Find Owner
      const ownerUser = await User.findOne({
        where: { company_id: company.id, role: ROLES.OWNER },
        attributes: ['id', 'name', 'email', 'phone', 'status']
      });

      // Member Counts
      const memberCount = await CompanyMember.count({ where: { company_id: company.id } });
      const tripCount = await Trip.count({ where: { company_id: company.id } });

      // Sort subscriptions descending by created date to get the latest subscription
      const sortedSubs = (plain.subscriptions || []).sort((a, b) => {
        const timeA = new Date(a.created_at || a.createdAt || 0).getTime();
        const timeB = new Date(b.created_at || b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      const activeSubscription = sortedSubs[0] || null;

      // Calculate Realtime Status & Days Remaining
      let dynamicStatus = company.status || 'TRIAL';
      let daysRemaining = 0;
      let isExpired = false;
      let periodStart = null;
      let periodEnd = null;
      let isTrial = false;
      let isActive = false;

      if (activeSubscription) {
        // Active Paid Subscription
        if (activeSubscription.status === SUBSCRIPTION_STATUS.ACTIVE || (!activeSubscription.status && company.status === 'ACTIVE')) {
          periodStart = activeSubscription.current_period_start || activeSubscription.createdAt || company.createdAt;
          periodEnd = activeSubscription.current_period_end || company.subscription_ends_at;

          if (periodEnd) {
            const endMs = new Date(periodEnd).getTime();
            const diffMs = endMs - now.getTime();
            daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
            isExpired = diffMs <= 0;
            dynamicStatus = isExpired ? COMPANY_STATUS.EXPIRED : COMPANY_STATUS.ACTIVE;
          } else {
            dynamicStatus = COMPANY_STATUS.ACTIVE;
            daysRemaining = 30;
          }
          isActive = !isExpired;
          isTrial = false;
        }
        // Trial Subscription
        else if (activeSubscription.status === SUBSCRIPTION_STATUS.TRIAL || company.status === 'TRIAL') {
          periodStart = activeSubscription.trial_started_at || company.createdAt;
          periodEnd = activeSubscription.trial_ends_at || company.trial_ends_at;

          if (periodEnd) {
            const endMs = new Date(periodEnd).getTime();
            const diffMs = endMs - now.getTime();
            daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
            isExpired = diffMs <= 0;
            dynamicStatus = isExpired ? COMPANY_STATUS.EXPIRED : COMPANY_STATUS.TRIAL;
          } else {
            dynamicStatus = COMPANY_STATUS.TRIAL;
            daysRemaining = 0;
            isExpired = true;
          }
          isTrial = dynamicStatus === COMPANY_STATUS.TRIAL;
          isActive = false;
        }
        // Other Statuses (EXPIRED, PAST_DUE, CANCELLED)
        else {
          dynamicStatus = activeSubscription.status;
          isExpired = true;
          daysRemaining = 0;
          periodStart = activeSubscription.current_period_start || activeSubscription.trial_started_at;
          periodEnd = activeSubscription.current_period_end || activeSubscription.trial_ends_at;
        }
      } else {
        // Fallback to direct company dates if no subscription record
        if (company.subscription_ends_at) {
          const endMs = new Date(company.subscription_ends_at).getTime();
          const diffMs = endMs - now.getTime();
          daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          isExpired = diffMs <= 0;
          dynamicStatus = isExpired ? COMPANY_STATUS.EXPIRED : COMPANY_STATUS.ACTIVE;
          isActive = !isExpired;
          periodEnd = company.subscription_ends_at;
        } else if (company.trial_ends_at) {
          const endMs = new Date(company.trial_ends_at).getTime();
          const diffMs = endMs - now.getTime();
          daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          isExpired = diffMs <= 0;
          dynamicStatus = isExpired ? COMPANY_STATUS.EXPIRED : COMPANY_STATUS.TRIAL;
          isTrial = dynamicStatus === COMPANY_STATUS.TRIAL;
          periodEnd = company.trial_ends_at;
        }
      }

      // Preserve explicit SUSPENDED status
      if (company.status === COMPANY_STATUS.SUSPENDED) {
        dynamicStatus = COMPANY_STATUS.SUSPENDED;
      }

      return {
        ...plain,
        status: dynamicStatus,
        owner: ownerUser,
        memberCount,
        tripCount,
        activeSubscription,
        trialInfo: {
          startedAt: activeSubscription?.trial_started_at || company.createdAt,
          endsAt: activeSubscription?.trial_ends_at || company.trial_ends_at,
          daysRemaining: isTrial ? daysRemaining : 0,
          isExpired: isTrial ? isExpired : true
        },
        subscriptionInfo: {
          status: dynamicStatus,
          planName: activeSubscription?.plan?.name || 'Paket Bulanan',
          planCode: activeSubscription?.plan?.code || 'MONTHLY',
          planPrice: activeSubscription?.plan?.price ? parseFloat(activeSubscription.plan.price) : 50000,
          planId: activeSubscription?.plan_id || activeSubscription?.plan?.id,
          startedAt: periodStart,
          endsAt: periodEnd,
          daysRemaining,
          isExpired,
          isTrial,
          isActive
        }
      };
    })
  );

  return {
    companies: enrichedRows,
    meta: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    }
  };
};

/**
 * Get Comprehensive Single Company Details
 * @param {string} companyId
 */
export const getCompanyDetails = async (companyId) => {
  const company = await Company.findByPk(companyId, {
    include: [
      {
        model: Subscription,
        as: 'subscriptions',
        include: [{ model: Plan, as: 'plan' }]
      }
    ]
  });

  if (!company) {
    const err = new Error('Company not found');
    err.statusCode = 404;
    err.errorCode = 'COMPANY_NOT_FOUND';
    throw err;
  }

  // Fetch all members
  const members = await CompanyMember.findAll({
    where: { company_id: companyId },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'phone', 'role', 'status', 'avatar_url', 'createdAt']
      }
    ]
  });

  // Fetch payment transactions
  const payments = await Payment.findAll({
    where: { company_id: companyId },
    order: [['createdAt', 'DESC']]
  });

  // Fetch usage stats
  const totalTrips = await Trip.count({ where: { company_id: companyId } });
  const totalExpenses = await Expense.count({ where: { company_id: companyId } });

  // Calculate live subscription details
  const sortedSubs = (company.subscriptions || []).sort((a, b) => {
    const timeA = new Date(a.created_at || a.createdAt || 0).getTime();
    const timeB = new Date(b.created_at || b.createdAt || 0).getTime();
    return timeB - timeA;
  });
  const activeSubscription = sortedSubs[0] || null;

  const now = new Date();
  let dynamicStatus = company.status || 'TRIAL';
  let daysRemaining = 0;
  let isExpired = false;
  let periodStart = null;
  let periodEnd = null;
  let isTrial = false;
  let isActive = false;

  if (activeSubscription) {
    if (activeSubscription.status === SUBSCRIPTION_STATUS.ACTIVE || (!activeSubscription.status && company.status === 'ACTIVE')) {
      periodStart = activeSubscription.current_period_start || activeSubscription.createdAt || company.createdAt;
      periodEnd = activeSubscription.current_period_end || company.subscription_ends_at;

      if (periodEnd) {
        const endMs = new Date(periodEnd).getTime();
        const diffMs = endMs - now.getTime();
        daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        isExpired = diffMs <= 0;
        dynamicStatus = isExpired ? COMPANY_STATUS.EXPIRED : COMPANY_STATUS.ACTIVE;
      } else {
        dynamicStatus = COMPANY_STATUS.ACTIVE;
        daysRemaining = 30;
      }
      isActive = !isExpired;
    } else if (activeSubscription.status === SUBSCRIPTION_STATUS.TRIAL || company.status === 'TRIAL') {
      periodStart = activeSubscription.trial_started_at || company.createdAt;
      periodEnd = activeSubscription.trial_ends_at || company.trial_ends_at;

      if (periodEnd) {
        const endMs = new Date(periodEnd).getTime();
        const diffMs = endMs - now.getTime();
        daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        isExpired = diffMs <= 0;
        dynamicStatus = isExpired ? COMPANY_STATUS.EXPIRED : COMPANY_STATUS.TRIAL;
      } else {
        dynamicStatus = COMPANY_STATUS.TRIAL;
        daysRemaining = 0;
        isExpired = true;
      }
      isTrial = dynamicStatus === COMPANY_STATUS.TRIAL;
    } else {
      dynamicStatus = activeSubscription.status;
      isExpired = true;
      daysRemaining = 0;
      periodStart = activeSubscription.current_period_start || activeSubscription.trial_started_at;
      periodEnd = activeSubscription.current_period_end || activeSubscription.trial_ends_at;
    }
  }

  if (company.status === COMPANY_STATUS.SUSPENDED) {
    dynamicStatus = COMPANY_STATUS.SUSPENDED;
  }

  return {
    company: {
      ...company.toJSON(),
      status: dynamicStatus
    },
    activeSubscription,
    subscriptionInfo: {
      status: dynamicStatus,
      planName: activeSubscription?.plan?.name || 'Paket Bulanan',
      planCode: activeSubscription?.plan?.code || 'MONTHLY',
      planPrice: activeSubscription?.plan?.price ? parseFloat(activeSubscription.plan.price) : 50000,
      planId: activeSubscription?.plan_id || activeSubscription?.plan?.id,
      startedAt: periodStart,
      endsAt: periodEnd,
      daysRemaining,
      isExpired,
      isTrial,
      isActive
    },
    members,
    payments,
    stats: {
      totalTrips,
      totalExpenses,
      memberCount: members.length
    }
  };
};

/**
 * Modify or Extend Trial Period for a Company
 * @param {string} companyId
 * @param {object} payload { action, days, customEndDate, reason }
 */
export const updateCompanyTrial = async (companyId, payload = {}) => {
  const { action = 'EXTEND', days = 30, customEndDate, reason } = payload;

  const company = await Company.findByPk(companyId);
  if (!company) {
    const err = new Error('Company not found');
    err.statusCode = 404;
    err.errorCode = 'COMPANY_NOT_FOUND';
    throw err;
  }

  let subscription = await Subscription.findOne({
    where: { company_id: companyId },
    order: [['createdAt', 'DESC']]
  });

  const now = new Date();
  let newTrialEndDate;

  switch (action.toUpperCase()) {
    case 'EXTEND': {
      const baseDate = (subscription?.trial_ends_at && new Date(subscription.trial_ends_at) > now)
        ? new Date(subscription.trial_ends_at)
        : now;
      const addDays = parseInt(days, 10) || 30;
      newTrialEndDate = new Date(baseDate.getTime() + addDays * 24 * 60 * 60 * 1000);
      break;
    }
    case 'SET_DATE': {
      if (!customEndDate) {
        const err = new Error('customEndDate is required for SET_DATE action');
        err.statusCode = 400;
        throw err;
      }
      newTrialEndDate = new Date(customEndDate);
      break;
    }
    case 'RESET': {
      const resetDays = parseInt(days, 10) || 30;
      newTrialEndDate = new Date(now.getTime() + resetDays * 24 * 60 * 60 * 1000);
      break;
    }
    case 'EXPIRE': {
      newTrialEndDate = now;
      break;
    }
    default: {
      const err = new Error(`Unsupported trial action: ${action}. Valid: EXTEND, SET_DATE, RESET, EXPIRE`);
      err.statusCode = 400;
      throw err;
    }
  }

  const isExpired = newTrialEndDate <= now;
  const newStatus = isExpired ? COMPANY_STATUS.EXPIRED : COMPANY_STATUS.TRIAL;

  // Update Company
  await company.update({
    status: newStatus,
    trial_ends_at: newTrialEndDate
  });

  // Update or create Subscription
  if (subscription) {
    await subscription.update({
      status: isExpired ? SUBSCRIPTION_STATUS.EXPIRED : SUBSCRIPTION_STATUS.TRIAL,
      trial_ends_at: newTrialEndDate,
      expired_at: isExpired ? now : null
    });
  }

  logger.info(`[SuperAdmin] Trial updated for Company ${company.name} (${companyId}): Action=${action}, NewEndDate=${newTrialEndDate.toISOString()}, Reason=${reason || 'None'}`);

  return {
    company: {
      id: company.id,
      name: company.name,
      status: company.status
    },
    trialInfo: {
      action,
      trialEndsAt: newTrialEndDate,
      daysRemaining: Math.max(0, Math.ceil((newTrialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
      isExpired
    }
  };
};

/**
 * Update Company Status (e.g. SUSPENDED, ACTIVE)
 * @param {string} companyId
 * @param {object} payload { status, reason }
 */
export const updateCompanyStatus = async (companyId, payload = {}) => {
  const { status, reason } = payload;

  if (!status) {
    const err = new Error('Status is required');
    err.statusCode = 400;
    throw err;
  }

  const company = await Company.findByPk(companyId);
  if (!company) {
    const err = new Error('Company not found');
    err.statusCode = 404;
    err.errorCode = 'COMPANY_NOT_FOUND';
    throw err;
  }

  await company.update({ status: status.toUpperCase() });

  logger.info(`[SuperAdmin] Status updated for Company ${company.name} (${companyId}) to ${status}. Reason: ${reason || 'N/A'}`);

  return company;
};

/**
 * List All Subscriptions across the Platform
 * @param {object} query
 */
export const getAllSubscriptions = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 10));
  const offset = (page - 1) * limit;

  const whereClause = {};
  if (query.status) {
    whereClause.status = query.status.toUpperCase();
  }

  const { count, rows } = await Subscription.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Company,
        as: 'company',
        where: query.search ? { name: { [Op.like]: `%${query.search}%` } } : undefined,
        attributes: ['id', 'name', 'email', 'phone', 'status']
      },
      {
        model: Plan,
        as: 'plan'
      }
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset
  });

  return {
    subscriptions: rows,
    meta: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    }
  };
};

/**
 * List All Payment Transactions across the Platform
 * @param {object} query
 */
export const getAllPayments = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 10));
  const offset = (page - 1) * limit;

  const whereClause = {};
  if (query.status) {
    whereClause.status = query.status.toUpperCase();
  }

  if (query.startDate && query.endDate) {
    whereClause.createdAt = {
      [Op.between]: [new Date(query.startDate), new Date(query.endDate)]
    };
  }

  const { count, rows } = await Payment.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Company,
        as: 'company',
        where: query.search ? { name: { [Op.like]: `%${query.search}%` } } : undefined,
        attributes: ['id', 'name', 'email']
      }
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset
  });

  // Calculate summary stats
  const allPaid = await Payment.findAll({
    where: { status: PAYMENT_STATUS.PAID },
    attributes: ['amount']
  });
  const totalPaidVolume = allPaid.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);
  const pendingCount = await Payment.count({ where: { status: PAYMENT_STATUS.PENDING } });
  const failedCount = await Payment.count({
    where: {
      status: {
        [Op.in]: [PAYMENT_STATUS.FAILED, PAYMENT_STATUS.EXPIRED, PAYMENT_STATUS.CANCELLED]
      }
    }
  });

  return {
    payments: rows,
    summary: {
      totalPaidVolume,
      paidCount: allPaid.length,
      pendingCount,
      failedCount
    },
    meta: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    }
  };
};

/**
 * Seed Default SuperAdmin user if none exists
 */
export const seedDefaultSuperAdmin = async () => {
  try {
    const existing = await User.findOne({ where: { role: ROLES.SUPER_ADMIN } });
    if (!existing) {
      const defaultEmail = process.env.SUPERADMIN_EMAIL || 'superadmin@tripex.id';
      const defaultPassword = process.env.SUPERADMIN_PASSWORD || 'superadmin123';
      const hashedPassword = await hashPassword(defaultPassword);

      const superAdmin = await User.create({
        company_id: null,
        name: 'TripEx Master SuperAdmin',
        email: defaultEmail,
        password: hashedPassword,
        phone: '081234567890',
        role: ROLES.SUPER_ADMIN,
        status: USER_STATUS.ACTIVE,
        is_active: true
      });

      logger.info(`[SuperAdmin] Initial SuperAdmin account created successfully (${superAdmin.email})`);
      return superAdmin;
    }
    return existing;
  } catch (error) {
    logger.error(`[SuperAdmin] Seeding error: ${error.message}`);
    return null;
  }
};

/**
 * ============================================================================
 * SAAS PLAN & PRICING MANAGEMENT (HARGA PER BULAN)
 * ============================================================================
 */

/**
 * Get all SaaS Plans with subscriber statistics
 */
export const getAllPlans = async () => {
  const plans = await Plan.findAll({
    order: [['price', 'ASC']]
  });

  const enrichedPlans = await Promise.all(
    plans.map(async (plan) => {
      const plain = plan.toJSON();
      const activeSubscriptionsCount = await Subscription.count({
        where: {
          plan_id: plan.id,
          status: {
            [Op.in]: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL]
          }
        }
      });
      return {
        ...plain,
        price: parseFloat(plain.price),
        activeSubscribers: activeSubscriptionsCount
      };
    })
  );

  return enrichedPlans;
};

/**
 * Get single SaaS Plan by ID
 * @param {string} planId
 */
export const getPlanById = async (planId) => {
  const plan = await Plan.findByPk(planId);
  if (!plan) {
    const err = new Error('Subscription Plan not found');
    err.statusCode = 404;
    err.errorCode = 'PLAN_NOT_FOUND';
    throw err;
  }
  const plain = plan.toJSON();
  return {
    ...plain,
    price: parseFloat(plain.price)
  };
};

/**
 * Create a new SaaS Plan
 * @param {object} data
 */
export const createPlan = async (data = {}) => {
  const {
    name,
    code,
    price = 50000,
    billing_interval = 'MONTHLY',
    trial_days = 30,
    max_users = 50,
    max_active_trips = 100,
    max_expenses = 500,
    is_active = true
  } = data;

  if (!name || !code) {
    const err = new Error('Plan name and unique code are required');
    err.statusCode = 400;
    err.errorCode = 'VALIDATION_ERROR';
    throw err;
  }

  const existing = await Plan.findOne({ where: { code: code.toUpperCase().trim() } });
  if (existing) {
    const err = new Error(`Plan code '${code}' already exists`);
    err.statusCode = 400;
    err.errorCode = 'DUPLICATE_PLAN_CODE';
    throw err;
  }

  const plan = await Plan.create({
    name: name.trim(),
    code: code.toUpperCase().trim(),
    price: parseFloat(price) || 0,
    billing_interval,
    trial_days: parseInt(trial_days, 10) || 30,
    max_users: max_users ? parseInt(max_users, 10) : null,
    max_active_trips: max_active_trips ? parseInt(max_active_trips, 10) : null,
    max_expenses: max_expenses ? parseInt(max_expenses, 10) : null,
    is_active: is_active !== false
  });

  logger.info(`[SuperAdmin] New Plan created: ${plan.name} (${plan.code}) - Rp ${plan.price} / ${plan.billing_interval}`);
  return plan;
};

/**
 * Update an existing SaaS Plan (Pricing, limits, active status)
 * @param {string} planId
 * @param {object} data
 */
export const updatePlan = async (planId, data = {}) => {
  const plan = await Plan.findByPk(planId);
  if (!plan) {
    const err = new Error('Subscription Plan not found');
    err.statusCode = 404;
    err.errorCode = 'PLAN_NOT_FOUND';
    throw err;
  }

  const updates = {};
  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.price !== undefined) {
    const numPrice = parseFloat(data.price);
    if (isNaN(numPrice) || numPrice < 0) {
      const err = new Error('Price must be a valid positive number');
      err.statusCode = 400;
      throw err;
    }
    updates.price = numPrice;
  }
  if (data.billing_interval !== undefined) updates.billing_interval = data.billing_interval;
  if (data.trial_days !== undefined) updates.trial_days = parseInt(data.trial_days, 10);
  if (data.max_users !== undefined) updates.max_users = data.max_users ? parseInt(data.max_users, 10) : null;
  if (data.max_active_trips !== undefined) updates.max_active_trips = data.max_active_trips ? parseInt(data.max_active_trips, 10) : null;
  if (data.max_expenses !== undefined) updates.max_expenses = data.max_expenses ? parseInt(data.max_expenses, 10) : null;
  if (data.is_active !== undefined) updates.is_active = Boolean(data.is_active);

  await plan.update(updates);
  logger.info(`[SuperAdmin] Plan updated: ${plan.name} (${plan.code}) - Price: Rp ${plan.price}`);

  return {
    ...plan.toJSON(),
    price: parseFloat(plan.price)
  };
};

/**
 * Update single Plan monthly price
 * @param {string} planId
 * @param {number} price
 */
export const updatePlanPrice = async (planId, price) => {
  return await updatePlan(planId, { price });
};

/**
 * Update / Override Company Subscription details (Plan, Status, Duration)
 * @param {string} companyId
 * @param {object} payload { action, plan_id, days, customEndDate, status, reason }
 */
export const updateCompanySubscription = async (companyId, payload = {}) => {
  const {
    action = 'EXTEND',
    plan_id,
    days = 30,
    customEndDate,
    status,
    reason
  } = payload;

  const company = await Company.findByPk(companyId);
  if (!company) {
    const err = new Error('Company not found');
    err.statusCode = 404;
    err.errorCode = 'COMPANY_NOT_FOUND';
    throw err;
  }

  let subscription = await Subscription.findOne({
    where: { company_id: companyId },
    order: [['createdAt', 'DESC']]
  });

  const now = new Date();
  let targetPlanId = plan_id;

  if (!targetPlanId && subscription) {
    targetPlanId = subscription.plan_id;
  } else if (!targetPlanId) {
    const defaultPlan = await Plan.findOne({ where: { is_active: true } });
    targetPlanId = defaultPlan?.id;
  }

  let newStatus = status ? status.toUpperCase() : (subscription?.status || SUBSCRIPTION_STATUS.ACTIVE);
  let newPeriodStart = subscription?.current_period_start || now;
  let newPeriodEnd = subscription?.current_period_end;

  const addDays = parseInt(days, 10) || 30;

  switch (action.toUpperCase()) {
    case 'ACTIVATE': {
      newStatus = SUBSCRIPTION_STATUS.ACTIVE;
      newPeriodStart = now;
      newPeriodEnd = customEndDate
        ? new Date(customEndDate)
        : new Date(now.getTime() + addDays * 24 * 60 * 60 * 1000);
      break;
    }
    case 'EXTEND': {
      newStatus = SUBSCRIPTION_STATUS.ACTIVE;
      const baseEnd = (subscription?.current_period_end && new Date(subscription.current_period_end) > now)
        ? new Date(subscription.current_period_end)
        : now;
      newPeriodEnd = new Date(baseEnd.getTime() + addDays * 24 * 60 * 60 * 1000);
      break;
    }
    case 'SET_DATE': {
      if (!customEndDate) {
        const err = new Error('customEndDate is required for SET_DATE action');
        err.statusCode = 400;
        throw err;
      }
      newPeriodEnd = new Date(customEndDate);
      newStatus = newPeriodEnd > now ? SUBSCRIPTION_STATUS.ACTIVE : SUBSCRIPTION_STATUS.EXPIRED;
      break;
    }
    case 'EXPIRE': {
      newStatus = SUBSCRIPTION_STATUS.EXPIRED;
      newPeriodEnd = now;
      break;
    }
    case 'CHANGE_PLAN': {
      // Kept existing period, just switch plan
      break;
    }
    default: {
      if (!status) {
        const err = new Error(`Unsupported subscription action: ${action}`);
        err.statusCode = 400;
        throw err;
      }
    }
  }

  // Update or Create Subscription
  if (subscription) {
    await subscription.update({
      plan_id: targetPlanId || subscription.plan_id,
      status: newStatus,
      current_period_start: newPeriodStart,
      current_period_end: newPeriodEnd,
      expired_at: newStatus === SUBSCRIPTION_STATUS.EXPIRED ? now : null
    });
  } else {
    subscription = await Subscription.create({
      company_id: companyId,
      plan_id: targetPlanId,
      status: newStatus,
      current_period_start: newPeriodStart,
      current_period_end: newPeriodEnd
    });
  }

  // Sync company status
  const companyStatus = newStatus === SUBSCRIPTION_STATUS.EXPIRED
    ? COMPANY_STATUS.EXPIRED
    : (newStatus === SUBSCRIPTION_STATUS.TRIAL ? COMPANY_STATUS.TRIAL : COMPANY_STATUS.ACTIVE);

  await company.update({
    status: companyStatus,
    subscription_ends_at: newPeriodEnd
  });

  logger.info(`[SuperAdmin] Subscription updated for Company ${company.name} (${companyId}): Status=${newStatus}, EndDate=${newPeriodEnd ? newPeriodEnd.toISOString() : 'N/A'}, Reason=${reason || 'SuperAdmin update'}`);

  return {
    company: {
      id: company.id,
      name: company.name,
      status: company.status
    },
    subscription: {
      id: subscription.id,
      plan_id: subscription.plan_id,
      status: subscription.status,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end
    }
  };
};

/**
 * ============================================================================
 * PASSWORD MANAGEMENT & USER ADMINISTRATION
 * ============================================================================
 */

/**
 * List all users across the platform with filtering & pagination
 * @param {object} query
 */
export const getAllUsers = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 10));
  const offset = (page - 1) * limit;

  const whereClause = {};

  if (query.role) {
    whereClause.role = query.role.toUpperCase();
  }

  if (query.status) {
    whereClause.status = query.status.toUpperCase();
  }

  if (query.company_id) {
    whereClause.company_id = query.company_id;
  }

  if (query.search) {
    whereClause[Op.or] = [
      { name: { [Op.like]: `%${query.search}%` } },
      { email: { [Op.like]: `%${query.search}%` } },
      { phone: { [Op.like]: `%${query.search}%` } }
    ];
  }

  const { count, rows } = await User.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Company,
        as: 'company',
        required: false,
        attributes: ['id', 'name', 'email', 'status']
      }
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
    attributes: { exclude: ['password'] }
  });

  return {
    users: rows,
    meta: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    }
  };
};

/**
 * Reset password for any partner user / staff account
 * @param {string} userId
 * @param {string} newPassword
 */
export const resetUserPassword = async (userId, newPassword) => {
  if (!newPassword || newPassword.trim().length < 6) {
    const err = new Error('Password baru minimal harus 6 karakter');
    err.statusCode = 400;
    err.errorCode = 'INVALID_PASSWORD_LENGTH';
    throw err;
  }

  const user = await User.findByPk(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    err.errorCode = 'USER_NOT_FOUND';
    throw err;
  }

  const hashedPassword = await hashPassword(newPassword.trim());
  await user.update({ password: hashedPassword });

  logger.info(`[SuperAdmin] Password reset successfully for user: ${user.name} (${user.email}) - ID: ${user.id}`);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      company_id: user.company_id
    },
    message: `Password untuk ${user.name} (${user.email}) berhasil direset.`
  };
};

/**
 * Reset password for the Owner of a specific company
 * @param {string} companyId
 * @param {string} newPassword
 */
export const resetCompanyOwnerPassword = async (companyId, newPassword) => {
  const company = await Company.findByPk(companyId);
  if (!company) {
    const err = new Error('Company not found');
    err.statusCode = 404;
    err.errorCode = 'COMPANY_NOT_FOUND';
    throw err;
  }

  const owner = await User.findOne({
    where: {
      company_id: companyId,
      role: ROLES.OWNER
    }
  });

  if (!owner) {
    const err = new Error('Owner user for this company not found');
    err.statusCode = 404;
    err.errorCode = 'OWNER_NOT_FOUND';
    throw err;
  }

  return await resetUserPassword(owner.id, newPassword);
};

/**
 * Change password for the logged-in SuperAdmin
 * @param {string} superAdminId
 * @param {string} currentPassword
 * @param {string} newPassword
 */
export const changeSuperAdminPassword = async (superAdminId, currentPassword, newPassword) => {
  if (!currentPassword || !newPassword) {
    const err = new Error('Password saat ini dan password baru harus diisi');
    err.statusCode = 400;
    err.errorCode = 'VALIDATION_ERROR';
    throw err;
  }

  if (newPassword.trim().length < 6) {
    const err = new Error('Password baru minimal harus 6 karakter');
    err.statusCode = 400;
    err.errorCode = 'INVALID_PASSWORD_LENGTH';
    throw err;
  }

  const superAdmin = await User.findByPk(superAdminId);
  if (!superAdmin || superAdmin.role !== ROLES.SUPER_ADMIN) {
    const err = new Error('SuperAdmin account not found');
    err.statusCode = 404;
    err.errorCode = 'SUPERADMIN_NOT_FOUND';
    throw err;
  }

  const isCurrentValid = await comparePassword(currentPassword, superAdmin.password);
  if (!isCurrentValid) {
    const err = new Error('Password saat ini tidak sesuai');
    err.statusCode = 400;
    err.errorCode = 'INVALID_CURRENT_PASSWORD';
    throw err;
  }

  const hashedPassword = await hashPassword(newPassword.trim());
  await superAdmin.update({ password: hashedPassword });

  logger.info(`[SuperAdmin] SuperAdmin ${superAdmin.email} changed password successfully`);

  return {
    id: superAdmin.id,
    email: superAdmin.email,
    name: superAdmin.name,
    message: 'Password SuperAdmin berhasil diubah'
  };
};
