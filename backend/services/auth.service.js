import { sequelize, Company, User, CompanyMember, Plan, Subscription } from '../model/index.js';
import { ROLES, USER_STATUS, MEMBER_STATUS, COMPANY_STATUS, SUBSCRIPTION_STATUS, DEFAULT_PLANS } from '../config/constants.js';
import { hashPassword, comparePassword } from '../utils/hash.util.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.util.js';
import { checkSubscriptionStatus, expireSubscriptionIfNeeded } from './subscription.service.js';

/**
 * Register User, Company, Owner Membership, and 30-Day Free Trial Subscription in a single transaction
 */
export const registerCompanyWithTrial = async (data) => {
  const userName = data.name || data.owner_name;
  const userEmail = (data.email || data.owner_email || '').toLowerCase().trim();
  const userPassword = data.password || data.owner_password;
  const userPhone = data.phone || data.owner_phone || null;

  const companyName = data.company_name;
  const companyEmail = (data.company_email || userEmail).toLowerCase().trim();
  const companyPhone = data.company_phone || userPhone;
  const companyAddress = data.company_address || null;

  // 1. Check duplicate email before starting transaction
  const existingUser = await User.findOne({ where: { email: userEmail } });
  if (existingUser) {
    const err = new Error('Email is already registered');
    err.statusCode = 409;
    err.errorCode = 'EMAIL_ALREADY_EXISTS';
    throw err;
  }

  const existingCompany = await Company.findOne({ where: { email: companyEmail } });
  if (existingCompany) {
    const err = new Error('Company email is already registered');
    err.statusCode = 409;
    err.errorCode = 'COMPANY_EMAIL_EXISTS';
    throw err;
  }

  // 2. Begin Database Transaction
  const transaction = await sequelize.transaction();

  try {
    // Step A: Create Company
    const company = await Company.create(
      {
        name: companyName,
        email: companyEmail,
        phone: companyPhone,
        address: companyAddress,
        logo: data.logo || null,
        status: COMPANY_STATUS.TRIAL
      },
      { transaction }
    );

    // Step B: Hash Password with bcrypt & Create User
    const hashedPassword = await hashPassword(userPassword);
    const user = await User.create(
      {
        company_id: company.id,
        name: userName,
        email: userEmail,
        password: hashedPassword,
        phone: userPhone,
        role: ROLES.OWNER,
        status: USER_STATUS.ACTIVE,
        is_active: true
      },
      { transaction }
    );

    // Step C: Create CompanyMember with role: OWNER
    const member = await CompanyMember.create(
      {
        company_id: company.id,
        user_id: user.id,
        role: ROLES.OWNER,
        status: MEMBER_STATUS.ACTIVE,
        joined_at: new Date()
      },
      { transaction }
    );

    // Step D: Ensure Default Plan & Create 30-Day Trial Subscription
    let plan = await Plan.findOne({ where: { code: DEFAULT_PLANS.MONTHLY.code }, transaction });
    if (!plan) {
      plan = await Plan.create(
        {
          name: DEFAULT_PLANS.MONTHLY.name,
          code: DEFAULT_PLANS.MONTHLY.code,
          price: DEFAULT_PLANS.MONTHLY.price,
          billing_interval: DEFAULT_PLANS.MONTHLY.billing_interval,
          trial_days: DEFAULT_PLANS.MONTHLY.trial_days,
          max_users: DEFAULT_PLANS.MONTHLY.max_users,
          max_active_trips: DEFAULT_PLANS.MONTHLY.max_active_trips,
          max_expenses: DEFAULT_PLANS.MONTHLY.max_expenses,
          is_active: true
        },
        { transaction }
      );
    }

    const now = new Date();
    const trialDays = plan.trial_days || 30;
    const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    const subscription = await Subscription.create(
      {
        company_id: company.id,
        plan_id: plan.id,
        status: SUBSCRIPTION_STATUS.TRIAL,
        trial_started_at: now,
        trial_ends_at: trialEndsAt,
        current_period_start: null,
        current_period_end: null
      },
      { transaction }
    );

    // Step E: Commit all database changes
    await transaction.commit();

    // Step F: Generate minimal JWT (storing minimal user id)
    const tokenPayload = {
      userId: user.id
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return {
      user: user.toJSON(),
      company,
      member,
      subscription,
      token: accessToken,
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken
      }
    };
  } catch (error) {
    // If any step fails, roll back entire database transaction
    await transaction.rollback();
    throw error;
  }
};

