import * as companyService from '../services/company.service.js';
import { successResponse } from '../utils/response.util.js';

export const getCompany = async (req, res, next) => {
  try {
    const result = await companyService.getCompanyProfile(req.user.company_id);
    return successResponse(res, {
      message: 'Company profile retrieved',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const updateCompany = async (req, res, next) => {
  try {
    const result = await companyService.updateCompanyProfile(req.user.company_id, req.body);
    return successResponse(res, {
      message: 'Company profile updated successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getMembers = async (req, res, next) => {
  try {
    const result = await companyService.getCompanyMembers(req.user.company_id);
    return successResponse(res, {
      message: 'Company members retrieved',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const addMember = async (req, res, next) => {
  try {
    const result = await companyService.addCompanyMember(req.user.company_id, req.body);
    return successResponse(res, {
      statusCode: 201,
      message: 'Member added successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const updateMember = async (req, res, next) => {
  try {
    const memberId = req.params.id;
    const requesterRole = req.currentRole || req.user.role;
    const result = await companyService.updateCompanyMember(req.user.company_id, memberId, req.body, requesterRole);
    return successResponse(res, {
      message: 'Member updated successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMember = async (req, res, next) => {
  try {
    const memberId = req.params.id;
    const requesterRole = req.currentRole || req.user.role;
    const result = await companyService.deleteCompanyMember(req.user.company_id, memberId, requesterRole);
    return successResponse(res, {
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

// Backwards compatibility aliases
export const getProfile = getCompany;
export const updateProfile = updateCompany;
