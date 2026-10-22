import { verifyAccessToken } from '../utils/jwt.util.js';
import { errorResponse } from '../utils/response.util.js';
import { User, Company, CompanyMember } from '../model/index.js';
import { USER_STATUS, ROLES } from '../config/constants.js';
import { checkSubscriptionStatus, expireSubscriptionIfNeeded } from '../services/subscription.service.js';

export const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Authentication token is missing or invalid format',
        errorCode: 'UNAUTHORIZED'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const userId = decoded?.userId || decoded?.id;
    if (!decoded || !userId) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Token has expired or is invalid',
        errorCode: 'TOKEN_INVALID'
      });
    }

    // Find User in database with associated Company and Membership
    const user = await User.findByPk(userId, {
      include: [
        { model: Company, as: 'company' },
        { model: CompanyMember, as: 'memberships' }
      ]
    });

    if (!user) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'User belonging to this token no longer exists',
        errorCode: 'USER_NOT_FOUND'
      });
    }

    if (user.status !== USER_STATUS.ACTIVE && !user.is_active) {
      return errorResponse(res, {
        statusCode: 403,
        message: 'Your account has been deactivated. Please contact your company administrator.',
        errorCode: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Resolve active company and role
    const activeMember = (user.memberships && user.memberships.length > 0)
      ? user.memberships[0]
      : null;

    const role = activeMember?.role || user.role;
    const company = user.company;

    // Check company subscription for non-Owner and non-SuperAdmin members (Anggota)
    if (user.company_id && role !== ROLES.SUPER_ADMIN && role !== ROLES.OWNER && user.role !== ROLES.SUPER_ADMIN && user.role !== ROLES.OWNER) {
      await expireSubscriptionIfNeeded(user.company_id);
      const statusInfo = await checkSubscriptionStatus(user.company_id);
      if (!statusInfo.is_active) {
        return errorResponse(res, {
          statusCode: 403,
          message: 'Langganan perusahaan Anda telah kadaluarsa. Akses anggota dinonaktifkan hingga pemilik (Owner) perusahaan memperpanjang langganan.',
          errorCode: 'COMPANY_SUBSCRIPTION_EXPIRED'
        });
      }
    }

    // Attach Authenticated User & Context to Request
    req.currentUser = user;
    req.user = user;
    req.currentRole = role;
    req.currentCompany = company;
    req.company = company;
    req.member = activeMember;

    next();
  } catch (error) {
    return errorResponse(res, {
      statusCode: 500,
      message: 'Authentication error: ' + error.message,
      errorCode: 'AUTH_INTERNAL_ERROR'
    });
  }
};
