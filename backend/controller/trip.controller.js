import * as tripService from '../services/trip.service.js';
import { successResponse } from '../utils/response.util.js';

export const createTrip = async (req, res, next) => {
  try {
    const result = await tripService.createTrip(req.user.company_id, req.user.id, req.body);
    return successResponse(res, {
      statusCode: 201,
      message: 'Trip created successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getTrips = async (req, res, next) => {
  try {
    const result = await tripService.getTrips(req.user.company_id, req.user, req.query);
    return successResponse(res, {
      message: 'Trips retrieved successfully',
      data: result.trips,
      meta: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

export const getTripById = async (req, res, next) => {
  try {
    const result = await tripService.getTripById(req.user.company_id, req.params.id, req.user);
    return successResponse(res, {
      message: 'Trip details retrieved',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const updateTrip = async (req, res, next) => {
  try {
    const result = await tripService.updateTrip(req.user.company_id, req.params.id, req.body);
    return successResponse(res, {
      message: 'Trip updated successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const assignOfficer = async (req, res, next) => {
  try {
    const officerId = req.body.officer_id;
    const result = await tripService.assignOfficerToTrip(req.user.company_id, req.params.id, officerId);
    return successResponse(res, {
      message: 'Officer assigned to trip successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const startTrip = async (req, res, next) => {
  try {
    const result = await tripService.startTrip(req.user.company_id, req.params.id, req.user);
    return successResponse(res, {
      message: 'Trip started successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const completeTrip = async (req, res, next) => {
  try {
    const result = await tripService.completeTrip(req.user.company_id, req.params.id, req.user);
    return successResponse(res, {
      message: 'Trip completed successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const updateTripStatus = async (req, res, next) => {
  try {
    const result = await tripService.transitionTripStatus(req.user.company_id, req.params.id, req.body.status, req.user);
    return successResponse(res, {
      message: 'Trip status updated successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTrip = async (req, res, next) => {
  try {
    const result = await tripService.deleteOrCancelTrip(req.user.company_id, req.params.id, req.user);
    return successResponse(res, {
      message: result.message || 'Trip deleted or cancelled successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getOfficerDashboard = async (req, res, next) => {
  try {
    const result = await tripService.getOfficerDashboard(req.user.company_id, req.user.id);
    return successResponse(res, {
      message: 'Officer dashboard data retrieved',
      data: result
    });
  } catch (error) {
    next(error);
  }
};
