/**
 * Organization Routes
 *
 * Implements organization and member management endpoints for User Story 1:
 * - GET /organizations - List user's organizations
 * - POST /organizations - Create new organization
 * - GET /organizations/:orgId - Get organization details
 * - PATCH /organizations/:orgId - Update organization
 * - GET /organizations/:orgId/members - List organization members
 * - POST /organizations/:orgId/members - Add member to organization
 *
 * Based on contracts/openapi.yaml specification
 */

const express = require('express');
const {
  createOrganization,
  getOrganizationsForUser,
  updateOrganization,
  getOrganizationWithStats,
  isUserMember
} = require('../../models/organization');
const {
  addMember,
  getOrganizationMembers,
  updateMemberRole,
  removeMember,
  getUserRole,
  canRemoveOrDowngrade,
  isValidRole
} = require('../../models/organization-member');
const { findUserByEmail } = require('../../models/user');

const router = express.Router();

/**
 * Middleware to extract and verify user from JWT
 * This should eventually be moved to a shared auth middleware
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7);
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) throw new Error('JWT_SECRET required');

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.sub || decoded.userId;
      next();
    } catch (jwtError) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'Invalid or expired token'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      details: error.message
    });
  }
}

/**
 * Middleware to check organization access
 */
async function requireOrgAccess(req, res, next) {
  try {
    const { orgId } = req.params;
    const isMember = await isUserMember(req.userId, orgId);

    if (!isMember) {
      return res.status(403).json({
        error: 'Forbidden',
        details: 'You do not have access to this organization'
      });
    }

    req.orgId = orgId;
    next();
  } catch (error) {
    console.error('Organization access check error:', error);
    return res.status(500).json({
      error: 'Access check failed',
      details: error.message
    });
  }
}

/**
 * Middleware to require specific role
 */
function requireRole(roles) {
  return async (req, res, next) => {
    try {
      const { orgId } = req.params;
      const userRole = await getUserRole(req.userId, orgId);

      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          error: 'Forbidden',
          details: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
        });
      }

      req.userRole = userRole;
      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({
        error: 'Role check failed',
        details: error.message
      });
    }
  };
}

/**
 * GET /organizations
 * List user's organizations
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const organizations = await getOrganizationsForUser(req.userId);

    res.status(200).json({
      data: organizations,
      pagination: {
        total: organizations.length,
        page: 1,
        limit: 100
      }
    });
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({
      error: 'Failed to get organizations',
      details: error.message
    });
  }
});

/**
 * POST /organizations
 * Create new organization
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, slug, billing_email } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'name is required'
      });
    }

    // Create organization
    const org = await createOrganization({
      name,
      slug,
      billing_email
    });

    // Add creator as admin
    await addMember({
      organization_id: org.id,
      user_id: req.userId,
      role: 'admin'
    });

    res.status(201).json(org);
  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({
      error: 'Failed to create organization',
      details: error.message
    });
  }
});

/**
 * GET /organizations/:orgId
 * Get organization details with stats
 */
router.get('/:orgId', requireAuth, requireOrgAccess, async (req, res) => {
  try {
    const org = await getOrganizationWithStats(req.orgId);

    if (!org) {
      return res.status(404).json({
        error: 'Organization not found'
      });
    }

    res.status(200).json(org);
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({
      error: 'Failed to get organization',
      details: error.message
    });
  }
});

/**
 * PATCH /organizations/:orgId
 * Update organization (admin only)
 */
router.patch('/:orgId', requireAuth, requireOrgAccess, requireRole('admin'), async (req, res) => {
  try {
    const { name, billing_email, settings } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (billing_email !== undefined) updates.billing_email = billing_email;
    if (settings !== undefined) updates.settings = settings;

    const org = await updateOrganization(req.orgId, updates);

    res.status(200).json(org);
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({
      error: 'Failed to update organization',
      details: error.message
    });
  }
});

/**
 * GET /organizations/:orgId/members
 * List organization members
 */
router.get('/:orgId/members', requireAuth, requireOrgAccess, async (req, res) => {
  try {
    const members = await getOrganizationMembers(req.orgId);

    res.status(200).json({
      data: members,
      total: members.length
    });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({
      error: 'Failed to get members',
      details: error.message
    });
  }
});

/**
 * POST /organizations/:orgId/members
 * Add member to organization (admin only)
 */
router.post(
  '/:orgId/members',
  requireAuth,
  requireOrgAccess,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { email, role } = req.body;

      if (!email || !role) {
        return res.status(400).json({
          error: 'Missing required fields',
          details: 'email and role are required'
        });
      }

      if (!isValidRole(role)) {
        return res.status(400).json({
          error: 'Invalid role',
          details: 'role must be one of: admin, editor, viewer'
        });
      }

      // Find user by email
      const user = await findUserByEmail(email);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          details: 'No user exists with this email address'
        });
      }

      // Check if already a member
      const existingMember = await isUserMember(user.id, req.orgId);
      if (existingMember) {
        return res.status(400).json({
          error: 'User is already a member',
          details: 'This user is already a member of the organization'
        });
      }

      // Add member
      const member = await addMember({
        organization_id: req.orgId,
        user_id: user.id,
        role,
        invited_by: req.userId
      });

      res.status(201).json(member);
    } catch (error) {
      console.error('Add member error:', error);
      res.status(500).json({
        error: 'Failed to add member',
        details: error.message
      });
    }
  }
);

/**
 * PATCH /organizations/:orgId/members/:userId
 * Update member role (admin only)
 */
router.patch(
  '/:orgId/members/:userId',
  requireAuth,
  requireOrgAccess,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!role) {
        return res.status(400).json({
          error: 'Missing required field',
          details: 'role is required'
        });
      }

      if (!isValidRole(role)) {
        return res.status(400).json({
          error: 'Invalid role',
          details: 'role must be one of: admin, editor, viewer'
        });
      }

      // Check if this would remove the last admin
      if (role !== 'admin') {
        const canDowngrade = await canRemoveOrDowngrade(req.orgId, userId);
        if (!canDowngrade) {
          return res.status(400).json({
            error: 'Cannot downgrade last admin',
            details: 'Organization must have at least one admin'
          });
        }
      }

      const member = await updateMemberRole(userId, req.orgId, role);

      res.status(200).json(member);
    } catch (error) {
      console.error('Update member role error:', error);
      res.status(500).json({
        error: 'Failed to update member role',
        details: error.message
      });
    }
  }
);

/**
 * DELETE /organizations/:orgId/members/:userId
 * Remove member from organization (admin only)
 */
router.delete(
  '/:orgId/members/:userId',
  requireAuth,
  requireOrgAccess,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { userId } = req.params;

      // Check if this would remove the last admin
      const canRemove = await canRemoveOrDowngrade(req.orgId, userId);
      if (!canRemove) {
        return res.status(400).json({
          error: 'Cannot remove last admin',
          details: 'Organization must have at least one admin'
        });
      }

      await removeMember(userId, req.orgId);

      res.status(204).send();
    } catch (error) {
      console.error('Remove member error:', error);
      res.status(500).json({
        error: 'Failed to remove member',
        details: error.message
      });
    }
  }
);

module.exports = router;
