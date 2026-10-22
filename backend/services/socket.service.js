import { Server } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.util.js';
import { User, TripLocation, Trip } from '../model/index.js';
import { logger } from '../utils/logger.util.js';

let io = null;

export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = verifyAccessToken(token);
      if (!decoded) {
        return next(new Error('Invalid or expired token'));
      }

      const user = await User.findByPk(decoded.userId);
      if (!user || !user.is_active) {
        return next(new Error('User not authorized'));
      }

      socket.user = {
        id: user.id,
        company_id: user.company_id,
        role: user.role,
        name: user.name
      };

      next();
    } catch (error) {
      next(new Error('Socket authentication error: ' + error.message));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    logger.info(`🔌 Socket client connected: ${user.name} (${user.role}) - ID: ${socket.id}`);

    // Join company room for company-wide notifications
    const companyRoom = `company_${user.company_id}`;
    socket.join(companyRoom);

    // Event: trip:join (join trip room)
    const handleJoinTrip = (payload) => {
      const tripId = typeof payload === 'string' ? payload : payload?.trip_id;
      if (!tripId) return;

      const room1 = `trip:${tripId}`;
      const room2 = `trip_monitoring_${tripId}`;
      socket.join(room1);
      socket.join(room2);
      logger.info(`User ${user.name} joined trip rooms: ${room1}, ${room2}`);
      socket.emit('trip:joined', { trip_id: tripId, user_id: user.id });
    };

    socket.on('trip:join', handleJoinTrip);
    socket.on('trip:join_monitoring', handleJoinTrip);

    // Event: trip:leave (leave trip room)
    const handleLeaveTrip = (payload) => {
      const tripId = typeof payload === 'string' ? payload : payload?.trip_id;
      if (!tripId) return;

      const room1 = `trip:${tripId}`;
      const room2 = `trip_monitoring_${tripId}`;
      socket.leave(room1);
      socket.leave(room2);
      logger.info(`User ${user.name} left trip rooms: ${room1}, ${room2}`);
      socket.emit('trip:left', { trip_id: tripId, user_id: user.id });
    };

    socket.on('trip:leave', handleLeaveTrip);
    socket.on('trip:leave_monitoring', handleLeaveTrip);

    // Event: location:update & trip:location:update (Officer streams GPS)
    const handleLocationUpdate = async (data, callback) => {
      try {
        const {
          trip_id,
          latitude,
          longitude,
          speed,
          heading,
          accuracy,
          battery_level,
          recorded_at
        } = data || {};

        if (!trip_id || latitude === undefined || longitude === undefined) {
          if (typeof callback === 'function') {
            callback({ success: false, message: 'Invalid coordinates or trip_id' });
          }
          return;
        }

        // Verify Trip belongs to same company
        const trip = await Trip.findOne({
          where: { id: trip_id, company_id: user.company_id }
        });

        if (!trip) {
          socket.emit('error', { message: 'Trip not found or unauthorized' });
          if (typeof callback === 'function') {
            callback({ success: false, message: 'Trip not found or unauthorized' });
          }
          return;
        }

        // Persist GPS coordinate in DB
        const savedLocation = await TripLocation.create({
          company_id: user.company_id,
          trip_id,
          officer_id: user.id,
          latitude,
          longitude,
          speed: speed ?? null,
          heading: heading ?? null,
          accuracy: accuracy ?? null,
          battery_level: battery_level ?? null,
          recorded_at: recorded_at ? new Date(recorded_at) : new Date()
        });

        const broadcastPayload = {
          trip_id,
          user_id: user.id,
          officer: {
            id: user.id,
            name: user.name
          },
          location: savedLocation
        };

        // Broadcast to trip room and monitoring room
        io.to(`trip:${trip_id}`).emit('location:update', broadcastPayload);
        io.to(`trip_monitoring_${trip_id}`).emit('trip:location:broadcast', broadcastPayload);
        io.to(`trip_monitoring_${trip_id}`).emit('location:update', broadcastPayload);

        if (typeof callback === 'function') {
          callback({ success: true, data: savedLocation });
        }
      } catch (err) {
        logger.error('Error handling location:update: ' + err.message);
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    };

    socket.on('location:update', handleLocationUpdate);
    socket.on('trip:location:update', handleLocationUpdate);

    // Event: trip:status (broadcast status update)
    socket.on('trip:status', ({ trip_id, status }) => {
      if (!trip_id || !status) return;
      const payload = { trip_id, status, updated_at: new Date() };
      io.to(`trip:${trip_id}`).emit('trip:status', payload);
      io.to(`trip_monitoring_${trip_id}`).emit('trip:status', payload);
      io.to(companyRoom).emit('trip:status', payload);
    });

    socket.on('disconnect', () => {
      logger.info(`🔌 Socket client disconnected: ${user.name} (${socket.id})`);
    });
  });

  return io;
};

export const getIO = () => {
  return io;
};

/**
 * Helper to broadcast trip status changes to all relevant rooms
 */
export const broadcastTripStatus = (tripId, companyId, status, extraData = {}) => {
  if (!io) return;
  const payload = {
    trip_id: tripId,
    status,
    company_id: companyId,
    updated_at: new Date(),
    ...extraData
  };
  io.to(`trip:${tripId}`).emit('trip:status', payload);
  io.to(`trip_monitoring_${tripId}`).emit('trip:status', payload);
  io.to(`company_${companyId}`).emit('trip:status', payload);
};

/**
 * Helper to broadcast location updates from REST endpoint
 */
export const broadcastLocationUpdate = (tripId, companyId, locationRecord, officer) => {
  if (!io) return;
  const payload = {
    trip_id: tripId,
    user_id: officer?.id || locationRecord.officer_id,
    officer: {
      id: officer?.id || locationRecord.officer_id,
      name: officer?.name || 'Officer'
    },
    location: locationRecord
  };
  io.to(`trip:${tripId}`).emit('location:update', payload);
  io.to(`trip_monitoring_${tripId}`).emit('trip:location:broadcast', payload);
  io.to(`trip_monitoring_${tripId}`).emit('location:update', payload);
};

/**
 * Helper to broadcast expense status updates (CREATED, SUBMITTED, APPROVED, REJECTED)
 */
export const broadcastExpenseStatus = (companyId, expenseData) => {
  if (!io) return;
  const payload = {
    company_id: companyId,
    expense_id: expenseData.id,
    trip_id: expenseData.trip_id,
    status: expenseData.status,
    amount: parseFloat(expenseData.amount),
    category: expenseData.category,
    officer_id: expenseData.officer_id,
    updated_at: new Date()
  };

  io.to(`company_${companyId}`).emit('expense:status', payload);
  if (expenseData.trip_id) {
    io.to(`trip:${expenseData.trip_id}`).emit('expense:status', payload);
    io.to(`trip_monitoring_${expenseData.trip_id}`).emit('expense:status', payload);
  }
};

/**
 * Helper to broadcast wallet / trip balance mutations
 */
export const broadcastBalanceUpdate = (companyId, tripId, balanceData) => {
  if (!io) return;
  const payload = {
    company_id: companyId,
    trip_id: tripId,
    remaining_budget: parseFloat(balanceData.remaining_budget),
    total_spent: parseFloat(balanceData.total_spent || 0),
    updated_at: new Date()
  };

  io.to(`company_${companyId}`).emit('balance:update', payload);
  if (tripId) {
    io.to(`trip:${tripId}`).emit('balance:update', payload);
    io.to(`trip_monitoring_${tripId}`).emit('balance:update', payload);
  }
};

