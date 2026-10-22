import * as walletService from '../services/wallet.service.js';
import { successResponse } from '../utils/response.util.js';
import { ROLES } from '../config/constants.js';

export const getLedger = async (req, res, next) => {
  try {
    let result;
    if (req.user.role === ROLES.OFFICER) {
      result = await walletService.getOfficerLedger(req.user.company_id, req.user.id, req.query);
    } else {
      result = await walletService.getCompanyLedger(req.user.company_id, req.query);
    }
    return successResponse(res, {
      message: 'Wallet transaction ledger retrieved',
      data: result.transactions,
      meta: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

export const getOfficerLedger = async (req, res, next) => {
  try {
    const officerId = req.params.officerId || req.user.id;
    const result = await walletService.getOfficerLedger(req.user.company_id, officerId, req.query);
    return successResponse(res, {
      message: 'Officer ledger retrieved',
      data: result.transactions,
      meta: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

export const getTripBalance = async (req, res, next) => {
  try {
    const summary = await walletService.getTripBalance(req.user.company_id, req.params.tripId);
    return successResponse(res, {
      message: 'Trip balance retrieved',
      data: summary
    });
  } catch (error) {
    next(error);
  }
};
