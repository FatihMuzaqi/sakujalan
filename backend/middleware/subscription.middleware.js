import { COMPANY_STATUS, SUBSCRIPTION_STATUS } from '../config/constants.js';
import { errorResponse } from '../utils/response.util.js';
import { checkSubscriptionStatus, expireSubscriptionIfNeeded } from '../services/subscription.service.js';

/**
 * Middleware ensuring company has valid subscription access or enforces Read-Only mode
 */
export const requireSubscriptionAccess = async (req, res, next) => {
  try {
    const companyId = req.currentUser?.company_id || req.user?.company_id;

    if (!companyId) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Tenant context is missing',
        errorCode: 'TENANT_REQUIRED'
      });
    }

    // Check expiration and evaluate status
    await expireSubscriptionIfNeeded(companyId);
    const statusInfo = await checkSubscriptionStatus(companyId);

    // 1. TRIAL or ACTIVE: FULL OPERATIONAL ACCESS
    if (statusInfo.status === SUBSCRIPTION_STATUS.TRIAL || statusInfo.status === SUBSCRIPTION_STATUS.ACTIVE) {
      if (statusInfo.is_active) {
        return next();
      }
    }

    // 2. READ-ONLY ACCESS MATRIX (For PAST_DUE, EXPIRED, CANCELLED):
    // Safe HTTP methods (GET, HEAD, OPTIONS) are always permitted
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      res.setHeader('X-Subscription-Status', statusInfo.status);
      res.setHeader('X-Subscription-Warning', `Company subscription is ${statusInfo.status}. Read-only mode is active.`);
      return next();
    }

    // 3. Mutation routes explicitly allowed for billing / payment checkout
    if (req.originalUrl && (req.originalUrl.includes('/subscriptions/checkout') || req.originalUrl.includes('/webhooks'))) {
      return next();
    }

    // 4. Block mutating operational requests
    const errorMessages = {
      [SUBSCRIPTION_STATUS.PAST_DUE]: 'Your subscription is past due. Operational mutations are restricted until payment is settled.',
      [SUBSCRIPTION_STATUS.EXPIRED]: 'Your subscription or free trial has expired. Your account is in Read-Only mode. Please subscribe to create or modify trips and expenses.',
      [SUBSCRIPTION_STATUS.CANCELLED]: 'Your subscription has been cancelled. Your account is in Read-Only mode.'
    };

    return errorResponse(res, {
      statusCode: 403,
      message: errorMessages[statusInfo.status] || 'Active subscription required for this action',
      errorCode: `SUBSCRIPTION_${statusInfo.status}`
    });
  } catch (error) {
    return errorResponse(res, {
      statusCode: 500,
      message: 'Subscription access check error: ' + error.message,
      errorCode: 'SUBSCRIPTION_CHECK_ERROR'
    });
  }
};

/**
 * Strict active subscription guard (No write access unless TRIAL or ACTIVE)
 */
export const requireActiveSubscription = requireSubscriptionAccess;

/**
 * Helper middleware specifically allowing read-only access on expired accounts
 */
export const allowReadOnlySubscription = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  return requireSubscriptionAccess(req, res, next);
};
