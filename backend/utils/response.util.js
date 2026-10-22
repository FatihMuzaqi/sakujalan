export const successResponse = (res, {
  statusCode = 200,
  message = 'Success',
  data = null,
  meta = null
} = {}) => {
  const payload = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    data
  };

  if (meta) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
};

export const errorResponse = (res, {
  statusCode = 500,
  message = 'Internal Server Error',
  errors = null,
  errorCode = null,
  requestId = null
} = {}) => {
  const payload = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  if (errorCode) {
    payload.error_code = errorCode;
  }

  if (errors) {
    payload.errors = errors;
  }

  if (requestId) {
    payload.request_id = requestId;
  }

  return res.status(statusCode).json(payload);
};
