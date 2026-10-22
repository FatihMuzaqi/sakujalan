import { errorResponse } from '../utils/response.util.js';
import { ROLES } from '../config/constants.js';

/**
 * Middleware to authorize user roles
 * @param  {...string|string[]} roles - Allowed roles (e.g. ROLES.OWNER, ROLES.ADMIN)
 */
export const requireRole = (...roles) => {
  // Flatten in case an array was passed: requireRole(['OWNER', 'ADMIN']) vs requireRole('OWNER', 'ADMIN')
  const allowedRoles = roles.flat();

  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Authentication required before checking role permissions',
        errorCode: 'UNAUTHORIZED'
      });
    }

    const userRole = req.currentRole || req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return errorResponse(res, {
        statusCode: 403,
        message: `Forbidden. Your role (${userRole}) does not have permission to perform this action. Required: [${allowedRoles.join(', ')}]`,
        errorCode: 'ROLE_FORBIDDEN'
      });
    }

    next();
  };
};

// Aliases and Convenience Role Guards
export const authorizeRoles = requireRole;

export const requireOwner = requireRole(ROLES.OWNER);

export const requireAdmin = requireRole(ROLES.OWNER, ROLES.ADMIN);

export const requireManager = requireRole(ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER);

export const requireOfficer = requireRole(ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER, ROLES.OFFICER);
