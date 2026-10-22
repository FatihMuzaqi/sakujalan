import express from 'express';
import cors from 'cors';
import path from 'path';
import apiRouter from './route/index.js';
import { getHealthStatus } from './controller/health.controller.js';
import { errorHandler } from './middleware/error.middleware.js';
import { errorResponse } from './utils/response.util.js';
import { ENV } from './config/env.js';

const app = express();

// Enable Cross-Origin Resource Sharing
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Callback-Signature']
}));

// Body parsing middlewares
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static file serving for uploaded receipts and avatars
app.use('/uploads', express.static(path.join(process.cwd(), ENV.UPLOAD_DIR)));

// Root & Versioned Health Check Endpoints
app.get('/health', getHealthStatus);
app.get('/api/v1/health', getHealthStatus);

// Mount API v1 routes
app.use('/api/v1', apiRouter);

// 404 Handler for undefined routes
app.use((req, res) => {
  return errorResponse(res, {
    statusCode: 404,
    message: `Cannot ${req.method} ${req.originalUrl} - Endpoint not found`,
    errorCode: 'ROUTE_NOT_FOUND'
  });
});

// Centralized Global Error Handler
app.use(errorHandler);

export default app;
