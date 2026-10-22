import * as authService from '../services/auth.service.js';
import { successResponse } from '../utils/response.util.js';

export const register = async (req, res, next) => {
  try {
    const result = await authService.registerCompanyWithTrial(req.body);
    return successResponse(res, {
      statusCode: 201,
      message: 'Company and User registered successfully with 30-day Free Trial',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const result = await authService.loginUser(req.body);
    return successResponse(res, {
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    return successResponse(res, {
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    return successResponse(res, {
      message: 'Current profile retrieved',
      data: {
        user: req.user.toJSON(),
        company: req.company,
        role: req.currentRole,
        member: req.member || null
      }
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const result = await authService.refreshAuthToken(req.body.refresh_token);
    return successResponse(res, {
      message: 'Token refreshed successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const result = await authService.changeUserPassword(req.user.id, req.body);
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const googleAuth = async (req, res, next) => {
  try {
    const result = await authService.loginOrRegisterWithGoogle(req.body);
    const message = result.is_new_user
      ? 'Registered and logged in with Google successfully with 30-day Free Trial'
      : 'Logged in with Google successfully';
    return successResponse(res, {
      statusCode: result.is_new_user ? 201 : 200,
      message,
      data: result
    });
  } catch (error) {
    next(error);
  }
};
