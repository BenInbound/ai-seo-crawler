/**
 * Error Handling Middleware
 * Centralized error handling with proper logging and user-friendly responses
 */

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // Distinguish operational errors from programming errors
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Create common API errors
 */
const createError = {
  badRequest: (message, details = null) => new ApiError(400, message, details),
  unauthorized: (message = 'Unauthorized') => new ApiError(401, message),
  forbidden: (message = 'Forbidden') => new ApiError(403, message),
  notFound: (message = 'Resource not found') => new ApiError(404, message),
  conflict: (message, details = null) => new ApiError(409, message, details),
  unprocessable: (message, details = null) => new ApiError(422, message, details),
  tooManyRequests: (message = 'Too many requests') => new ApiError(429, message),
  internal: (message = 'Internal server error') => new ApiError(500, message)
};

/**
 * Error handler middleware
 * @param {Error} err - Error object
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
function errorHandler(err, req, res, next) {
  // Default to 500 server error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || null;

  // Log error details
  const errorLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    statusCode,
    message,
    userId: req.user?.id || 'anonymous',
    ip: req.ip
  };

  // Log stack trace for server errors
  if (statusCode >= 500) {
    console.error('Server Error:', errorLog);
    console.error('Stack trace:', err.stack);
  } else {
    console.warn('Client Error:', errorLog);
  }

  // Don't expose internal errors in production
  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    message = 'An unexpected error occurred';
    details = null;
  }

  // Send error response
  const response = {
    error: getErrorName(statusCode),
    message,
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && statusCode >= 500 && { stack: err.stack })
  };

  res.status(statusCode).json(response);
}

/**
 * Get error name from status code
 * @param {number} statusCode - HTTP status code
 * @returns {string} Error name
 */
function getErrorName(statusCode) {
  const errorNames = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable'
  };

  return errorNames[statusCode] || 'Error';
}

/**
 * Async handler wrapper to catch errors in async route handlers
 * @param {function} fn - Async function to wrap
 * @returns {function} Express middleware function
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Handle 404 errors
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    path: req.path
  });
}

/**
 * Validation error formatter
 * Formats validation errors from express-validator or similar
 * @param {Array} errors - Array of validation errors
 * @returns {ApiError} Formatted validation error
 */
function formatValidationErrors(errors) {
  const formattedErrors = errors.map(err => ({
    field: err.param || err.path,
    message: err.msg || err.message,
    value: err.value
  }));

  return new ApiError(422, 'Validation failed', formattedErrors);
}

/**
 * Database error handler
 * Converts database errors to user-friendly messages
 * @param {Error} error - Database error
 * @returns {ApiError} Formatted error
 */
function handleDatabaseError(error) {
  // Supabase/PostgreSQL error codes
  if (error.code === '23505') {
    return new ApiError(409, 'Resource already exists', {
      constraint: error.constraint
    });
  }

  if (error.code === '23503') {
    return new ApiError(400, 'Referenced resource not found', {
      constraint: error.constraint
    });
  }

  if (error.code === '23502') {
    return new ApiError(400, 'Required field is missing', {
      column: error.column
    });
  }

  // Foreign key violation
  if (error.code === '23514') {
    return new ApiError(400, 'Invalid value for field', {
      constraint: error.constraint
    });
  }

  // Default database error
  return new ApiError(500, 'Database operation failed');
}

/**
 * JWT error handler
 * @param {Error} error - JWT error
 * @returns {ApiError} Formatted error
 */
function handleJWTError(error) {
  if (error.name === 'TokenExpiredError') {
    return new ApiError(401, 'Token has expired');
  }

  if (error.name === 'JsonWebTokenError') {
    return new ApiError(401, 'Invalid token');
  }

  if (error.name === 'NotBeforeError') {
    return new ApiError(401, 'Token not yet valid');
  }

  return new ApiError(401, 'Authentication failed');
}

module.exports = {
  ApiError,
  createError,
  errorHandler,
  asyncHandler,
  notFoundHandler,
  formatValidationErrors,
  handleDatabaseError,
  handleJWTError
};
