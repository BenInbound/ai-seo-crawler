/**
 * Role-Based Access Control (RBAC) Middleware
 * Enforces organization-level permissions based on user roles
 */

const {
  getUserOrganizations,
  getUserRoleInOrganization,
  userBelongsToOrganization
} = require('./auth');

// Role hierarchy (higher index = more permissions)
const ROLE_HIERARCHY = ['viewer', 'editor', 'admin'];

// Role permissions
const ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer'
};

/**
 * Check if role has required permission level
 * @param {string} userRole - User's role
 * @param {string} requiredRole - Required role level
 * @returns {boolean} True if user has sufficient permissions
 */
function hasPermission(userRole, requiredRole) {
  if (!userRole || !requiredRole) {
    return false;
  }

  const userLevel = ROLE_HIERARCHY.indexOf(userRole.toLowerCase());
  const requiredLevel = ROLE_HIERARCHY.indexOf(requiredRole.toLowerCase());

  if (userLevel === -1 || requiredLevel === -1) {
    return false;
  }

  return userLevel >= requiredLevel;
}

/**
 * Require user to belong to organization
 * Organization ID should be in req.params.orgId or req.body.organizationId
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
function requireOrganizationMembership(req, res, next) {
  // Try to get organization ID from params or body
  const organizationId = req.params.orgId || req.body.organizationId;

  if (!organizationId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Organization ID is required'
    });
  }

  // Check if user belongs to organization
  if (!userBelongsToOrganization(req, organizationId)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied: You do not belong to this organization'
    });
  }

  // Attach organization context to request
  req.organizationId = organizationId;
  req.userRole = getUserRoleInOrganization(req, organizationId);

  next();
}

/**
 * Require specific role in organization
 * @param {string} requiredRole - Required role ('admin', 'editor', 'viewer')
 * @returns {function} Express middleware function
 */
function requireRole(requiredRole) {
  return (req, res, next) => {
    // Try to get organization ID from params or body
    const organizationId = req.params.orgId || req.body.organizationId || req.organizationId;

    if (!organizationId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Organization ID is required'
      });
    }

    // Check if user belongs to organization
    if (!userBelongsToOrganization(req, organizationId)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: You do not belong to this organization'
      });
    }

    // Get user's role in organization
    const userRole = getUserRoleInOrganization(req, organizationId);

    if (!userRole) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: Could not determine your role in this organization'
      });
    }

    // Check if user has required permission level
    if (!hasPermission(userRole, requiredRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied: ${requiredRole} role required`
      });
    }

    // Attach organization context to request
    req.organizationId = organizationId;
    req.userRole = userRole;

    next();
  };
}

/**
 * Require admin role
 * Shorthand for requireRole('admin')
 */
const requireAdmin = requireRole(ROLES.ADMIN);

/**
 * Require editor or admin role
 * Shorthand for requireRole('editor')
 */
const requireEditor = requireRole(ROLES.EDITOR);

/**
 * Require any role (just membership)
 * Shorthand for requireOrganizationMembership
 */
const requireViewer = requireOrganizationMembership;

/**
 * Check if user has role in any organization
 * @param {object} req - Express request object
 * @param {string} role - Role to check for
 * @returns {boolean} True if user has role in at least one organization
 */
function hasRoleInAnyOrganization(req, role) {
  const orgs = getUserOrganizations(req);
  return orgs.some(org => hasPermission(org.role, role));
}

/**
 * Validate project belongs to organization
 * Middleware to ensure project access is within organization context
 * Requires req.params.projectId and req.organizationId to be set
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
async function validateProjectAccess(req, res, next) {
  const { supabaseAdmin } = require('../services/database/supabase');

  const projectId = req.params.projectId || req.body.projectId;
  const organizationId = req.organizationId;

  if (!projectId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Project ID is required'
    });
  }

  if (!organizationId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Organization context is required'
    });
  }

  try {
    // Check if project belongs to organization
    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .select('id, organization_id')
      .eq('id', projectId)
      .single();

    if (error || !project) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Project not found'
      });
    }

    if (project.organization_id !== organizationId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Project does not belong to your organization'
      });
    }

    // Attach project to request
    req.projectId = projectId;

    next();
  } catch (error) {
    console.error('Project access validation error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to validate project access'
    });
  }
}

/**
 * Create permission checker for specific resource types
 * @param {string} resourceType - Type of resource ('project', 'crawl', 'page')
 * @returns {function} Middleware function
 */
function createResourcePermissionChecker(resourceType) {
  return async (req, res, next) => {
    // This is a placeholder for resource-specific permission checks
    // In a full implementation, this would check resource ownership
    // and user permissions for that specific resource type
    next();
  };
}

module.exports = {
  requireOrganizationMembership,
  requireRole,
  requireAdmin,
  requireEditor,
  requireViewer,
  hasPermission,
  hasRoleInAnyOrganization,
  validateProjectAccess,
  createResourcePermissionChecker,
  ROLES
};
