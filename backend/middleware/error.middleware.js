import { errorResponse } from '../utils/response.util.js';
import { logger } from '../utils/logger.util.js';
import { ENV } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  logger.error(`[ERROR] ${req.method} ${req.originalUrl}: ${err.message}`, err);

  // 1. Sequelize Unique Constraint Error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const fieldErrors = (err.errors || []).map(e => ({
      field: e.path,
      message: `${e.path} already exists`
    }));
    return errorResponse(res, {
      statusCode: 409,
      message: 'Resource with this unique identifier already exists',
      errors: fieldErrors,
      errorCode: 'DUPLICATE_RESOURCE'
    });
  }

  // 2. Sequelize Validation Error
  if (err.name === 'SequelizeValidationError') {
    const fieldErrors = (err.errors || []).map(e => ({
      field: e.path,
      message: e.message
    }));
    return errorResponse(res, {
      statusCode: 422,
      message: 'Validation failed',
      errors: fieldErrors,
      errorCode: 'VALIDATION_ERROR'
    });
  }

  // 3. Database Connection Error (Never leak DB host, user or credentials)
  if (err.name === 'SequelizeConnectionError' || err.name === 'SequelizeConnectionRefusedError') {
    return errorResponse(res, {
      statusCode: 503,
      message: 'Database service is currently unavailable. Please try again later.',
      errorCode: 'DATABASE_UNAVAILABLE'
    });
  }

  // 4. JSON Body Parser Syntax Error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return errorResponse(res, {
      statusCode: 400,
      message: 'Malformed JSON payload in request body',
      errorCode: 'INVALID_JSON'
    });
  }

  // 5. Multer Upload Errors & File Filter Rejections
  if (err.name === 'MulterError' || err.errorCode === 'INVALID_FILE_TYPE' || (err.message && err.message.includes('Invalid file type'))) {
    return errorResponse(res, {
      statusCode: 400,
      message: err.message.startsWith('File upload error') ? err.message : `File upload error: ${err.message}`,
      errorCode: err.errorCode || 'UPLOAD_ERROR'
    });
  }

  // 6. JWT Errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return errorResponse(res, {
      statusCode: 401,
      message: 'Authentication token is invalid or expired',
      errorCode: 'TOKEN_INVALID'
    });
  }

  // 7. Generic / Internal Server Error Sanitization
  const statusCode = err.statusCode || 500;
  let clientMessage = err.message || 'An unexpected error occurred';

  // Security: In production or for 500 internal errors, do not leak stack traces or internal filesystem paths
  if (statusCode === 500 && ENV.NODE_ENV === 'production') {
    clientMessage = 'An internal server error occurred. Please contact system support.';
  } else if (clientMessage.includes('C:\\') || clientMessage.includes('/home/') || clientMessage.includes('/var/')) {
    // Strip filesystem paths from messages
    clientMessage = 'An internal file processing error occurred';
  }

  return errorResponse(res, {
    statusCode,
    message: clientMessage,
    errorCode: err.errorCode || (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST')
  });
};
