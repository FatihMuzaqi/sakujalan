import { TripLocation, Trip, User } from '../model/index.js';
import { TRIP_STATUS } from '../config/constants.js';

/**
 * Calculate Haversine distance in kilometers between two GPS coordinates
 */
export const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const logTripLocation = async (companyId, officerId, locationData) => {
  const trip = await Trip.findOne({
    where: {
      id: locationData.trip_id,
      company_id: companyId
    }
  });

  if (!trip) {
    const err = new Error('Trip not found in this company');
    err.statusCode = 404;
    throw err;
  }

  const effectiveUserId = locationData.user_id || officerId;

  const location = await TripLocation.create({
    company_id: companyId,
    trip_id: trip.id,
    officer_id: effectiveUserId,
    latitude: locationData.latitude,
    longitude: locationData.longitude,
    speed: locationData.speed ?? null,
    heading: locationData.heading ?? null,
    accuracy: locationData.accuracy ?? null,
    battery_level: locationData.battery_level ?? null,
    recorded_at: locationData.recorded_at ? new Date(locationData.recorded_at) : new Date()
  });

  return location;
};

export const batchLogTripLocations = async (companyId, officerId, { trip_id, locations }) => {
  const trip = await Trip.findOne({
    where: {
      id: trip_id,
      company_id: companyId
    }
  });

  if (!trip) {
    const err = new Error('Trip not found in this company');
    err.statusCode = 404;
    throw err;
  }

  const entries = locations.map(loc => ({
    company_id: companyId,
    trip_id: trip.id,
    officer_id: loc.user_id || officerId,
    latitude: loc.latitude,
    longitude: loc.longitude,
    speed: loc.speed ?? null,
    heading: loc.heading ?? null,
    accuracy: loc.accuracy ?? null,
    battery_level: loc.battery_level ?? null,
    recorded_at: loc.recorded_at ? new Date(loc.recorded_at) : new Date()
  }));

  const createdLocations = await TripLocation.bulkCreate(entries);
  return createdLocations;
};

export const getTripLocationHistory = async (companyId, tripId) => {
  const trip = await Trip.findOne({
    where: { id: tripId, company_id: companyId },
    include: [{ model: User, as: 'officer', attributes: ['id', 'name', 'email', 'phone'] }]
  });

  if (!trip) {
    const err = new Error('Trip not found');
    err.statusCode = 404;
    throw err;
  }

  const locations = await TripLocation.findAll({
    where: { trip_id: tripId, company_id: companyId },
    order: [['recorded_at', 'ASC']]
  });

  return {
    trip,
    locations
  };
};

export const getLatestTripLocation = async (companyId, tripId) => {
  const trip = await Trip.findOne({
    where: { id: tripId, company_id: companyId }
  });

  if (!trip) {
    const err = new Error('Trip not found');
    err.statusCode = 404;
    throw err;
  }

  return await TripLocation.findOne({
    where: { trip_id: tripId, company_id: companyId },
    order: [['recorded_at', 'DESC']]
  });
};

export const getTripLocationStats = async (companyId, tripId) => {
  const trip = await Trip.findOne({
    where: { id: tripId, company_id: companyId }
  });

  if (!trip) {
    const err = new Error('Trip not found');
    err.statusCode = 404;
    throw err;
  }

  const locations = await TripLocation.findAll({
    where: { trip_id: tripId, company_id: companyId },
    order: [['recorded_at', 'ASC']]
  });

  if (locations.length === 0) {
    return {
      trip_id: tripId,
      total_distance_km: 0,
      avg_speed_kmh: 0,
      max_speed_kmh: 0,
      duration_minutes: 0,
      points_count: 0,
      latest_location: null
    };
  }

  let totalDistance = 0;
  let maxSpeed = 0;
  let totalSpeed = 0;
  let speedCount = 0;

  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i];
    const speed = loc.speed ? parseFloat(loc.speed) : 0;
    if (speed > maxSpeed) maxSpeed = speed;
    if (loc.speed !== null && loc.speed !== undefined) {
      totalSpeed += speed;
      speedCount++;
    }

    if (i > 0) {
      const prev = locations[i - 1];
      const dist = calculateHaversineDistance(
        parseFloat(prev.latitude),
        parseFloat(prev.longitude),
        parseFloat(loc.latitude),
        parseFloat(loc.longitude)
      );
      totalDistance += dist;
    }
  }

  const firstTime = new Date(locations[0].recorded_at).getTime();
  const lastTime = new Date(locations[locations.length - 1].recorded_at).getTime();
  const durationMinutes = Math.round((lastTime - firstTime) / (1000 * 60));

  const avgSpeed = speedCount > 0 ? (totalSpeed / speedCount) : (durationMinutes > 0 ? (totalDistance / (durationMinutes / 60)) : 0);

  return {
    trip_id: tripId,
    total_distance_km: parseFloat(totalDistance.toFixed(2)),
    avg_speed_kmh: parseFloat(avgSpeed.toFixed(2)),
    max_speed_kmh: parseFloat(maxSpeed.toFixed(2)),
    duration_minutes: durationMinutes,
    points_count: locations.length,
    latest_location: locations[locations.length - 1]
  };
};
