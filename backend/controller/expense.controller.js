import * as expenseService from '../services/expense.service.js';
import * as receiptService from '../services/receipt.service.js';
import { parseReceiptImage } from '../services/ocr.service.js';
import { successResponse } from '../utils/response.util.js';

export const createExpense = async (req, res, next) => {
  try {
    const expense = await expenseService.createExpense(
      req.user.company_id,
      req.user,
      req.body,
      req.file
    );
    return successResponse(res, {
      statusCode: 201,
      message: 'Expense created successfully',
      data: expense
    });
  } catch (error) {
    next(error);
  }
};

export const submitExpense = async (req, res, next) => {
  try {
    const expense = await expenseService.submitExpense(
      req.user.company_id,
      req.params.id,
      req.user
    );
    return successResponse(res, {
      message: 'Expense submitted for approval',
      data: expense
    });
  } catch (error) {
    next(error);
  }
};

export const scanReceiptOnly = async (req, res, next) => {
  try {
    if (!req.file) {
      const err = new Error('Receipt image file is required for OCR scanning');
      err.statusCode = 400;
      throw err;
    }

    const autoCreateDraft = req.body.auto_create_draft !== 'false' && req.body.auto_create_draft !== false;
    const result = await receiptService.processReceiptScan({
      companyId: req.user.company_id,
      tripId: req.body.trip_id || null,
      user: req.user,
      file: req.file,
      autoCreateDraft
    });

    return successResponse(res, {
      message: 'Receipt parsed and draft created successfully',
      data: {
        receipt_url: result.receipt.file_url,
        receipt: result.receipt,
        ocr: result.ocr,
        draft_expense: result.draft_expense,
        parsed_data: result.parsed_data
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getReceiptDetails = async (req, res, next) => {
  try {
    const receipt = await receiptService.getReceiptById(req.user.company_id, req.params.receipt_id);
    return successResponse(res, {
      message: 'Receipt details retrieved',
      data: receipt
    });
  } catch (error) {
    next(error);
  }
};

export const getReceiptOcr = async (req, res, next) => {
  try {
    const ocr = await receiptService.getReceiptOcr(req.user.company_id, req.params.receipt_id);
    return successResponse(res, {
      message: 'Receipt OCR analysis retrieved',
      data: ocr
    });
  } catch (error) {
    next(error);
  }
};

export const getExpenses = async (req, res, next) => {
  try {
    const result = await expenseService.getExpenses(req.user.company_id, req.user, req.query);
    return successResponse(res, {
      message: 'Expenses retrieved successfully',
      data: result.expenses,
      meta: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

export const getPendingExpenses = async (req, res, next) => {
  try {
    const result = await expenseService.getPendingExpenses(req.user.company_id, req.user, req.query);
    return successResponse(res, {
      message: 'Pending expenses retrieved successfully',
      data: result.expenses,
      meta: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

export const getExpenseCategories = async (req, res, next) => {
  try {
    const categories = await expenseService.getExpenseCategories(req.user.company_id);
    return successResponse(res, {
      message: 'Expense categories retrieved successfully',
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

export const getExpenseById = async (req, res, next) => {
  try {
    const expense = await expenseService.getExpenseById(
      req.user.company_id,
      req.params.id,
      req.user
    );
    return successResponse(res, {
      message: 'Expense details retrieved',
      data: expense
    });
  } catch (error) {
    next(error);
  }
};

export const approveExpense = async (req, res, next) => {
  try {
    const updatedExpense = await expenseService.approveExpense(
      req.user.company_id,
      req.params.id,
      req.user
    );
    return successResponse(res, {
      message: 'Expense approved and wallet balance deducted successfully',
      data: updatedExpense
    });
  } catch (error) {
    next(error);
  }
};

export const rejectExpense = async (req, res, next) => {
  try {
    const updatedExpense = await expenseService.rejectExpense(
      req.user.company_id,
      req.params.id,
      req.user,
      req.body
    );
    return successResponse(res, {
      message: 'Expense rejected successfully',
      data: updatedExpense
    });
  } catch (error) {
    next(error);
  }
};

export const approveOrReject = async (req, res, next) => {
  try {
    const updatedExpense = await expenseService.approveOrRejectExpense(
      req.user.company_id,
      req.params.id,
      req.user.id,
      req.body
    );
    return successResponse(res, {
      message: `Expense ${req.body.action.toLowerCase()}ed successfully`,
      data: updatedExpense
    });
  } catch (error) {
    next(error);
  }
};

export const updateExpense = async (req, res, next) => {
  try {
    const updatedExpense = await expenseService.updateExpense(
      req.user.company_id,
      req.params.id,
      req.user,
      req.body
    );
    return successResponse(res, {
      message: 'Expense updated successfully',
      data: updatedExpense
    });
  } catch (error) {
    next(error);
  }
};

export const deleteExpense = async (req, res, next) => {
  try {
    await expenseService.deleteExpense(
      req.user.company_id,
      req.params.id,
      req.user
    );
    return successResponse(res, {
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
