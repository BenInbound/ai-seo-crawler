/**
 * Authentication Routes
 *
 * Implements authentication endpoints for User Story 1:
 * - POST /auth/register - Create new user account
 * - POST /auth/login - Authenticate and get JWT token
 * - GET /auth/me - Get current user info
 *
 * Based on contracts/openapi.yaml specification
 */

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {
  createUser,
  findUserByEmail,
  sanitizeUser,
  getUserOrganizations
} = require('../../models/user');
const { createOrganization } = require('../../models/organization');
const { addMember } = require('../../models/organization-member');

const router = express.Router();

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // 7 days
const JWT_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60;

/**
 * POST /auth/register
 * Create new user account
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'email, password, and name are required'
      });
    }

    // Email domain restriction for internal use
    const allowedDomain = '@inbound.no';
    if (!email.toLowerCase().endsWith(allowedDomain)) {
      return res.status(403).json({
        error: 'Invalid email domain',
        details: `Registration is currently restricted to ${allowedDomain} email addresses`
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password too short',
        details: 'Password must be at least 8 characters'
      });
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        error: 'Email already exists',
        details: 'An account with this email address already exists'
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const user = await createUser({
      email,
      password_hash,
      name
    });

    // Create default personal organization for the user
    try {
      const orgName = `${name}'s Organization`;
      const org = await createOrganization({
        name: orgName,
        billing_email: email
      });

      // Add user as admin of their organization
      await addMember({
        organization_id: org.id,
        user_id: user.id,
        role: 'admin'
      });
    } catch (orgError) {
      // Log but don't fail registration if org creation fails
      console.error('Failed to create default organization:', orgError);
    }

    // Generate JWT token for automatic login
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Return sanitized user with token (automatic login after registration)
    const sanitized = sanitizeUser(user);

    res.status(201).json({
      token,
      expiresIn: JWT_EXPIRES_IN_SECONDS,
      user: {
        id: sanitized.id,
        email: sanitized.email,
        name: sanitized.name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      details: error.message
    });
  }
});

/**
 * POST /auth/login
 * Authenticate and get JWT token
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'email and password are required'
      });
    }

    // Find user
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        details: 'Email or password is incorrect'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid credentials',
        details: 'Email or password is incorrect'
      });
    }

    // Update last login timestamp
    const { updateLastLogin } = require('../../models/user');
    await updateLastLogin(user.id);

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Return token and sanitized user info
    const sanitized = sanitizeUser(user);

    res.status(200).json({
      token,
      expiresIn: JWT_EXPIRES_IN_SECONDS,
      user: {
        id: sanitized.id,
        email: sanitized.email,
        name: sanitized.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      details: error.message
    });
  }
});

/**
 * GET /auth/me
 * Get current user info with organizations
 */
router.get('/me', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'Invalid or expired token'
      });
    }

    // Get user with organizations
    const { findUserById } = require('../../models/user');
    const user = await findUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'User not found'
      });
    }

    // Get user's organizations with roles
    const organizations = await getUserOrganizations(user.id);

    // Return user info with organizations
    const sanitized = sanitizeUser(user);

    res.status(200).json({
      id: sanitized.id,
      email: sanitized.email,
      name: sanitized.name,
      organizations: organizations.map(org => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        role: org.role
      }))
    });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({
      error: 'Failed to get user info',
      details: error.message
    });
  }
});

module.exports = router;
