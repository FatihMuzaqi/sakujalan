import { sequelize, Trip, Expense, User, TripLocation, ExpenseApproval } from '../model/index.js';
import { EXPENSE_STATUS, TRIP_STATUS, ROLES } from '../config/constants.js';
import { Op } from 'sequelize';

/**
 * Returns comprehensive Management Dashboard data for Owner/Admin/Manager
 * Answers: "Bagaimana kondisi perjalanan perusahaan?"
 */
export const getCompanyDashboardReport = async (companyId) => {
  // 1. Trips Statistics
  const activeStatuses = [TRIP_STATUS.ACTIVE, 'IN_PROGRESS'];
  const totalTrips = await Trip.count({ where: { company_id: companyId } });
  const activeTripsCount = await Trip.count({
    where: {
      company_id: companyId,
      status: { [Op.in]: activeStatuses }
    }
  });
  const scheduledTripsCount = await Trip.count({
    where: {
      company_id: companyId,
      status: { [Op.in]: [TRIP_STATUS.SCHEDULED, 'ASSIGNED'] }
    }
  });
  const completedTripsCount = await Trip.count({
    where: { company_id: companyId, status: TRIP_STATUS.COMPLETED }
  });

  // 2. Financials & Budgets
  const tripsBudget = await Trip.findAll({
    where: { company_id: companyId },
    attributes: [
      [sequelize.fn('SUM', sequelize.col('initial_balance')), 'total_allocated'],
      [sequelize.fn('SUM', sequelize.col('remaining_budget')), 'total_remaining']
    ],
    raw: true
  });

  const totalAllocated = parseFloat(tripsBudget[0]?.total_allocated || 0);
  const totalRemaining = parseFloat(tripsBudget[0]?.total_remaining || 0);

  // Total Approved Spending
  const approvedExpensesSum = await Expense.findAll({
    where: {
      company_id: companyId,
      status: EXPENSE_STATUS.APPROVED
    },
    attributes: [
      [sequelize.fn('SUM', sequelize.col('amount')), 'total_approved']
    ],
    raw: true
  });
  const totalSpending = parseFloat(approvedExpensesSum[0]?.total_approved || (totalAllocated - totalRemaining) || 0);

  // 3. Pending Approvals Queue
  const pendingExpensesData = await Expense.findAll({
    where: {
      company_id: companyId,
      status: { [Op.in]: [EXPENSE_STATUS.PENDING, 'SUBMITTED'] }
    },
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount']
    ],
    raw: true
  });
  const pendingExpensesCount = parseInt(pendingExpensesData[0]?.count || 0, 10);
  const pendingExpensesAmount = parseFloat(pendingExpensesData[0]?.total_amount || 0);

  // 4. Active Trips List with Assigned Officers & Latest Locations
  const activeTripsList = await Trip.findAll({
    where: {
      company_id: companyId,
      status: { [Op.in]: activeStatuses }
    },
    include: [
      {
        model: User,
        as: 'officer',
        attributes: ['id', 'name', 'email', 'phone', 'avatar_url']
      },
      {
        model: TripLocation,
        as: 'locations',
        limit: 1,
        order: [['recorded_at', 'DESC']]
      }
    ],
    order: [['updated_at', 'DESC']]
  });

  // Active Officers Set
  const uniqueActiveOfficers = new Set();
  const activeTripMapPoints = [];

  const formattedActiveTrips = activeTripsList.map(trip => {
    if (trip.officer_id) uniqueActiveOfficers.add(trip.officer_id);
    const latestLoc = trip.locations && trip.locations[0];

    if (latestLoc) {
      activeTripMapPoints.push({
        trip_id: trip.id,
        trip_code: trip.trip_code,
        trip_title: trip.title,
        officer_name: trip.officer ? trip.officer.name : 'Officer',
        latitude: parseFloat(latestLoc.latitude),
        longitude: parseFloat(latestLoc.longitude),
        speed: latestLoc.speed,
        heading: latestLoc.heading,
        recorded_at: latestLoc.recorded_at
      });
    }

    return {
      id: trip.id,
      trip_code: trip.trip_code,
      title: trip.title,
      start_location: trip.start_location,
      destination: trip.destination,
      status: trip.status,
      initial_balance: parseFloat(trip.initial_balance || trip.allocated_budget || 0),
      remaining_budget: parseFloat(trip.remaining_budget || 0),
      start_at: trip.start_at || trip.start_date,
      end_at: trip.end_at || trip.end_date,
      officer: trip.officer ? {
        id: trip.officer.id,
        name: trip.officer.name,
        email: trip.officer.email,
        phone: trip.officer.phone
      } : null,
      latest_location: latestLoc ? {
        latitude: parseFloat(latestLoc.latitude),
        longitude: parseFloat(latestLoc.longitude),
        speed: latestLoc.speed,
        heading: latestLoc.heading,
        recorded_at: latestLoc.recorded_at
      } : null
    };
  });

  // 5. Recent Activity Feed
  const recentExpenses = await Expense.findAll({
    where: { company_id: companyId },
    include: [
      { model: User, as: 'officer', attributes: ['name'] },
      { model: Trip, as: 'trip', attributes: ['title', 'trip_code'] }
    ],
    limit: 6,
    order: [['updated_at', 'DESC']]
  });

  const recentTrips = await Trip.findAll({
    where: { company_id: companyId },
    include: [{ model: User, as: 'officer', attributes: ['name'] }],
    limit: 4,
    order: [['updated_at', 'DESC']]
  });

  const recentActivities = [];

  for (const exp of recentExpenses) {
    let title = 'Pengeluaran Dicatat';
    let type = 'EXPENSE';
    if (exp.status === EXPENSE_STATUS.APPROVED) {
      title = `Pengeluaran Disetujui (Rp ${parseFloat(exp.amount).toLocaleString('id-ID')})`;
    } else if (exp.status === EXPENSE_STATUS.REJECTED) {
      title = `Pengeluaran Ditolak: ${exp.rejection_reason || ''}`;
    } else if (exp.status === EXPENSE_STATUS.PENDING || exp.status === 'SUBMITTED') {
      title = `Pengajuan Baru: ${exp.category} (Rp ${parseFloat(exp.amount).toLocaleString('id-ID')})`;
    } else {
      title = `Draft Pengeluaran (${exp.category})`;
    }

    recentActivities.push({
      id: exp.id,
      type,
      title,
      description: `${exp.officer?.name || 'Petugas'} di ${exp.trip?.title || 'Perjalanan'}`,
      timestamp: exp.updated_at || exp.created_at,
      status: exp.status
    });
  }

  for (const tr of recentTrips) {
    recentActivities.push({
      id: tr.id,
      type: 'TRIP',
      title: `Status Trip: ${tr.status} (${tr.trip_code})`,
      description: `${tr.title} — Petugas: ${tr.officer?.name || 'Belum ditugaskan'}`,
      timestamp: tr.updated_at || tr.created_at,
      status: tr.status
    });
  }

  // Sort chronologically descending
  recentActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // 6. Expenses by Category
  const categoryExpenses = await Expense.findAll({
    where: {
      company_id: companyId,
      status: EXPENSE_STATUS.APPROVED
    },
    attributes: [
      'category',
      [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['category'],
    raw: true
  });

  const formattedCategoryExpenses = categoryExpenses.map(c => ({
    category: c.category,
    total_amount: parseFloat(c.total_amount || 0),
    count: parseInt(c.count || 0, 10),
    percentage: totalSpending > 0 ? Number(((parseFloat(c.total_amount || 0) / totalSpending) * 100).toFixed(1)) : 0
  }));

  // 7. Total Active Officers
  const totalOfficersCount = await User.count({
    where: { company_id: companyId, role: ROLES.OFFICER, is_active: true }
  });

  return {
    kpis: {
      active_trips_count: activeTripsCount,
      scheduled_trips_count: scheduledTripsCount,
      completed_trips_count: completedTripsCount,
      total_trips_count: totalTrips,
      pending_expenses_count: pendingExpensesCount,
      pending_expenses_amount: pendingExpensesAmount,
      total_spending: totalSpending,
      remaining_budget: totalRemaining,
      total_allocated_budget: totalAllocated,
      active_officers_count: uniqueActiveOfficers.size,
      total_officers_count: totalOfficersCount,
      utilization_percentage: totalAllocated > 0 ? Number(((totalSpending / totalAllocated) * 100).toFixed(2)) : 0
    },
    active_trips: formattedActiveTrips,
    active_trip_map: activeTripMapPoints,
    recent_activities: recentActivities.slice(0, 10),
    expenses_by_category: formattedCategoryExpenses,
    // Legacy structure compatibility
    trips: {
      total: totalTrips,
      active: activeTripsCount,
      completed: completedTripsCount
    },
    finances: {
      total_allocated_budget: totalAllocated,
      total_remaining_budget: totalRemaining,
      total_spent: totalSpending,
      utilization_percentage: totalAllocated > 0 ? ((totalSpending / totalAllocated) * 100).toFixed(2) : 0
    },
    pending_approvals: pendingExpensesCount
  };
};

/**
 * Returns detailed expense analytics for management reports
 */
export const getExpenseAnalyticsReport = async (companyId, { from_date, to_date }) => {
  const where = {
    company_id: companyId,
    status: EXPENSE_STATUS.APPROVED
  };

  if (from_date || to_date) {
    where.date = {};
    if (from_date) where.date[Op.gte] = new Date(from_date);
    if (to_date) where.date[Op.lte] = new Date(to_date);
  }

  const expenses = await Expense.findAll({
    where,
    include: [
      { model: Trip, as: 'trip', attributes: ['id', 'title', 'destination', 'trip_code'] },
      { model: User, as: 'officer', attributes: ['id', 'name', 'email'] },
      { model: User, as: 'approver', attributes: ['id', 'name'] }
    ],
    order: [['date', 'DESC']]
  });

  return {
    total_approved_expenses: expenses.length,
    total_approved_amount: expenses.reduce((sum, item) => sum + parseFloat(item.amount), 0),
    items: expenses
  };
};
