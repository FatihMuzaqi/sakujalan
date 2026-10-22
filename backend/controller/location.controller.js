import * as locationService from '../services/location.service.js';
import { broadcastLocationUpdate } from '../services/socket.service.js';
import { successResponse } from '../utils/response.util.js';

export const logLocation = async (req, res, next) => {
  try {
    const location = await locationService.logTripLocation(
      req.user.company_id,
      req.user.id,
      req.body
    );

    // Broadcast location to active socket rooms
    broadcastLocationUpdate(location.trip_id, req.user.company_id, location, req.user);

    return successResponse(res, {
      statusCode: 201,
      message: 'Location recorded',
      data: location
    });
  } catch (error) {
    next(error);
  }
};

export const batchLogLocations = async (req, res, next) => {
  try {
    const locations = await locationService.batchLogTripLocations(
      req.user.company_id,
      req.user.id,
      req.body
    );

    if (locations.length > 0) {
      const lastLoc = locations[locations.length - 1];
      broadcastLocationUpdate(lastLoc.trip_id, req.user.company_id, lastLoc, req.user);
    }

    return successResponse(res, {
      statusCode: 201,
      message: `${locations.length} locations recorded`,
      data: locations
    });
  } catch (error) {
    next(error);
  }
};

export const getTripLocations = async (req, res, next) => {
  try {
    const result = await locationService.getTripLocationHistory(
      req.user.company_id,
      req.params.trip_id
    );
    return successResponse(res, {
      message: 'Trip location history retrieved',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getLatestLocation = async (req, res, next) => {
  try {
    const location = await locationService.getLatestTripLocation(
      req.user.company_id,
      req.params.trip_id
    );
    return successResponse(res, {
      message: 'Latest trip location retrieved',
      data: location
    });
  } catch (error) {
    next(error);
  }
};

export const getTripStats = async (req, res, next) => {
  try {
    const stats = await locationService.getTripLocationStats(
      req.user.company_id,
      req.params.trip_id
    );
    return successResponse(res, {
      message: 'Trip location statistics retrieved',
      data: stats
    });
  } catch (error) {
    next(error);
  }
};
