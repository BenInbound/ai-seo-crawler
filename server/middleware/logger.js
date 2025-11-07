/**
 * Request Logging Middleware
 * Logs HTTP requests with timing and user context
 */

/**
 * Generate unique request ID
 * @returns {string} Unique request identifier
 */
function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Request logger middleware
 * Logs incoming requests and response times
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
function requestLogger(req, res, next) {
  // Attach unique request ID
  req.id = generateRequestId();

  // Record start time
  const startTime = Date.now();

  // Get request details
  const requestDetails = {
    id: req.id,
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString()
  };

  // Log request (exclude sensitive routes like /auth/login)
  if (!isSensitiveRoute(req.path)) {
    console.log('→ Incoming Request:', JSON.stringify(requestDetails));
  } else {
    console.log('→ Incoming Request:', {
      id: req.id,
      method: req.method,
      path: req.path,
      ip: requestDetails.ip,
      timestamp: requestDetails.timestamp
    });
  }

  // Capture response
  const originalSend = res.send;
  res.send = function (data) {
    res.send = originalSend;

    const duration = Date.now() - startTime;
    const responseDetails = {
      id: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id || 'anonymous',
      organizationId: req.organizationId || null
    };

    // Log response with appropriate level
    if (res.statusCode >= 500) {
      console.error('← Response Error:', JSON.stringify(responseDetails));
    } else if (res.statusCode >= 400) {
      console.warn('← Response Warning:', JSON.stringify(responseDetails));
    } else {
      console.log('← Response Success:', JSON.stringify(responseDetails));
    }

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Check if route contains sensitive data
 * @param {string} path - Request path
 * @returns {boolean} True if route is sensitive
 */
function isSensitiveRoute(path) {
  const sensitivePatterns = [
    '/auth/login',
    '/auth/register',
    '/auth/password',
    '/auth/reset'
  ];

  return sensitivePatterns.some(pattern => path.includes(pattern));
}

/**
 * Performance logging middleware
 * Logs slow requests for optimization
 * @param {number} threshold - Threshold in milliseconds (default: 1000ms)
 * @returns {function} Express middleware function
 */
function performanceLogger(threshold = 1000) {
  return (req, res, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;

      if (duration > threshold) {
        console.warn('Slow Request Detected:', {
          id: req.id,
          method: req.method,
          path: req.path,
          duration: `${duration}ms`,
          threshold: `${threshold}ms`,
          userId: req.user?.id || 'anonymous'
        });
      }
    });

    next();
  };
}

/**
 * Error logging middleware
 * Logs errors with context
 * @param {Error} err - Error object
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
function errorLogger(err, req, res, next) {
  const errorDetails = {
    id: req.id,
    error: err.name || 'Error',
    message: err.message,
    method: req.method,
    path: req.path,
    statusCode: err.statusCode || 500,
    userId: req.user?.id || 'anonymous',
    timestamp: new Date().toISOString()
  };

  // Log with stack trace for server errors
  if (err.statusCode >= 500 || !err.statusCode) {
    console.error('Error Details:', JSON.stringify(errorDetails));
    console.error('Stack Trace:', err.stack);
  } else {
    console.warn('Client Error:', JSON.stringify(errorDetails));
  }

  next(err);
}

/**
 * Database query logger
 * Logs slow database queries
 * @param {string} operation - Database operation name
 * @param {number} duration - Query duration in milliseconds
 * @param {object} metadata - Additional metadata
 */
function logDatabaseQuery(operation, duration, metadata = {}) {
  const queryLog = {
    operation,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
    ...metadata
  };

  if (duration > 1000) {
    console.warn('Slow Database Query:', JSON.stringify(queryLog));
  } else if (process.env.LOG_LEVEL === 'debug') {
    console.log('Database Query:', JSON.stringify(queryLog));
  }
}

/**
 * Security event logger
 * Logs security-related events (failed auth, suspicious activity)
 * @param {string} event - Event type
 * @param {object} details - Event details
 * @param {object} req - Express request object (optional)
 */
function logSecurityEvent(event, details, req = null) {
  const securityLog = {
    event,
    timestamp: new Date().toISOString(),
    ...details,
    ...(req && {
      requestId: req.id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      path: req.path
    })
  };

  console.warn('Security Event:', JSON.stringify(securityLog));
}

/**
 * API usage logger
 * Tracks API endpoint usage statistics
 */
class ApiUsageTracker {
  constructor() {
    this.stats = new Map();
    this.interval = null;
  }

  track(endpoint, method, statusCode) {
    const key = `${method}:${endpoint}`;

    if (!this.stats.has(key)) {
      this.stats.set(key, {
        endpoint,
        method,
        totalRequests: 0,
        successCount: 0,
        errorCount: 0,
        avgResponseTime: 0
      });
    }

    const stat = this.stats.get(key);
    stat.totalRequests++;

    if (statusCode < 400) {
      stat.successCount++;
    } else {
      stat.errorCount++;
    }
  }

  getStats() {
    return Array.from(this.stats.values());
  }

  startPeriodicLogging(intervalMs = 60000) {
    this.interval = setInterval(() => {
      const stats = this.getStats();
      if (stats.length > 0) {
        console.log('API Usage Stats:', JSON.stringify(stats, null, 2));
      }
    }, intervalMs);
  }

  stopPeriodicLogging() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

// Global usage tracker instance
const usageTracker = new ApiUsageTracker();

/**
 * Usage tracking middleware
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
function trackUsage(req, res, next) {
  res.on('finish', () => {
    usageTracker.track(req.path, req.method, res.statusCode);
  });
  next();
}

module.exports = {
  requestLogger,
  performanceLogger,
  errorLogger,
  logDatabaseQuery,
  logSecurityEvent,
  trackUsage,
  usageTracker,
  generateRequestId
};
