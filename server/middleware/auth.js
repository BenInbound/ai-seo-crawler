/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user context to requests
 */

const {
  verifyToken,
  extractTokenFromHeader,
  validateTokenPayload
} = require('../services/auth/session');
const { supabaseAdmin } = require('../services/database/supabase');

/**
 * Authenticate request using JWT token
 * Extracts token from Authorization header, verifies it, and attaches user to request
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
async function authenticate(req, res, next) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No authentication token provided'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: error.message
      });
    }

    // Validate token payload
    const validation = validateTokenPayload(decoded);
    if (!validation.isValid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token payload',
        details: validation.errors
      });
    }

    // Fetch user from database to ensure they still exist
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, preferences, is_admin')
      .eq('id', decoded.sub)
      .single();

    if (userError || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found or has been deleted'
      });
    }

    // Attach user and token data to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      preferences: user.preferences,
      is_admin: user.is_admin || false,
      organizations: decoded.organizations || []
    };
    req.token = decoded;

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is present and valid, but doesn't require authentication
 * Useful for endpoints that behave differently when authenticated
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
async function optionalAuthenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      // No token provided, continue without user context
      req.user = null;
      req.token = null;
      return next();
    }

    // Try to verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      // Invalid token, continue without user context
      req.user = null;
      req.token = null;
      return next();
    }

    // Validate token payload
    const validation = validateTokenPayload(decoded);
    if (!validation.isValid) {
      req.user = null;
      req.token = null;
      return next();
    }

    // Fetch user from database
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, preferences, is_admin')
      .eq('id', decoded.sub)
      .single();

    if (userError || !user) {
      req.user = null;
      req.token = null;
      return next();
    }

    // Attach user and token data to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      preferences: user.preferences,
      is_admin: user.is_admin || false,
      organizations: decoded.organizations || []
    };
    req.token = decoded;

    next();
  } catch (error) {
    console.error('Optional authentication middleware error:', error);
    // On error, continue without user context
    req.user = null;
    req.token = null;
    next();
  }
}

/**
 * Check if user is authenticated
 * Helper function for use in route handlers
 * @param {object} req - Express request object
 * @returns {boolean} True if user is authenticated
 */
function isAuthenticated(req) {
  return req.user && req.user.id;
}

/**
 * Require authentication for a route
 * Returns 401 if not authenticated
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
function requireAuth(req, res, next) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }
  next();
}

/**
 * Get user's organizations from request
 * @param {object} req - Express request object
 * @returns {Array} Array of {orgId, role} objects
 */
function getUserOrganizations(req) {
  if (!req.user || !req.user.organizations) {
    return [];
  }
  return req.user.organizations;
}

/**
 * Check if user belongs to organization
 * @param {object} req - Express request object
 * @param {string} organizationId - Organization UUID
 * @returns {boolean} True if user belongs to organization
 */
function userBelongsToOrganization(req, organizationId) {
  const orgs = getUserOrganizations(req);
  return orgs.some(org => org.orgId === organizationId);
}

/**
 * Get user's role in organization
 * @param {object} req - Express request object
 * @param {string} organizationId - Organization UUID
 * @returns {string|null} Role ('admin', 'editor', 'viewer') or null
 */
function getUserRoleInOrganization(req, organizationId) {
  const orgs = getUserOrganizations(req);
  const membership = orgs.find(org => org.orgId === organizationId);
  return membership ? membership.role : null;
}

/**
 * Check if user is admin in any organization
 * @param {object} req - Express request object
 * @returns {boolean} True if user is admin in any organization
 */
function isOrgAdmin(req) {
  const orgs = getUserOrganizations(req);
  return orgs.some(org => org.role === 'admin');
}

/**
 * Check if user is platform admin
 * @param {object} req - Express request object
 * @returns {boolean} True if user is platform admin
 */
function isPlatformAdmin(req) {
  return req.user && req.user.is_admin === true;
}

/**
 * Require platform admin role for a route
 * Returns 403 if user is not a platform admin
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
function requireAdmin(req, res, next) {
  if (!isPlatformAdmin(req)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Platform admin role required'
    });
  }
  next();
}

module.exports = {
  authenticate,
  optionalAuthenticate,
  isAuthenticated,
  requireAuth,
  getUserOrganizations,
  userBelongsToOrganization,
  getUserRoleInOrganization,
  isOrgAdmin,
  isPlatformAdmin,
  requireAdmin
};
