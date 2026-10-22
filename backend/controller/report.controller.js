import * as reportService from '../services/report.service.js';
import { successResponse } from '../utils/response.util.js';

export const getDashboardSummary = async (req, res, next) => {
  try {
    const data = await reportService.getCompanyDashboardReport(req.user.company_id);
    return successResponse(res, {
      message: 'Dashboard summary retrieved',
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getExpenseAnalytics = async (req, res, next) => {
  try {
    const data = await reportService.getExpenseAnalyticsReport(req.user.company_id, req.query);
    return successResponse(res, {
      message: 'Expense analytics retrieved',
      data
    });
  } catch (error) {
    next(error);
  }
};
