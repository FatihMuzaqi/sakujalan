import { errorResponse } from '../utils/response.util.js';
import { Company } from '../model/Company.js';

/**
 * Tenant Middleware enforcing tenant boundary and context
 */
export const enforceTenant = async (req, res, next) => {
  try {
    const user = req.currentUser || req.user;

    if (!user || !user.company_id) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Authentication and tenant context required',
        errorCode: 'TENANT_UNAUTHENTICATED'
      });
    }

    // Verify company existence and active membership
    let company = req.currentCompany || req.company;
    if (!company) {
      company = await Company.findByPk(user.company_id);
      if (!company) {
        return errorResponse(res, {
          statusCode: 403,
          message: 'Company associated with your account was not found or is inaccessible',
          errorCode: 'COMPANY_NOT_FOUND'
        });
      }
      req.currentCompany = company;
      req.company = company;
    }

    // Security: Disallow user from arbitrarily spoofing company_id in request body or query params
    if (req.body && req.body.company_id && req.body.company_id !== user.company_id) {
      return errorResponse(res, {
        statusCode: 403,
        message: 'Forbidden: Arbitrary tenant selection is strictly prohibited',
        errorCode: 'TENANT_INJECTION_BLOCKED'
      });
    }

    if (req.query && req.query.company_id && req.query.company_id !== user.company_id) {
      return errorResponse(res, {
        statusCode: 403,
        message: 'Forbidden: Cross-tenant query parameter is prohibited',
        errorCode: 'CROSS_TENANT_FORBIDDEN'
      });
    }

    // Freeze Tenant Scope object
    req.tenantScope = Object.freeze({
      company_id: user.company_id
    });

    next();
  } catch (error) {
    return errorResponse(res, {
      statusCode: 500,
      message: 'Tenant context error: ' + error.message,
      errorCode: 'TENANT_INTERNAL_ERROR'
    });
  }
};
