import {
  sequelize,
  Expense,
  ExpenseCategory,
  ExpenseApproval,
  Trip,
  User,
  WalletTransaction,
  ExpenseReceipt,
  ExpenseOCR
} from '../model/index.js';
import {
  ROLES,
  EXPENSE_STATUS,
  INPUT_METHOD,
  EXPENSE_APPROVAL_ACTION,
  EXPENSE_CATEGORIES
} from '../config/constants.js';
import { parseReceiptImage } from './ocr.service.js';
import * as walletService from './wallet.service.js';
import { broadcastExpenseStatus } from './socket.service.js';
import { Op } from 'sequelize';

/**
 * Seed default categories for a company if not existing
 */
export const seedDefaultCategories = async (companyId, { transaction } = {}) => {
  const existing = await ExpenseCategory.count({
    where: {
      [Op.or]: [{ company_id: companyId }, { is_default: true }]
    },
    transaction
  });

  if (existing === 0) {
    const defaultCats = EXPENSE_CATEGORIES.map(code => ({
      company_id: companyId,
      name: code.charAt(0) + code.slice(1).toLowerCase(),
      code: code,
      is_default: true,
      is_active: true
    }));
    await ExpenseCategory.bulkCreate(defaultCats, { transaction });
  }
};

/**
 * Get active expense categories for a company
 */
export const getExpenseCategories = async (companyId) => {
  let categories = await ExpenseCategory.findAll({
    where: {
      is_active: true,
      [Op.or]: [{ company_id: companyId }, { company_id: null }, { is_default: true }]
    },
    order: [['name', 'ASC']]
  });

  if (categories.length === 0) {
    await seedDefaultCategories(companyId);
    categories = await ExpenseCategory.findAll({
      where: {
        is_active: true,
        [Op.or]: [{ company_id: companyId }, { is_default: true }]
      },
      order: [['name', 'ASC']]
    });
  }

  return categories;
};

/**
 * Create a new expense (MANUAL or RECEIPT_SCAN)
 */
