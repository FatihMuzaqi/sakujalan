import { errorResponse } from '../utils/response.util.js';
import { ROLES } from '../config/constants.js';

/**
 * Middleware to restrict endpoint access strictly to Platform SUPER_ADMIN users
 */
export const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, {
      statusCode: 401,
      message: 'Authentication required. Please provide a valid SuperAdmin token.',
      errorCode: 'UNAUTHORIZED'
    });
  }

  const userRole = req.currentRole || req.user.role;

  if (userRole !== ROLES.SUPER_ADMIN) {
    return errorResponse(res, {
      statusCode: 403,
      message: 'Access denied. This action requires SuperAdmin privileges.',
      errorCode: 'SUPERADMIN_FORBIDDEN'
    });
  }

  next();
};
