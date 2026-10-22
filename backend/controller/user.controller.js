import * as userService from '../services/user.service.js';
import { successResponse } from '../utils/response.util.js';

export const getUsers = async (req, res, next) => {
  try {
    const result = await userService.getCompanyUsers(req.user.company_id, req.query);
    return successResponse(res, {
      message: 'Company users retrieved',
      data: result.users,
      meta: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.user.company_id, req.params.id);
    return successResponse(res, {
      message: 'User retrieved',
      data: user.toJSON()
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const newUser = await userService.createCompanyUser(req.user.company_id, req.body);
    return successResponse(res, {
      statusCode: 201,
      message: 'User created successfully',
      data: newUser
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const updatedUser = await userService.updateCompanyUser(req.user.company_id, req.params.id, req.body);
    return successResponse(res, {
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

export const toggleStatus = async (req, res, next) => {
  try {
    const updatedUser = await userService.toggleUserStatus(req.user.company_id, req.params.id);
    return successResponse(res, {
      message: `User status changed to ${updatedUser.is_active ? 'Active' : 'Inactive'}`,
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};