export const createExpense = async (companyId, currentUser, expenseData, file = null) => {
  const transaction = await sequelize.transaction();
  try {
    // 1. Verify trip exists in tenant
    const trip = await Trip.findOne({
      where: { id: expenseData.trip_id, company_id: companyId },
      transaction
    });

    if (!trip) {
      const err = new Error('Trip not found in this company');
      err.statusCode = 404;
      err.errorCode = 'TRIP_NOT_FOUND';
      throw err;
    }

    // 2. If currentUser is OFFICER, verify they are assigned to this trip
    if (currentUser.role === ROLES.OFFICER && trip.officer_id !== currentUser.id) {
      const err = new Error('You can only submit expenses for trips assigned to you');
      err.statusCode = 403;
      err.errorCode = 'UNAUTHORIZED_TRIP_EXPENSE';
      throw err;
    }

    let receiptUrl = expenseData.receipt_url || null;
    let ocrRawData = expenseData.ocr_raw_data || null;
    let ocrConfidence = expenseData.ocr_confidence ? parseFloat(expenseData.ocr_confidence) : null;
    let inputMethod = expenseData.input_method || (file || receiptUrl ? INPUT_METHOD.RECEIPT_SCAN : INPUT_METHOD.MANUAL);

    // 3. Process receipt file if uploaded
    if (file) {
      receiptUrl = `/uploads/receipts/${file.filename}`;
      inputMethod = INPUT_METHOD.RECEIPT_SCAN;
      if (!ocrRawData) {
        try {
          const ocrResult = await parseReceiptImage(file.path);
          ocrRawData = ocrResult;
          ocrConfidence = ocrResult.confidence;
        } catch (e) {
          // Fallback if OCR service fails
          ocrRawData = { error: e.message };
        }
      }
    }

    // Determine initial status: DRAFT or PENDING
    const initialStatus = expenseData.status === EXPENSE_STATUS.DRAFT ? EXPENSE_STATUS.DRAFT : EXPENSE_STATUS.PENDING;

    const expense = await Expense.create(
      {
        company_id: companyId,
        trip_id: trip.id,
        officer_id: currentUser.id,
        category_id: expenseData.category_id || null,
        category: expenseData.category || 'OTHER',
        amount: parseFloat(expenseData.amount),
        date: expenseData.date ? new Date(expenseData.date) : new Date(),
        description: expenseData.description || null,
        receipt_url: receiptUrl,
        input_method: inputMethod,
        ocr_raw_data: ocrRawData,
        ocr_confidence: ocrConfidence,
        latitude: expenseData.latitude ? parseFloat(expenseData.latitude) : null,
        longitude: expenseData.longitude ? parseFloat(expenseData.longitude) : null,
        status: initialStatus
      },
      { transaction }
    );

    await transaction.commit();

    broadcastExpenseStatus(companyId, expense);
    return await getExpenseById(companyId, expense.id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Submit a DRAFT expense into PENDING status
 */
export const submitExpense = async (companyId, expenseId, currentUser) => {
  const expense = await Expense.findOne({
    where: { id: expenseId, company_id: companyId }
  });

  if (!expense) {
    const err = new Error('Expense not found');
    err.statusCode = 404;
    throw err;
  }

  if (currentUser.role === ROLES.OFFICER && expense.officer_id !== currentUser.id) {
    const err = new Error('You can only submit your own expenses');
    err.statusCode = 403;
    throw err;
  }

  if (expense.status === EXPENSE_STATUS.PENDING) {
    return await getExpenseById(companyId, expenseId);
  }

  if (expense.status === EXPENSE_STATUS.APPROVED || expense.status === EXPENSE_STATUS.REJECTED) {
    const err = new Error(`Cannot submit expense that is already ${expense.status}`);
    err.statusCode = 400;
    throw err;
  }

  await expense.update({ status: EXPENSE_STATUS.PENDING });
  broadcastExpenseStatus(companyId, expense);
  return await getExpenseById(companyId, expenseId);
};

/**
 * Approve an expense and deduct wallet balance via wallet.service.js
 */
export const approveExpense = async (companyId, expenseId, approverUser) => {
  // 1. RBAC Guard: Officer cannot approve expenses
  if (approverUser.role === ROLES.OFFICER) {
    const err = new Error('Officers are not permitted to approve expenses');
    err.statusCode = 403;
    err.errorCode = 'FORBIDDEN_APPROVAL';
    throw err;
  }

  const transaction = await sequelize.transaction();
  try {
    const expense = await Expense.findOne({
      where: { id: expenseId, company_id: companyId },
      include: [{ model: Trip, as: 'trip' }],
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!expense) {
      const err = new Error('Expense record not found in this company');
      err.statusCode = 404;
      throw err;
    }

    // Idempotency check
    if (expense.status === EXPENSE_STATUS.APPROVED) {
      const err = new Error('Expense is already APPROVED and cannot be re-approved');
      err.statusCode = 400;
      err.errorCode = 'EXPENSE_ALREADY_APPROVED';
      throw err;
    }

    if (expense.status === EXPENSE_STATUS.REJECTED) {
      const err = new Error('Expense is REJECTED and cannot be approved directly');
      err.statusCode = 400;
      err.errorCode = 'EXPENSE_ALREADY_REJECTED';
      throw err;
    }

    if (expense.status !== EXPENSE_STATUS.PENDING && expense.status !== 'SUBMITTED') {
      const err = new Error(`Expense in ${expense.status} status cannot be approved`);
      err.statusCode = 400;
      err.errorCode = 'INVALID_STATUS_FOR_APPROVAL';
      throw err;
    }

    const expenseAmount = parseFloat(expense.amount);

    // 2. Critical Rule: Mutate wallet exclusively through wallet.service.js
    await walletService.deductApprovedExpense(
      companyId,
      expense.trip_id,
      expense.officer_id,
      expense.id,
      expenseAmount,
      `Approved expense for ${expense.category}: ${expense.description || expense.trip?.title || ''}`,
      { transaction }
    );

    // 3. Create ExpenseApproval audit record
    await ExpenseApproval.create(
      {
        company_id: companyId,
        expense_id: expense.id,
        approver_id: approverUser.id,
        action: EXPENSE_APPROVAL_ACTION.APPROVED,
        rejection_reason: null
      },
      { transaction }
    );

    // 4. Update Expense record status
    await expense.update(
      {
        status: EXPENSE_STATUS.APPROVED,
        approved_by: approverUser.id,
        approved_at: new Date(),
        rejection_reason: null
      },
      { transaction }
    );

    await transaction.commit();

    broadcastExpenseStatus(companyId, expense);
    return await getExpenseById(companyId, expenseId);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Reject an expense with a mandatory reason (NO wallet deduction)
 */
export const rejectExpense = async (companyId, expenseId, approverUser, { rejection_reason }) => {
  // 1. RBAC Guard: Officer cannot reject expenses
  if (approverUser.role === ROLES.OFFICER) {
    const err = new Error('Officers are not permitted to reject expenses');
    err.statusCode = 403;
    err.errorCode = 'FORBIDDEN_APPROVAL';
    throw err;
  }

  if (!rejection_reason || rejection_reason.trim() === '') {
    const err = new Error('Rejection reason is required');
    err.statusCode = 400;
    err.errorCode = 'REJECTION_REASON_REQUIRED';
    throw err;
  }

  const transaction = await sequelize.transaction();
  try {
    const expense = await Expense.findOne({
      where: { id: expenseId, company_id: companyId },
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!expense) {
      const err = new Error('Expense record not found in this company');
      err.statusCode = 404;
      throw err;
    }

    // Idempotency check
    if (expense.status === EXPENSE_STATUS.APPROVED) {
      const err = new Error('Expense is already APPROVED and cannot be rejected');
      err.statusCode = 400;
      err.errorCode = 'EXPENSE_ALREADY_APPROVED';
      throw err;
    }

    if (expense.status === EXPENSE_STATUS.REJECTED) {
      const err = new Error('Expense is already REJECTED');
      err.statusCode = 400;
      err.errorCode = 'EXPENSE_ALREADY_REJECTED';
      throw err;
    }

    if (expense.status !== EXPENSE_STATUS.PENDING && expense.status !== 'SUBMITTED') {
      const err = new Error(`Expense in ${expense.status} status cannot be rejected`);
      err.statusCode = 400;
      err.errorCode = 'INVALID_STATUS_FOR_APPROVAL';
      throw err;
    }

    // 2. Create ExpenseApproval audit record
    await ExpenseApproval.create(
      {
        company_id: companyId,
        expense_id: expense.id,
        approver_id: approverUser.id,
        action: EXPENSE_APPROVAL_ACTION.REJECTED,
        rejection_reason: rejection_reason.trim()
      },
      { transaction }
    );

    // 3. Update Expense record (NO wallet deduction)
    await expense.update(
      {
        status: EXPENSE_STATUS.REJECTED,
        approved_by: approverUser.id,
        approved_at: new Date(),
        rejection_reason: rejection_reason.trim()
      },
      { transaction }
    );

    await transaction.commit();

    broadcastExpenseStatus(companyId, expense);
    return await getExpenseById(companyId, expenseId);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Backward compatibility alias for approveOrRejectExpense
 */
export const approveOrRejectExpense = async (companyId, expenseId, approverId, { action, rejection_reason }) => {
  const approverUser = await User.findByPk(approverId);
  if (action === 'APPROVE' || action === EXPENSE_APPROVAL_ACTION.APPROVED) {
    return await approveExpense(companyId, expenseId, approverUser || { id: approverId, role: ROLES.MANAGER });
  } else if (action === 'REJECT' || action === EXPENSE_APPROVAL_ACTION.REJECTED) {
    return await rejectExpense(companyId, expenseId, approverUser || { id: approverId, role: ROLES.MANAGER }, { rejection_reason });
  }
  const err = new Error('Invalid approval action. Must be APPROVE or REJECT');
  err.statusCode = 400;
  throw err;
};

/**
 * Get list of expenses with filters
 */
export const getExpenses = async (companyId, currentUser, query = {}) => {
  const { page = 1, limit = 20, trip_id, status, category, input_method, from_date, to_date, search } = query;
  const where = { company_id: companyId };

  if (currentUser.role === ROLES.OFFICER) {
    where.officer_id = currentUser.id;
  }

  if (trip_id) {
    where.trip_id = trip_id;
  }

  if (status && status !== 'ALL') {
    if (status === 'PENDING' || status === 'SUBMITTED') {
      where.status = { [Op.in]: ['PENDING', 'SUBMITTED'] };
    } else {
      where.status = status;
    }
  }

  if (category) {
    where.category = category;
  }

  if (input_method) {
    where.input_method = input_method;
  }

  if (from_date || to_date) {
    where.date = {};
    if (from_date) where.date[Op.gte] = new Date(from_date);
    if (to_date) where.date[Op.lte] = new Date(to_date);
  }

  if (search && search.trim() !== '') {
    where[Op.or] = [
      { description: { [Op.like]: `%${search.trim()}%` } },
      { category: { [Op.like]: `%${search.trim()}%` } }
    ];
  }

  const offset = (page - 1) * limit;

  const { rows: expenses, count: total } = await Expense.findAndCountAll({
    where,
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
    order: [['date', 'DESC'], ['created_at', 'DESC']],
    include: [
      { model: Trip, as: 'trip', attributes: ['id', 'title', 'destination', 'trip_code', 'initial_balance', 'remaining_budget'] },
      { model: User, as: 'officer', attributes: ['id', 'name', 'email', 'avatar_url'] },
      { model: User, as: 'approver', attributes: ['id', 'name', 'email'] },
      { model: ExpenseCategory, as: 'expense_category', attributes: ['id', 'name', 'code', 'icon'] },
      {
        model: ExpenseApproval,
        as: 'approvals',
        include: [{ model: User, as: 'approver', attributes: ['id', 'name', 'email'] }],
        order: [['created_at', 'DESC']]
      }
    ]
  });

  return {
    expenses,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total_pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get pending expenses queue for Manager review
 */
export const getPendingExpenses = async (companyId, currentUser, query = {}) => {
  return await getExpenses(companyId, currentUser, {
    ...query,
    status: EXPENSE_STATUS.PENDING
  });
};

/**
 * Get single expense detail by ID
 */
export const getExpenseById = async (companyId, expenseId, currentUser = null) => {
  const where = { id: expenseId, company_id: companyId };
  if (currentUser && currentUser.role === ROLES.OFFICER) {
    where.officer_id = currentUser.id;
  }

  const expense = await Expense.findOne({
    where,
    include: [
      { model: Trip, as: 'trip' },
      { model: User, as: 'officer', attributes: ['id', 'name', 'email', 'avatar_url'] },
      { model: User, as: 'approver', attributes: ['id', 'name', 'email'] },
      { model: ExpenseCategory, as: 'expense_category' },
      { model: ExpenseReceipt, as: 'receipt' },
      { model: ExpenseOCR, as: 'ocr_data' },
      {
        model: ExpenseApproval,
        as: 'approvals',
        include: [{ model: User, as: 'approver', attributes: ['id', 'name', 'email'] }]
      }
    ]
  });

  if (!expense) {
    const err = new Error('Expense not found or unauthorized');
    err.statusCode = 404;
    throw err;
  }

  return expense;
};

/**
 * Update an existing DRAFT expense
 */
export const updateExpense = async (companyId, expenseId, currentUser, updateData) => {
  const expense = await Expense.findOne({
    where: { id: expenseId, company_id: companyId }
  });

  if (!expense) {
    const err = new Error('Expense not found');
    err.statusCode = 404;
    throw err;
  }

  if (currentUser.role === ROLES.OFFICER && expense.officer_id !== currentUser.id) {
    const err = new Error('You can only update your own expenses');
    err.statusCode = 403;
    throw err;
  }

  if (expense.status !== EXPENSE_STATUS.DRAFT) {
    const err = new Error('Only DRAFT expenses can be updated');
    err.statusCode = 400;
    throw err;
  }

  const payload = {};
  if (updateData.category !== undefined) payload.category = updateData.category;
  if (updateData.category_id !== undefined) payload.category_id = updateData.category_id;
  if (updateData.amount !== undefined) payload.amount = parseFloat(updateData.amount);
  if (updateData.date !== undefined) payload.date = new Date(updateData.date);
  if (updateData.description !== undefined) payload.description = updateData.description;

  await expense.update(payload);

  return await getExpenseById(companyId, expenseId);
};

/**
 * Delete a DRAFT expense
 */
export const deleteExpense = async (companyId, expenseId, currentUser) => {
  const expense = await Expense.findOne({
    where: { id: expenseId, company_id: companyId }
  });

  if (!expense) {
    const err = new Error('Expense not found');
    err.statusCode = 404;
    throw err;
  }

  if (currentUser.role === ROLES.OFFICER && expense.officer_id !== currentUser.id) {
    const err = new Error('You can only delete your own expenses');
    err.statusCode = 403;
    throw err;
  }

  if (expense.status !== EXPENSE_STATUS.DRAFT) {
    const err = new Error('Only DRAFT expenses can be deleted');
    err.statusCode = 400;
    throw err;
  }

  await expense.destroy();
  return true;
};
