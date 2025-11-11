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
  getAllProjects,
  updateProject,
  deleteProject,
  getProjectWithStats,
  hasProjectAccess
} = require('../../models/project');
const { getMembership, getUserRole } = require('../../models/organization-member');
const { supabaseAdmin } = require('../../services/database/supabase');

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
 * GET /projects
 * List all projects across all organizations (shared view)
 * All authenticated users can see all projects
 */
router.get('/projects', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 100, orderBy = 'created_at', order = 'desc' } = req.query;

    const projects = await getAllProjects({
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
    console.error('Get all projects error:', error);
    res.status(500).json({
      error: 'Failed to get projects',
      details: error.message
    });
  }
});

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
 * Create new project (all authenticated users)
 */
router.post('/organizations/:orgId/projects', requireAuth, requireOrgAccess, async (req, res) => {
  try {
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
 * Get project details with stats (all authenticated users)
 */
router.get('/projects/:projectId', requireAuth, async (req, res) => {
  const { projectId } = req.params;
  try {
    const project = await getProjectWithStats(projectId);

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
 * Update project (all authenticated users)
 */
router.patch(
  '/projects/:projectId',
  requireAuth,
  async (req, res) => {
    const { projectId } = req.params;
    try {
      const { name, target_url, description, config } = req.body;

      const updates = {};
      if (name !== undefined) updates.name = name;
      if (target_url !== undefined) updates.target_url = target_url;
      if (description !== undefined) updates.description = description;
      if (config !== undefined) updates.config = config;

      const project = await updateProject(projectId, updates);

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
 * Delete project (all authenticated users with project access)
 */
router.delete('/projects/:projectId', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await findProjectById(projectId);

    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    // Check if user has project access
    const hasAccess = await hasProjectAccess(req.userId, projectId);

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Forbidden',
        details: 'You do not have access to this project'
      });
    }

    // Delete the project using admin client to bypass RLS
    const { error: deleteError } = await supabaseAdmin
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (deleteError) {
      throw new Error(`Failed to delete project: ${deleteError.message}`);
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      error: 'Failed to delete project',
      details: error.message
    });
  }
});

/**
 * GET /projects/:projectId/pages
 * List pages in a project with scores and filtering (all authenticated users)
 *
 * Query parameters:
 * - minScore: Minimum overall score (0-100)
 * - maxScore: Maximum overall score (0-100)
 * - pageType: Filter by page type (homepage, product, solution, blog, resource, conversion)
 * - limit: Number of results per page (default 50)
 * - offset: Pagination offset (default 0)
 * - orderBy: Sort field (score, url, type, date) - default 'score'
 * - order: Sort order (asc, desc) - default 'desc'
 *
 * For User Story 3: Page scoring with filtering
 */
router.get('/projects/:projectId/pages', requireAuth, async (req, res) => {
  const { projectId } = req.params;
  try {
    const PageModel = require('../../models/page');
    const PageScoreModel = require('../../models/score');

    const {
      minScore,
      maxScore,
      pageType,
      limit = 50,
      offset = 0,
      orderBy = 'score',
      order = 'desc'
    } = req.query;

    // Build filter options
    const options = {
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    };

    if (minScore !== undefined) {
      options.minScore = parseInt(minScore, 10);
    }

    if (maxScore !== undefined) {
      options.maxScore = parseInt(maxScore, 10);
    }

    if (pageType) {
      options.pageType = pageType;
    }

    // Get pages with scores
    const pages = await PageModel.listByProject(projectId, options);

    // For each page, get its current score if available
    const pagesWithScores = await Promise.all(
      pages.map(async page => {
        if (page.current_score_id) {
          const score = await PageScoreModel.getById(page.current_score_id);
          return {
            id: page.id,
            url: page.url,
            page_type: page.page_type,
            first_discovered_at: page.first_discovered_at,
            last_crawled_at: page.last_crawled_at,
            overall_score: score?.overall_score || null,
            scored_at: score?.scored_at || null,
            rubric_version: score?.rubric_version || null,
            criteria_scores: score?.criteria_scores || {},
            criteria_explanations: score?.criteria_explanations || {},
            ai_recommendations: score?.ai_recommendations || []
          };
        }
        return {
          id: page.id,
          url: page.url,
          page_type: page.page_type,
          first_discovered_at: page.first_discovered_at,
          last_crawled_at: page.last_crawled_at,
          overall_score: null,
          scored_at: null
        };
      })
    );

    // Apply filtering
    let filteredPages = pagesWithScores;

    if (minScore !== undefined) {
      filteredPages = filteredPages.filter(
        p => p.overall_score !== null && p.overall_score >= parseInt(minScore, 10)
      );
    }

    if (maxScore !== undefined) {
      filteredPages = filteredPages.filter(
        p => p.overall_score !== null && p.overall_score <= parseInt(maxScore, 10)
      );
    }

    if (pageType) {
      filteredPages = filteredPages.filter(p => p.page_type === pageType);
    }

    // Apply sorting
    filteredPages.sort((a, b) => {
      let aVal, bVal;

      switch (orderBy) {
        case 'score':
          aVal = a.overall_score || 0;
          bVal = b.overall_score || 0;
          break;
        case 'url':
          aVal = a.url || '';
          bVal = b.url || '';
          break;
        case 'type':
          aVal = a.page_type || '';
          bVal = b.page_type || '';
          break;
        case 'date':
          aVal = new Date(a.scored_at || 0);
          bVal = new Date(b.scored_at || 0);
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });

    res.status(200).json({
      projectId: projectId,
      pages: filteredPages,
      pagination: {
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        total: filteredPages.length
      },
      filters: {
        minScore: minScore ? parseInt(minScore, 10) : null,
        maxScore: maxScore ? parseInt(maxScore, 10) : null,
        pageType: pageType || null
      }
    });
  } catch (error) {
    console.error('Get project pages error:', error);
    res.status(500).json({
      error: 'Failed to get project pages',
      details: error.message
    });
  }
});

/**
 * GET /pages/:pageId
 * Get single page details with score (all authenticated users)
 *
 * For User Story 3: Page detail view
 */
router.get('/pages/:pageId', requireAuth, async (req, res) => {
  try {
    const PageModel = require('../../models/page');
    const PageScoreModel = require('../../models/score');
    const { pageId } = req.params;

    // Get page
    const page = await PageModel.getById(pageId);

    if (!page) {
      return res.status(404).json({
        error: 'Not Found',
        details: 'Page not found'
      });
    }

    // Get current score if available
    let scoreData = null;
    if (page.current_score_id) {
      scoreData = await PageScoreModel.getById(page.current_score_id);
    }

    res.status(200).json({
      id: page.id,
      url: page.url,
      page_type: page.page_type,
      project_id: page.project_id,
      first_discovered_at: page.first_discovered_at,
      last_crawled_at: page.last_crawled_at,
      overall_score: scoreData?.overall_score || null,
      scored_at: scoreData?.scored_at || null,
      rubric_version: scoreData?.rubric_version || null,
      criteria_scores: scoreData?.criteria_scores || {},
      criteria_explanations: scoreData?.criteria_explanations || {},
      ai_recommendations: scoreData?.ai_recommendations || [],
      ai_tokens_used: scoreData?.ai_tokens_used || 0,
      ai_cache_key: scoreData?.ai_cache_key || null,
      snapshot_id: scoreData?.snapshot_id || null
    });
  } catch (error) {
    console.error('Get page error:', error);
    res.status(500).json({
      error: 'Failed to get page',
      details: error.message
    });
  }
});

/**
 * PATCH /api/pages/:pageId
 *
 * Update page details (all authenticated users)
 */
router.patch('/pages/:pageId', requireAuth, async (req, res) => {
  try {
    const PageModel = require('../../models/page');
    const { pageId } = req.params;
    const { page_type } = req.body;

    // Get page
    const page = await PageModel.getById(pageId);

    if (!page) {
      return res.status(404).json({
        error: 'Not Found',
        details: 'Page not found'
      });
    }

    // Validate page type if provided
    const validPageTypes = ['homepage', 'product', 'solution', 'blog', 'resource', 'conversion'];
    if (page_type && !validPageTypes.includes(page_type)) {
      return res.status(400).json({
        error: 'Invalid page type',
        details: `page_type must be one of: ${validPageTypes.join(', ')}`
      });
    }

    // Update page
    const updates = {};
    if (page_type) {
      updates.page_type = page_type;
    }

    await PageModel.update(pageId, updates);

    // Get updated page
    const updatedPage = await PageModel.getById(pageId);

    res.status(200).json({
      id: updatedPage.id,
      url: updatedPage.url,
      page_type: updatedPage.page_type,
      message: 'Page updated successfully'
    });
  } catch (error) {
    console.error('Update page error:', error);
    res.status(500).json({
      error: 'Failed to update page',
      details: error.message
    });
  }
});

module.exports = router;
