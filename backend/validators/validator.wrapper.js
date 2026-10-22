import { errorResponse } from '../utils/response.util.js';

/**
 * Validate request body, query, or params against a Zod schema
 * @param {import('zod').ZodSchema} schema
 * @param {'body' | 'query' | 'params'} source
 */
export const validate = (schema, source = 'body') => {
  return async (req, res, next) => {
    try {
      const parsedData = await schema.parseAsync(req[source]);
      req[source] = parsedData;
      next();
    } catch (error) {
      if (error.errors) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));

        return errorResponse(res, {
          statusCode: 422,
          message: 'Input validation failed',
          errors: validationErrors,
          errorCode: 'VALIDATION_ERROR'
        });
      }

      return errorResponse(res, {
        statusCode: 400,
        message: 'Invalid request data',
        errorCode: 'BAD_REQUEST'
      });
    }
  };
};
