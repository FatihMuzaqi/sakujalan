import { sequelize, Trip, TripMember, User, Expense, TripLocation, WalletTransaction } from '../model/index.js';
import { ROLES, TRIP_STATUS, TRANSACTION_TYPES } from '../config/constants.js';
import { Op } from 'sequelize';
import { broadcastTripStatus } from './socket.service.js';
import { isSubscriptionActive } from './subscription.service.js';

/**
 * Generate a clean unique Trip Code (e.g. TRP-260905-1234)
 */
export const generateTripCode = () => {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TRP-${dateStr}-${rand}`;
};

/**
 * Valid Status Transitions Matrix
 */
const ALLOWED_TRANSITIONS = {
  [TRIP_STATUS.DRAFT]: [TRIP_STATUS.SCHEDULED, TRIP_STATUS.CANCELLED],
  [TRIP_STATUS.SCHEDULED]: [TRIP_STATUS.ACTIVE, TRIP_STATUS.DRAFT, TRIP_STATUS.CANCELLED],
  [TRIP_STATUS.ACTIVE]: [TRIP_STATUS.COMPLETED, TRIP_STATUS.CANCELLED],
  [TRIP_STATUS.COMPLETED]: [],
  [TRIP_STATUS.CANCELLED]: []
};

/**
 * Normalize legacy status names (ASSIGNED -> SCHEDULED, IN_PROGRESS -> ACTIVE)
 */
const normalizeStatus = (status) => {
  if (!status) return TRIP_STATUS.DRAFT;
  const upper = status.toUpperCase();
  if (upper === 'ASSIGNED') return TRIP_STATUS.SCHEDULED;
  if (upper === 'IN_PROGRESS') return TRIP_STATUS.ACTIVE;
  return upper;
};

/**
 * Create a new Trip with transaction, unique trip_code, initial budget, and optional officer assignment
 */
export const createTrip = async (companyId, creatorId, tripData) => {
  const isSubActive = await isSubscriptionActive(companyId);
  if (!isSubActive) {
    const err = new Error('Tidak dapat membuat perjalanan dinas baru: Paket langganan atau masa trial perusahaan telah kadaluarsa. Silakan perpanjang langganan.');
    err.statusCode = 403;
    err.errorCode = 'SUBSCRIPTION_EXPIRED';
    throw err;
  }

  const transaction = await sequelize.transaction();
  try {
    const officerId = tripData.officer_id || (tripData.officer_ids && tripData.officer_ids[0]) || null;

    if (officerId) {
      const officer = await User.findOne({
        where: { id: officerId, company_id: companyId }
      });
      if (!officer) {
        const err = new Error('Assigned officer does not belong to this company');
        err.statusCode = 400;
        err.errorCode = 'INVALID_OFFICER';
        throw err;
      }
    }

    const initialStatus = officerId ? TRIP_STATUS.SCHEDULED : TRIP_STATUS.DRAFT;
    const initialBalance = parseFloat(tripData.initial_balance ?? tripData.allocated_budget ?? 0);
    const startDate = new Date(tripData.start_at || tripData.start_date || new Date());
    const endDate = new Date(tripData.end_at || tripData.end_date || new Date());
    const startLoc = tripData.start_location || tripData.origin || 'Jakarta';
    const destLoc = tripData.destination;

    const tripCode = generateTripCode();

    const trip = await Trip.create(
      {
        company_id: companyId,
        created_by: creatorId,
        officer_id: officerId,
        trip_code: tripCode,
        title: tripData.title,
        description: tripData.description || tripData.purpose || null,
        purpose: tripData.purpose || tripData.description || null,
        start_location: startLoc,
        origin: startLoc,
        start_latitude: tripData.start_latitude || null,
        start_longitude: tripData.start_longitude || null,
        destination: destLoc,
        destination_latitude: tripData.destination_latitude || null,
        destination_longitude: tripData.destination_longitude || null,
        start_at: startDate,
        start_date: startDate,
        end_at: endDate,
        end_date: endDate,
        initial_balance: initialBalance,
        allocated_budget: initialBalance,
        remaining_budget: initialBalance,
        status: initialStatus
      },
      { transaction }
    );

    // If officer is assigned, create TripMember
    if (officerId) {
      await TripMember.create(
        {
          trip_id: trip.id,
          user_id: officerId,
          role: 'OFFICER',
          assigned_at: new Date()
        },
        { transaction }
      );
    }

    // Record budget allocation in financial ledger if balance > 0
    if (initialBalance > 0) {
      await WalletTransaction.create(
        {
          company_id: companyId,
          trip_id: trip.id,
          user_id: officerId || creatorId,
          type: TRANSACTION_TYPES.DISBURSEMENT,
          amount: initialBalance,
          balance_after: initialBalance,
          reference_id: `TRIP-BUDGET-${trip.trip_code}`,
          description: `Budget allocation for trip: ${trip.title}`
        },
        { transaction }
      );
    }

    await transaction.commit();

    return await getTripById(companyId, trip.id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Get trips with filters and pagination
 */
export const getTrips = async (companyId, currentUser, query = {}) => {
  const { page = 1, limit = 20, status, search, officer_id } = query;
  const where = { company_id: companyId };

  // Strict RBAC: Officers only see trips assigned to them
  if (currentUser.role === ROLES.OFFICER) {
    where.officer_id = currentUser.id;
  } else if (officer_id) {
    where.officer_id = officer_id;
  }

  if (status) {
    const normalized = normalizeStatus(status);
    where.status = { [Op.or]: [normalized, status] };
  }

  if (search) {
    where[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { trip_code: { [Op.like]: `%${search}%` } },
      { destination: { [Op.like]: `%${search}%` } },
      { start_location: { [Op.like]: `%${search}%` } },
      { origin: { [Op.like]: `%${search}%` } }
    ];
  }

  const offset = (page - 1) * limit;

  const { rows: trips, count: total } = await Trip.findAndCountAll({
    where,
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
    order: [['start_date', 'DESC'], ['created_at', 'DESC']],
    include: [
      { model: User, as: 'creator', attributes: ['id', 'name', 'email', 'avatar_url'] },
      { model: User, as: 'officer', attributes: ['id', 'name', 'email', 'avatar_url', 'phone'] },
      {
        model: TripMember,
        as: 'members',
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }]
      }
    ]
  });

  return {
    trips,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total_pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get single Trip by ID with full associations and tenant boundary
 */
export const getTripById = async (companyId, tripId, currentUser = null) => {
  const where = {
    id: tripId,
    company_id: companyId
  };

  // Officers can only access their assigned trips
  if (currentUser && currentUser.role === ROLES.OFFICER) {
    where.officer_id = currentUser.id;
  }

  const trip = await Trip.findOne({
    where,
    include: [
      { model: User, as: 'creator', attributes: ['id', 'name', 'email', 'avatar_url'] },
      { model: User, as: 'officer', attributes: ['id', 'name', 'email', 'avatar_url', 'phone'] },
      {
        model: TripMember,
        as: 'members',
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }]
      },
      { model: Expense, as: 'expenses' },
      {
        model: TripLocation,
        as: 'locations',
        limit: 20,
        order: [['recorded_at', 'DESC']]
      }
    ]
  });

  if (!trip) {
    const err = new Error('Trip not found or unauthorized');
    err.statusCode = 404;
    err.errorCode = 'TRIP_NOT_FOUND';
    throw err;
  }

  return trip;
};

/**
 * Update trip details
 */
export const updateTrip = async (companyId, tripId, updateData) => {
  const trip = await Trip.findOne({
    where: { id: tripId, company_id: companyId }
  });

  if (!trip) {
    const err = new Error('Trip not found in this company');
    err.statusCode = 404;
    err.errorCode = 'TRIP_NOT_FOUND';
    throw err;
  }

  const currentStatus = normalizeStatus(trip.status);
  if (currentStatus === TRIP_STATUS.COMPLETED || currentStatus === TRIP_STATUS.CANCELLED) {
    const err = new Error(`Cannot update trip in ${trip.status} status`);
    err.statusCode = 400;
    err.errorCode = 'TRIP_LOCKED';
    throw err;
  }

  const fieldsToUpdate = {};

  if (updateData.title) fieldsToUpdate.title = updateData.title;
  if (updateData.description !== undefined) {
    fieldsToUpdate.description = updateData.description;
    fieldsToUpdate.purpose = updateData.description;
  }
  if (updateData.purpose !== undefined) {
    fieldsToUpdate.purpose = updateData.purpose;
    fieldsToUpdate.description = updateData.purpose;
  }
  if (updateData.start_location || updateData.origin) {
    const loc = updateData.start_location || updateData.origin;
    fieldsToUpdate.start_location = loc;
    fieldsToUpdate.origin = loc;
  }
  if (updateData.destination) fieldsToUpdate.destination = updateData.destination;
  if (updateData.start_latitude !== undefined) fieldsToUpdate.start_latitude = updateData.start_latitude;
  if (updateData.start_longitude !== undefined) fieldsToUpdate.start_longitude = updateData.start_longitude;
  if (updateData.destination_latitude !== undefined) fieldsToUpdate.destination_latitude = updateData.destination_latitude;
  if (updateData.destination_longitude !== undefined) fieldsToUpdate.destination_longitude = updateData.destination_longitude;

  if (updateData.start_at || updateData.start_date) {
    const dt = new Date(updateData.start_at || updateData.start_date);
    fieldsToUpdate.start_at = dt;
    fieldsToUpdate.start_date = dt;
  }
  if (updateData.end_at || updateData.end_date) {
    const dt = new Date(updateData.end_at || updateData.end_date);
    fieldsToUpdate.end_at = dt;
    fieldsToUpdate.end_date = dt;
  }

  if (updateData.initial_balance !== undefined || updateData.allocated_budget !== undefined) {
    const budget = parseFloat(updateData.initial_balance ?? updateData.allocated_budget);
    fieldsToUpdate.initial_balance = budget;
    fieldsToUpdate.allocated_budget = budget;
  }

  if (updateData.officer_id !== undefined) {
    if (updateData.officer_id) {
      const officer = await User.findOne({
        where: { id: updateData.officer_id, company_id: companyId }
      });
      if (!officer) {
        const err = new Error('Assigned officer does not belong to this company');
        err.statusCode = 400;
        throw err;
      }
      fieldsToUpdate.officer_id = updateData.officer_id;
      if (currentStatus === TRIP_STATUS.DRAFT) {
        fieldsToUpdate.status = TRIP_STATUS.SCHEDULED;
      }
    } else {
      fieldsToUpdate.officer_id = null;
    }
  }

  await trip.update(fieldsToUpdate);
  return await getTripById(companyId, tripId);
};

/**
 * Assign officer to trip
 */
export const assignOfficerToTrip = async (companyId, tripId, officerId) => {
  const trip = await Trip.findOne({
    where: { id: tripId, company_id: companyId }
  });

  if (!trip) {
    const err = new Error('Trip not found');
    err.statusCode = 404;
    err.errorCode = 'TRIP_NOT_FOUND';
    throw err;
  }

  const officer = await User.findOne({
    where: { id: officerId, company_id: companyId }
  });

  if (!officer) {
    const err = new Error('Officer not found in this company');
    err.statusCode = 400;
    err.errorCode = 'INVALID_OFFICER';
    throw err;
  }

  const transaction = await sequelize.transaction();

  try {
    const currentStatus = normalizeStatus(trip.status);
    const newStatus = currentStatus === TRIP_STATUS.DRAFT ? TRIP_STATUS.SCHEDULED : trip.status;

    await trip.update(
      {
        officer_id: officerId,
        status: newStatus
      },
      { transaction }
    );

    // Upsert TripMember
    const [tripMember] = await TripMember.findOrCreate({
      where: { trip_id: tripId, user_id: officerId },
      defaults: {
        trip_id: tripId,
        user_id: officerId,
        role: 'OFFICER',
        assigned_at: new Date()
      },
      transaction
    });

    await transaction.commit();

    return await getTripById(companyId, tripId);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * State Machine Transition Enforcement
 */
export const transitionTripStatus = async (companyId, tripId, targetStatus, currentUser) => {
  const normalizedTarget = normalizeStatus(targetStatus);

  const trip = await Trip.findOne({
    where: { id: tripId, company_id: companyId }
  });

  if (!trip) {
    const err = new Error('Trip not found or unauthorized');
    err.statusCode = 404;
    err.errorCode = 'TRIP_NOT_FOUND';
    throw err;
  }

  const currentNormalized = normalizeStatus(trip.status);

  // Check state machine validity
  const allowedNext = ALLOWED_TRANSITIONS[currentNormalized] || [];
  if (!allowedNext.includes(normalizedTarget)) {
    const err = new Error(`Invalid status transition: Cannot transition trip from '${currentNormalized}' to '${normalizedTarget}'. Valid target states: [${allowedNext.join(', ')}]`);
    err.statusCode = 400;
    err.errorCode = 'INVALID_STATUS_TRANSITION';
    throw err;
  }

  // Officer-specific restrictions
  if (currentUser.role === ROLES.OFFICER) {
    if (trip.officer_id !== currentUser.id) {
      const err = new Error('Forbidden: You can only transition trips assigned to you');
      err.statusCode = 403;
      err.errorCode = 'FORBIDDEN';
      throw err;
    }

    // Officer can only start a SCHEDULED trip to ACTIVE, or complete an ACTIVE trip
    if (normalizedTarget === TRIP_STATUS.ACTIVE && currentNormalized !== TRIP_STATUS.SCHEDULED) {
      const err = new Error('Trip can only be started if it is in SCHEDULED status');
      err.statusCode = 400;
      err.errorCode = 'INVALID_STATUS_TRANSITION';
      throw err;
    }

    if (normalizedTarget === TRIP_STATUS.COMPLETED && currentNormalized !== TRIP_STATUS.ACTIVE) {
      const err = new Error('Trip can only be completed if it is currently ACTIVE');
      err.statusCode = 400;
      err.errorCode = 'INVALID_STATUS_TRANSITION';
      throw err;
    }

    if (normalizedTarget === TRIP_STATUS.CANCELLED) {
      const err = new Error('Officers cannot cancel trips. Contact a Manager or Admin.');
      err.statusCode = 403;
      err.errorCode = 'ROLE_FORBIDDEN';
      throw err;
    }
  }

  // Update trip status (and preserve format for compatibility)
  await trip.update({ status: normalizedTarget });

  // Broadcast trip status over realtime socket gateway
  broadcastTripStatus(tripId, companyId, normalizedTarget);

  return await getTripById(companyId, tripId);
};

/**
 * Start Trip (Transition to ACTIVE)
 */
export const startTrip = async (companyId, tripId, currentUser) => {
  return await transitionTripStatus(companyId, tripId, TRIP_STATUS.ACTIVE, currentUser);
};

/**
 * Complete Trip (Transition to COMPLETED)
 */
export const completeTrip = async (companyId, tripId, currentUser) => {
  return await transitionTripStatus(companyId, tripId, TRIP_STATUS.COMPLETED, currentUser);
};

/**
 * Delete or Cancel Trip
 */
export const deleteOrCancelTrip = async (companyId, tripId, currentUser) => {
  const trip = await Trip.findOne({
    where: { id: tripId, company_id: companyId }
  });

  if (!trip) {
    const err = new Error('Trip not found');
    err.statusCode = 404;
    err.errorCode = 'TRIP_NOT_FOUND';
    throw err;
  }

  const currentStatus = normalizeStatus(trip.status);

  if (currentStatus === TRIP_STATUS.DRAFT) {
    // Hard delete if draft
    await trip.destroy();
    return { message: 'Draft trip deleted successfully' };
  }

  // Otherwise transition to CANCELLED
  return await transitionTripStatus(companyId, tripId, TRIP_STATUS.CANCELLED, currentUser);
};

/**
 * Get Officer Active Dashboard data (Active trip, destination, balance, GPS status, today's expenses)
 */
export const getOfficerDashboard = async (companyId, officerId) => {
  // Find active or scheduled trip (prioritize ACTIVE over SCHEDULED)
  let activeTrip = await Trip.findOne({
    where: {
      company_id: companyId,
      officer_id: officerId,
      status: {
        [Op.in]: [TRIP_STATUS.ACTIVE, 'IN_PROGRESS']
      }
    },
    include: [
      {
        model: Expense,
        as: 'expenses',
        limit: 20,
        order: [['date', 'DESC']]
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

  if (!activeTrip) {
    activeTrip = await Trip.findOne({
      where: {
        company_id: companyId,
        officer_id: officerId,
        status: {
          [Op.in]: [TRIP_STATUS.SCHEDULED, 'ASSIGNED']
        }
      },
      include: [
        {
          model: Expense,
          as: 'expenses',
          limit: 20,
          order: [['date', 'DESC']]
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
  }

  if (!activeTrip) {
    return {
      has_active_trip: false,
      is_on_duty: false,
      active_trip: null,
      today_expenses: [],
      today_expenses_total: 0,
      today_total_spent: 0,
      today_expenses_count: 0,
      recent_expenses: []
    };
  }

  // Calculate today's expenses
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayExpenses = (activeTrip.expenses || []).filter(e => {
    const expDate = new Date(e.date || e.created_at);
    return expDate >= today;
  });

  const todayExpensesTotal = todayExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const latestLocation = activeTrip.locations && activeTrip.locations[0];

  return {
    has_active_trip: true,
    is_on_duty: true,
    active_trip: {
      id: activeTrip.id,
      trip_code: activeTrip.trip_code,
      title: activeTrip.title,
      destination: activeTrip.destination,
      status: activeTrip.status,
      initial_balance: parseFloat(activeTrip.initial_balance || activeTrip.allocated_budget || 0),
      remaining_balance: parseFloat(activeTrip.remaining_budget || 0),
      remaining_budget: parseFloat(activeTrip.remaining_budget || 0),
      start_at: activeTrip.start_at || activeTrip.start_date,
      end_at: activeTrip.end_at || activeTrip.end_date,
      gps_status: latestLocation ? 'LIVE_STREAMING' : 'READY',
      last_location: latestLocation || null
    },
    today_expenses: todayExpenses,
    today_expenses_total: todayExpensesTotal,
    today_total_spent: todayExpensesTotal,
    today_expenses_count: todayExpenses.length,
    recent_expenses: activeTrip.expenses || []
  };
};

// Backwards compatibility alias
export const updateTripStatus = transitionTripStatus;