/**
 * Login user by email & password with bcrypt verification and minimal JWT generation
 */
export const loginUser = async ({ email, password }) => {
  const normalizedEmail = (email || '').toLowerCase().trim();

  const user = await User.findOne({
    where: { email: normalizedEmail },
    include: [
      { model: Company, as: 'company' },
      { model: CompanyMember, as: 'memberships' }
    ]
  });

  if (!user) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    err.errorCode = 'INVALID_CREDENTIALS';
    throw err;
  }

  if (user.status !== USER_STATUS.ACTIVE && !user.is_active) {
    const err = new Error('Your account has been deactivated. Please contact your company administrator.');
    err.statusCode = 403;
    err.errorCode = 'ACCOUNT_DEACTIVATED';
    throw err;
  }

  const isPasswordMatch = await comparePassword(password, user.password);
  if (!isPasswordMatch) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    err.errorCode = 'INVALID_CREDENTIALS';
    throw err;
  }

  // Enforce company subscription validity for non-SuperAdmin and non-Owner accounts (Anggota)
  if (user.company_id && user.role !== ROLES.SUPER_ADMIN && user.role !== ROLES.OWNER) {
    await expireSubscriptionIfNeeded(user.company_id);
    const statusInfo = await checkSubscriptionStatus(user.company_id);
    if (!statusInfo.is_active) {
      const err = new Error('Langganan perusahaan Anda telah kadaluarsa. Akses anggota dinonaktifkan hingga pemilik (Owner) perusahaan memperpanjang langganan.');
      err.statusCode = 403;
      err.errorCode = 'COMPANY_SUBSCRIPTION_EXPIRED';
      throw err;
    }
  }

  // Generate minimal JWT
  const tokenPayload = {
    userId: user.id
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  return {
    user: user.toJSON(),
    company: user.company,
    role: user.role,
    memberships: user.memberships,
    token: accessToken,
    tokens: {
      access_token: accessToken,
      refresh_token: refreshToken
    }
  };
};

/**
 * Refresh access token using valid refresh token
 */
export const refreshAuthToken = async (refreshToken) => {
  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded || !decoded.userId) {
    const err = new Error('Refresh token is invalid or expired');
    err.statusCode = 401;
    err.errorCode = 'INVALID_REFRESH_TOKEN';
    throw err;
  }

  const user = await User.findByPk(decoded.userId);
  if (!user || (!user.is_active && user.status !== USER_STATUS.ACTIVE)) {
    const err = new Error('User not found or inactive');
    err.statusCode = 401;
    err.errorCode = 'USER_INACTIVE';
    throw err;
  }

  const tokenPayload = {
    userId: user.id
  };

  const newAccessToken = generateAccessToken(tokenPayload);
  const newRefreshToken = generateRefreshToken(tokenPayload);

  return {
    token: newAccessToken,
    tokens: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken
    }
  };
};

/**
 * Change password
 */
