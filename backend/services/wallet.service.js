import { sequelize, WalletTransaction, Trip, User } from '../model/index.js';
import { TRANSACTION_TYPES } from '../config/constants.js';
import { broadcastBalanceUpdate } from './socket.service.js';
import { Op } from 'sequelize';

/**
 * Record initial budget allocation for a trip and update trip balances
 */
export const creditInitialTripBudget = async (companyId, tripId, userId, amount, { transaction } = {}) => {
  const trip = await Trip.findOne({
    where: { id: tripId, company_id: companyId },
    transaction
  });

  if (!trip) {
    const err = new Error('Trip not found in this company');
    err.statusCode = 404;
    throw err;
  }

  const numAmount = parseFloat(amount) || 0;
  const balanceBefore = 0.00;
  const balanceAfter = numAmount;

  // Update Trip balances
  await trip.update(
    {
      initial_balance: numAmount,
      remaining_budget: balanceAfter,
      allocated_budget: numAmount
    },
    { transaction }
  );

  // Record INITIAL transaction
  const walletTx = await WalletTransaction.create(
    {
      company_id: companyId,
      trip_id: tripId,
      user_id: userId,
      type: TRANSACTION_TYPES.INITIAL,
      amount: numAmount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      reference_id: `TRP-${trip.trip_code || tripId.substring(0, 8)}`,
      description: `Initial budget allocation: ${trip.title}`
    },
    { transaction }
  );

  broadcastBalanceUpdate(companyId, tripId, {
    remaining_budget: balanceAfter,
    total_spent: 0
  });

  return { walletTx, trip, balance_after: balanceAfter };
};

/**
 * Deduct approved expense amount from trip budget and record ledger mutation
 */
export const deductApprovedExpense = async (companyId, tripId, userId, expenseId, amount, description = null, { transaction } = {}) => {
  const trip = await Trip.findOne({
    where: { id: tripId, company_id: companyId },
    lock: transaction ? transaction.LOCK.UPDATE : false,
    transaction
  });

  if (!trip) {
    const err = new Error('Trip not found for wallet deduction');
    err.statusCode = 404;
    throw err;
  }

  const expenseAmount = parseFloat(amount) || 0;
  const balanceBefore = parseFloat(trip.remaining_budget) || 0;
  const balanceAfter = balanceBefore - expenseAmount;

  // Update Trip remaining budget
  await trip.update(
    { remaining_budget: balanceAfter },
    { transaction }
  );

  // Record EXPENSE transaction
  const walletTx = await WalletTransaction.create(
    {
      company_id: companyId,
      trip_id: tripId,
      user_id: userId,
      type: TRANSACTION_TYPES.EXPENSE,
      amount: expenseAmount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      reference_id: `EXP-${expenseId.substring(0, 8)}`,
      description: description || `Approved expense deduction: Rp ${expenseAmount.toLocaleString('id-ID')}`
    },
    { transaction }
  );

  broadcastBalanceUpdate(companyId, tripId, {
    remaining_budget: balanceAfter,
    total_spent: (parseFloat(trip.initial_balance) || 0) - balanceAfter
  });

  return { walletTx, trip, balance_after: balanceAfter };
};

/**
 * Retrieve company ledger transactions
 */
export const getCompanyLedger = async (companyId, query = {}) => {
  const { page = 1, limit = 20, trip_id, user_id, type, from_date, to_date } = query;
  const where = { company_id: companyId };

  if (trip_id) {
    where.trip_id = trip_id;
  }

  if (user_id) {
    where.user_id = user_id;
  }

  if (type) {
    if (type === 'INITIAL' || type === 'DISBURSEMENT') {
      where.type = { [Op.in]: ['INITIAL', 'DISBURSEMENT'] };
    } else if (type === 'EXPENSE' || type === 'EXPENSE_DEDUCTION') {
      where.type = { [Op.in]: ['EXPENSE', 'EXPENSE_DEDUCTION'] };
    } else {
      where.type = type;
    }
  }

  if (from_date || to_date) {
    where.created_at = {};
    if (from_date) where.created_at[Op.gte] = new Date(from_date);
    if (to_date) where.created_at[Op.lte] = new Date(to_date);
  }

  const offset = (page - 1) * limit;

  const { rows: transactions, count: total } = await WalletTransaction.findAndCountAll({
    where,
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
    order: [['created_at', 'DESC']],
    include: [
      { model: Trip, as: 'trip', attributes: ['id', 'title', 'destination', 'trip_code', 'initial_balance', 'remaining_budget'] },
      { model: User, as: 'user', attributes: ['id', 'name', 'email', 'avatar_url'] }
    ]
  });

  return {
    transactions,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total_pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Retrieve officer ledger transactions
 */
export const getOfficerLedger = async (companyId, officerId, query = {}) => {
  return await getCompanyLedger(companyId, {
    ...query,
    user_id: officerId
  });
};

/**
 * Get financial balance summary for a specific trip
 */
export const getTripBalance = async (companyId, tripId, { transaction } = {}) => {
  const trip = await Trip.findOne({
    where: { id: tripId, company_id: companyId },
    transaction
  });

  if (!trip) {
    const err = new Error('Trip not found');
    err.statusCode = 404;
    throw err;
  }

  const initialBalance = parseFloat(trip.initial_balance) || 0;
  const remainingBudget = parseFloat(trip.remaining_budget) || 0;
  const totalSpent = initialBalance - remainingBudget;

  const transactionsCount = await WalletTransaction.count({
    where: { company_id: companyId, trip_id: tripId },
    transaction
  });

  return {
    trip_id: trip.id,
    trip_code: trip.trip_code,
    title: trip.title,
    initial_balance: initialBalance,
    remaining_budget: remainingBudget,
    total_spent: totalSpent,
    usage_percentage: initialBalance > 0 ? ((totalSpent / initialBalance) * 100).toFixed(2) : 0,
    transactions_count: transactionsCount
  };
};
