/**
 * Project Routes
 *
 * Implements project management endpoints for User Story 1:
 * - GET /organizations/:orgId/projects - List organization's projects
 * - POST /organizations/:orgId/projects - Create new project
 * - GET /projects/:projectId - Get project details
 * - PATCH /projects/:projectId - Update project
 * - DELETE /projects/:projectId - Delete project
 *
 * Based on contracts/openapi.yaml specification
 */

const express = require('express');
const {
  createProject,
  findProjectById,
  getOrganizationProjects,
  updateProject,
  deleteProject,
  getProjectWithStats,
  hasProjectAccess
} = require('../../models/project');
const { getMembership, getUserRole } = require('../../models/organization-member');

const router = express.Router();

/**
 * Middleware to extract and verify user from JWT
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
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.userId;
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
    const membership = await getMembership(req.userId, orgId);

    if (!membership) {
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
 * Middleware to check project access
 */
async function requireProjectAccess(req, res, next) {
  try {
    const { projectId } = req.params;
    const hasAccess = await hasProjectAccess(req.userId, projectId);

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Forbidden',
        details: 'You do not have access to this project'
      });
    }

    req.projectId = projectId;
    next();
  } catch (error) {
    console.error('Project access check error:', error);
    return res.status(500).json({
      error: 'Access check failed',
      details: error.message
    });
  }
}

/**
 * Middleware to require editor or admin role
 */
async function requireEditor(req, res, next) {
  try {
    const project = await findProjectById(req.projectId || req.params.projectId);
    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    const role = await getUserRole(req.userId, project.organization_id);
    if (!role || !['admin', 'editor'].includes(role)) {
      return res.status(403).json({
        error: 'Forbidden',
        details: 'This action requires editor or admin role'
      });
    }

    next();
  } catch (error) {
    console.error('Role check error:', error);
    return res.status(500).json({
      error: 'Role check failed',
      details: error.message
    });
  }
}

/**
 * GET /organizations/:orgId/projects
 * List organization's projects
 */
router.get('/organizations/:orgId/projects', requireAuth, requireOrgAccess, async (req, res) => {
  try {
    const { page = 1, limit = 20, orderBy = 'created_at', order = 'desc' } = req.query;

    const projects = await getOrganizationProjects(req.orgId, {
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      orderBy,
      ascending: order === 'asc'
    });

    res.status(200).json({
      data: projects,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: projects.length
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      error: 'Failed to get projects',
      details: error.message
    });
  }
});

/**
 * POST /organizations/:orgId/projects
 * Create new project (editor or admin only)
 */
router.post('/organizations/:orgId/projects', requireAuth, requireOrgAccess, async (req, res) => {
  try {
    // Check role
    const role = await getUserRole(req.userId, req.orgId);
    if (!role || !['admin', 'editor'].includes(role)) {
      return res.status(403).json({
        error: 'Forbidden',
        details: 'This action requires editor or admin role'
      });
    }

    const { name, target_url, description, config } = req.body;

    if (!name || !target_url) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'name and target_url are required'
      });
    }

    const project = await createProject({
      organization_id: req.orgId,
      name,
      target_url,
      description,
      config,
      created_by: req.userId
    });

    res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      error: 'Failed to create project',
      details: error.message
    });
  }
});

/**
 * GET /projects/:projectId
 * Get project details with stats
 */
router.get('/projects/:projectId', requireAuth, requireProjectAccess, async (req, res) => {
  try {
    const project = await getProjectWithStats(req.projectId);

    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    res.status(200).json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      error: 'Failed to get project',
      details: error.message
    });
  }
});

/**
 * PATCH /projects/:projectId
 * Update project (editor or admin only)
 */
router.patch(
  '/projects/:projectId',
  requireAuth,
  requireProjectAccess,
  requireEditor,
  async (req, res) => {
    try {
      const { name, target_url, description, config } = req.body;

      const updates = {};
      if (name !== undefined) updates.name = name;
      if (target_url !== undefined) updates.target_url = target_url;
      if (description !== undefined) updates.description = description;
      if (config !== undefined) updates.config = config;

      const project = await updateProject(req.projectId, updates);

      res.status(200).json(project);
    } catch (error) {
      console.error('Update project error:', error);
      res.status(500).json({
        error: 'Failed to update project',
        details: error.message
      });
    }
  }
);

/**
 * DELETE /projects/:projectId
 * Delete project (admin only)
 */
router.delete('/projects/:projectId', requireAuth, requireProjectAccess, async (req, res) => {
  try {
    const project = await findProjectById(req.projectId);
    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    // Check if user is admin
    const role = await getUserRole(req.userId, project.organization_id);
    if (role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        details: 'This action requires admin role'
      });
    }

    await deleteProject(req.projectId);

    res.status(204).send();
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      error: 'Failed to delete project',
      details: error.message
    });
  }
});

module.exports = router;