export const changeUserPassword = async (userId, { current_password, new_password }) => {
  const user = await User.findByPk(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const isMatch = await comparePassword(current_password, user.password);
  if (!isMatch) {
    const err = new Error('Current password is incorrect');
    err.statusCode = 400;
    err.errorCode = 'INVALID_CURRENT_PASSWORD';
    throw err;
  }

  const hashedPassword = await hashPassword(new_password);
  await user.update({ password: hashedPassword });

  return { message: 'Password changed successfully' };
};

/**
 * Google OAuth Login or Automatic Register for new Owner
 */
export const loginOrRegisterWithGoogle = async ({ id_token, email, name, google_id, photo_url, company_name }) => {
  let googleEmail = email ? email.toLowerCase().trim() : null;
  let googleName = name || 'Google User';
  let googlePhoto = photo_url || null;
  let googleSub = google_id || null;

  // If id_token is provided, decode payload if direct fields not provided
  if (id_token && !googleEmail) {
    try {
      const base64Url = id_token.split('.')[1];
      if (base64Url) {
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          Buffer.from(base64, 'base64')
            .toString('utf-8')
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const decoded = JSON.parse(jsonPayload);
        if (decoded.email) {
          googleEmail = decoded.email.toLowerCase().trim();
          googleName = decoded.name || googleName;
          googlePhoto = decoded.picture || googlePhoto;
          googleSub = decoded.sub || googleSub;
        }
      }
    } catch (_) {
      // Ignore decode error and fall through
    }
  }

  if (!googleEmail) {
    const err = new Error('Could not retrieve a valid email from Google authentication');
    err.statusCode = 400;
    err.errorCode = 'GOOGLE_AUTH_FAILED';
    throw err;
  }

  // 1. Check if user already exists
  let user = await User.findOne({
    where: { email: googleEmail },
    include: [
      { model: Company, as: 'company' },
      { model: CompanyMember, as: 'memberships' }
    ]
  });

  if (user) {
    // User exists -> check active status
    if (user.status !== USER_STATUS.ACTIVE && !user.is_active) {
      const err = new Error('Your account has been deactivated. Please contact your company administrator.');
      err.statusCode = 403;
      err.errorCode = 'ACCOUNT_DEACTIVATED';
      throw err;
    }

    // Enforce company subscription validity for non-SuperAdmin and non-Owner accounts (Anggota)
    if (user.company_id && user.role !== ROLES.SUPER_ADMIN && user.role !== ROLES.OWNER) {
      await expireSubscriptionIfNeeded(user.company_id);
      const statusInfo = await checkSubscriptionStatus(user.company_id);
      if (!statusInfo.is_active) {
        const err = new Error('Langganan perusahaan Anda telah kadaluarsa. Akses anggota dinonaktifkan hingga pemilik (Owner) perusahaan memperpanjang langganan.');
        err.statusCode = 403;
        err.errorCode = 'COMPANY_SUBSCRIPTION_EXPIRED';
        throw err;
      }
    }

    if (!user.google_id && googleSub) {
      await user.update({ google_id: googleSub, avatar_url: user.avatar_url || googlePhoto });
    }

    const tokenPayload = { userId: user.id };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return {
      user: user.toJSON(),
      company: user.company,
      role: user.role,
      memberships: user.memberships,
      is_new_user: false,
      token: accessToken,
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken
      }
    };
  }

  // 2. User does not exist -> Register as new Owner with Company and 30-Day Free Trial
  const transaction = await sequelize.transaction();

  try {
    const finalCompanyName = company_name || `PT ${googleName}`;

    // Create Company
    const company = await Company.create(
      {
        name: finalCompanyName,
        email: googleEmail,
        status: COMPANY_STATUS.TRIAL
      },
      { transaction }
    );

    // Create User (Role OWNER, auth_provider GOOGLE)
    user = await User.create(
      {
        company_id: company.id,
        name: googleName,
        email: googleEmail,
        password: null,
        google_id: googleSub,
        auth_provider: 'GOOGLE',
        role: ROLES.OWNER,
        status: USER_STATUS.ACTIVE,
        avatar_url: googlePhoto,
        is_active: true
      },
      { transaction }
    );

    // Create Company Member (OWNER)
    const member = await CompanyMember.create(
      {
        company_id: company.id,
        user_id: user.id,
        role: ROLES.OWNER,
        status: MEMBER_STATUS.ACTIVE,
        joined_at: new Date()
      },
      { transaction }
    );

    // Seed/find monthly plan
    let plan = await Plan.findOne({ where: { is_active: true } });
    if (!plan) {
      plan = await Plan.create(
        {
          name: 'Monthly Standard',
          code: 'MONTHLY',
          price: 50000.0,
          billing_period: 'MONTHLY',
          trial_days: 30,
          is_active: true
        },
        { transaction }
      );
    }

    const now = new Date();
    const trialDays = plan.trial_days || 30;
    const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    const subscription = await Subscription.create(
      {
        company_id: company.id,
        plan_id: plan.id,
        status: SUBSCRIPTION_STATUS.TRIAL,
        trial_started_at: now,
        trial_ends_at: trialEndsAt,
        current_period_start: null,
        current_period_end: null
      },
      { transaction }
    );

    await transaction.commit();

    const tokenPayload = { userId: user.id };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return {
      user: user.toJSON(),
      company,
      member,
      subscription,
      role: ROLES.OWNER,
      is_new_user: true,
      token: accessToken,
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken
      }
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
