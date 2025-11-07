/**
 * Session Management Service
 * JWT token generation and validation
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

// Validate JWT_SECRET exists
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Token types
const TOKEN_TYPE = {
  ACCESS: 'access',
  REFRESH: 'refresh'
};

/**
 * Generate JWT access token for authenticated user
 * @param {object} payload - Token payload
 * @param {string} payload.userId - User UUID
 * @param {string} payload.email - User email
 * @param {Array} payload.organizations - Array of {orgId, role} objects
 * @returns {string} JWT token
 */
function generateAccessToken(payload) {
  if (!payload.userId) {
    throw new Error('userId is required in token payload');
  }

  if (!payload.email) {
    throw new Error('email is required in token payload');
  }

  // Create token payload
  const tokenPayload = {
    sub: payload.userId, // Subject (user ID)
    email: payload.email,
    organizations: payload.organizations || [],
    type: TOKEN_TYPE.ACCESS,
    iat: Math.floor(Date.now() / 1000) // Issued at
  };

  // Generate token
  const token = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'aeo-platform',
    audience: 'aeo-platform-users'
  });

  return token;
}

/**
 * Generate refresh token (longer expiration)
 * @param {string} userId - User UUID
 * @returns {string} JWT refresh token
 */
function generateRefreshToken(userId) {
  if (!userId) {
    throw new Error('userId is required for refresh token');
  }

  const tokenPayload = {
    sub: userId,
    type: TOKEN_TYPE.REFRESH,
    iat: Math.floor(Date.now() / 1000)
  };

  // Refresh tokens last longer (30 days)
  const token = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: '30d',
    issuer: 'aeo-platform',
    audience: 'aeo-platform-users'
  });

  return token;
}

/**
 * Verify and decode JWT token
 * @param {string} token - JWT token to verify
 * @returns {object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
function verifyToken(token) {
  if (!token) {
    throw new Error('Token is required');
  }

  if (typeof token !== 'string') {
    throw new Error('Token must be a string');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'aeo-platform',
      audience: 'aeo-platform-users'
    });

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else if (error.name === 'NotBeforeError') {
      throw new Error('Token not yet valid');
    } else {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }
}

/**
 * Decode token without verification (useful for debugging)
 * WARNING: Do not use for authentication - always verify first
 * @param {string} token - JWT token to decode
 * @returns {object|null} Decoded token payload or null if invalid
 */
function decodeToken(token) {
  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.decode(token, { complete: true });
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Token or null if not found
 */
function extractTokenFromHeader(authHeader) {
  if (!authHeader) {
    return null;
  }

  // Expected format: "Bearer <token>"
  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Check if token is expired
 * @param {object} decodedToken - Decoded JWT payload
 * @returns {boolean} True if token is expired
 */
function isTokenExpired(decodedToken) {
  if (!decodedToken || !decodedToken.exp) {
    return true;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  return decodedToken.exp < currentTime;
}

/**
 * Get time until token expiration
 * @param {object} decodedToken - Decoded JWT payload
 * @returns {number} Seconds until expiration, or 0 if expired
 */
function getTokenTimeToExpiry(decodedToken) {
  if (!decodedToken || !decodedToken.exp) {
    return 0;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const timeRemaining = decodedToken.exp - currentTime;

  return Math.max(0, timeRemaining);
}

/**
 * Validate token payload structure
 * @param {object} decodedToken - Decoded JWT payload
 * @returns {object} Validation result with isValid and errors
 */
function validateTokenPayload(decodedToken) {
  const errors = [];

  if (!decodedToken) {
    errors.push('Token payload is empty');
    return { isValid: false, errors };
  }

  // Check required fields
  if (!decodedToken.sub) {
    errors.push('Token missing user ID (sub)');
  }

  if (!decodedToken.email && decodedToken.type === TOKEN_TYPE.ACCESS) {
    errors.push('Access token missing email');
  }

  if (!decodedToken.type) {
    errors.push('Token missing type');
  }

  if (!decodedToken.iat) {
    errors.push('Token missing issued at time (iat)');
  }

  if (!decodedToken.exp) {
    errors.push('Token missing expiration time (exp)');
  }

  // Check if token is expired
  if (decodedToken.exp && isTokenExpired(decodedToken)) {
    errors.push('Token has expired');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Create session data for response
 * @param {string} accessToken - Access token
 * @param {string} refreshToken - Refresh token (optional)
 * @param {object} user - User object
 * @returns {object} Session data
 */
function createSessionResponse(accessToken, refreshToken, user) {
  const decoded = jwt.decode(accessToken);

  return {
    token: accessToken,
    refreshToken: refreshToken || null,
    expiresIn: decoded.exp - decoded.iat,
    expiresAt: decoded.exp,
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  };
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  extractTokenFromHeader,
  isTokenExpired,
  getTokenTimeToExpiry,
  validateTokenPayload,
  createSessionResponse,
  TOKEN_TYPE
};
