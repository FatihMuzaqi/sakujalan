import { sequelize } from '../config/database.js';
import { successResponse } from '../utils/response.util.js';
import { ENV } from '../config/env.js';

export const getHealthStatus = async (req, res) => {
  let dbStatus = 'CONNECTED';
  let dbDialect = sequelize.getDialect();
  let dbLatencyMs = 0;

  try {
    const start = Date.now();
    await sequelize.authenticate();
    dbLatencyMs = Date.now() - start;
  } catch (error) {
    dbStatus = 'DISCONNECTED';
  }

  const isHealthy = dbStatus === 'CONNECTED';

  return successResponse(res, {
    statusCode: isHealthy ? 200 : 503,
    message: isHealthy ? 'TripEx SaaS Backend API is healthy and operational' : 'Degraded: Database connection unavailable',
    data: {
      status: isHealthy ? 'UP' : 'DEGRADED',
      uptime_seconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: ENV.NODE_ENV,
      version: '1.0.0',
      database: {
        status: dbStatus,
        dialect: dbDialect,
        latency_ms: dbLatencyMs
      },
      memory_usage: {
        rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heap_used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
      }
    }
  });
};
