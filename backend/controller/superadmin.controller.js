import * as superadminService from '../services/superadmin.service.js';
import * as paymentService from '../services/payment.service.js';
import { successResponse, errorResponse } from '../utils/response.util.js';

/**
 * SuperAdmin Controller - Request handlers for platform management
 */

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Email and password are required',
        errorCode: 'VALIDATION_ERROR'
      });
    }

    const result = await superadminService.loginSuperAdmin(email, password);
    return successResponse(res, {
      message: 'SuperAdmin login successful',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getAnalyticsSummary = async (req, res, next) => {
  try {
    const result = await superadminService.getAnalyticsSummary();
    return successResponse(res, {
      message: 'Platform analytics summary retrieved successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getAllCompanies = async (req, res, next) => {
  try {
    const result = await superadminService.getAllCompanies(req.query);
    return successResponse(res, {
      message: 'Companies retrieved successfully',
      data: result.companies,
      meta: result.meta
    });
  } catch (error) {
    next(error);
  }
};

export const getCompanyDetails = async (req, res, next) => {
  try {
    const result = await superadminService.getCompanyDetails(req.params.id);
    return successResponse(res, {
      message: 'Company details retrieved successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const updateCompanyTrial = async (req, res, next) => {
  try {
    const result = await superadminService.updateCompanyTrial(req.params.id, req.body);
    return successResponse(res, {
      message: 'Company trial settings updated successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const updateCompanyStatus = async (req, res, next) => {
  try {
    const result = await superadminService.updateCompanyStatus(req.params.id, req.body);
    return successResponse(res, {
      message: 'Company status updated successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getAllSubscriptions = async (req, res, next) => {
  try {
    const result = await superadminService.getAllSubscriptions(req.query);
    return successResponse(res, {
      message: 'Subscriptions retrieved successfully',
      data: result.subscriptions,
      meta: result.meta
    });
  } catch (error) {
    next(error);
  }
};

export const getAllPayments = async (req, res, next) => {
  try {
    const result = await superadminService.getAllPayments(req.query);
    return successResponse(res, {
      message: 'Payment transactions retrieved successfully',
      data: {
        payments: result.payments,
        summary: result.summary
      },
      meta: result.meta
    });
  } catch (error) {
    next(error);
  }
};

export const syncPaymentStatus = async (req, res, next) => {
  try {
    const { invoiceNumber } = req.params;
    const result = await paymentService.syncPaymentStatus(invoiceNumber);
    return successResponse(res, {
      message: result.message || 'Payment status synchronized with payment gateway',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ============================================================================
 * SAAS PLAN & PRICING MANAGEMENT (HARGA PER BULAN)
 * ============================================================================
 */

export const getAllPlans = async (req, res, next) => {
  try {
    const result = await superadminService.getAllPlans();
    return successResponse(res, {
      message: 'SaaS Plans retrieved successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getPlanById = async (req, res, next) => {
  try {
    const result = await superadminService.getPlanById(req.params.id);
    return successResponse(res, {
      message: 'Plan details retrieved successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const createPlan = async (req, res, next) => {
  try {
    const result = await superadminService.createPlan(req.body);
    return successResponse(res, {
      statusCode: 201,
      message: 'SaaS Plan created successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const updatePlan = async (req, res, next) => {
  try {
    const result = await superadminService.updatePlan(req.params.id, req.body);
    return successResponse(res, {
      message: 'SaaS Plan updated successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const updatePlanPrice = async (req, res, next) => {
  try {
    const { price } = req.body;
    if (price === undefined) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Price is required',
        errorCode: 'VALIDATION_ERROR'
      });
    }
    const result = await superadminService.updatePlanPrice(req.params.id, price);
    return successResponse(res, {
      message: `Plan price updated to Rp ${result.price}`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const updateCompanySubscription = async (req, res, next) => {
  try {
    const result = await superadminService.updateCompanySubscription(req.params.id, req.body);
    return successResponse(res, {
      message: 'Company subscription updated successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ============================================================================
 * PASSWORD MANAGEMENT & USER ADMINISTRATION
 * ============================================================================
 */

export const getAllUsers = async (req, res, next) => {
  try {
    const result = await superadminService.getAllUsers(req.query);
    return successResponse(res, {
      message: 'Platform users retrieved successfully',
      data: result.users,
      meta: result.meta
    });
  } catch (error) {
    next(error);
  }
};

export const resetUserPassword = async (req, res, next) => {
  try {
    const { new_password } = req.body;
    if (!new_password) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'new_password is required',
        errorCode: 'VALIDATION_ERROR'
      });
    }

    const result = await superadminService.resetUserPassword(req.params.id, new_password);
    return successResponse(res, {
      message: result.message,
      data: result.user
    });
  } catch (error) {
    next(error);
  }
};

export const resetCompanyOwnerPassword = async (req, res, next) => {
  try {
    const { new_password } = req.body;
    if (!new_password) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'new_password is required',
        errorCode: 'VALIDATION_ERROR'
      });
    }

    const result = await superadminService.resetCompanyOwnerPassword(req.params.id, new_password);
    return successResponse(res, {
      message: result.message,
      data: result.user
    });
  } catch (error) {
    next(error);
  }
};

export const changeSuperAdminPassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const superAdminId = req.user.id || req.user.userId;

    const result = await superadminService.changeSuperAdminPassword(superAdminId, current_password, new_password);
    return successResponse(res, {
      message: result.message,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

