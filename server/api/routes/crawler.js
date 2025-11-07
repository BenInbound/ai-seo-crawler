/**
 * Crawler Routes
 *
 * Implements crawl management endpoints for User Story 2:
 * - POST /projects/:projectId/crawls - Start new crawl
 * - GET /projects/:projectId/crawls - List project's crawl runs
 * - GET /crawls/:crawlId - Get crawl status
 * - POST /crawls/:crawlId/pause - Pause crawl
 * - POST /crawls/:crawlId/resume - Resume crawl
 *
 * Based on contracts/openapi.yaml specification
 */

const express = require('express');
const CrawlRunModel = require('../../models/crawl-run');
const ProjectModel = require('../../models/project');
const { hasProjectAccess } = require('../../models/project');
const { getUserRole } = require('../../models/organization-member');
const { addCrawlJob } = require('../../services/jobs/queue');

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
        message: 'Missing or invalid authorization header'
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
        message: 'Invalid or expired token'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      message: error.message
    });
  }
}

/**
 * Middleware to check project access
 */
async function requireProjectAccess(req, res, next) {
  try {
    const projectId = req.params.projectId || req.project?.id;

    if (!projectId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Project ID is required'
      });
    }

    const hasAccess = await hasProjectAccess(req.userId, projectId);

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this project'
      });
    }

    // Load project for later use
    const project = await ProjectModel.findById(projectId);
    if (!project) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Project not found'
      });
    }

    req.project = project;
    req.projectId = projectId;
    next();
  } catch (error) {
    console.error('Project access check error:', error);
    return res.status(500).json({
      error: 'Access check failed',
      message: error.message
    });
  }
}

/**
 * Middleware to check crawl access (via project)
 */
async function requireCrawlAccess(req, res, next) {
  try {
    const { crawlId } = req.params;

    if (!crawlId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Crawl ID is required'
      });
    }

    // Get crawl run
    const crawlRun = await CrawlRunModel.getById(crawlId);

    if (!crawlRun) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Crawl run not found'
      });
    }

    // Check project access
    const hasAccess = await hasProjectAccess(req.userId, crawlRun.project_id);

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this crawl run'
      });
    }

    req.crawlRun = crawlRun;
    req.projectId = crawlRun.project_id;
    next();
  } catch (error) {
    console.error('Crawl access check error:', error);
    return res.status(500).json({
      error: 'Access check failed',
      message: error.message
    });
  }
}

/**
 * Middleware to check editor or admin role
 */
async function requireEditorRole(req, res, next) {
  try {
    const project = req.project;
    const role = await getUserRole(req.userId, project.organization_id);

    if (role !== 'admin' && role !== 'editor') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only editors and admins can start crawls'
      });
    }

    next();
  } catch (error) {
    console.error('Role check error:', error);
    return res.status(500).json({
      error: 'Role check failed',
      message: error.message
    });
  }
}

/**
 * POST /projects/:projectId/crawls
 * Start new crawl
 */
router.post(
  '/projects/:projectId/crawls',
  requireAuth,
  requireProjectAccess,
  requireEditorRole,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { runType = 'full' } = req.body;

      // Validate run type
      const validRunTypes = ['full', 'sitemap_only', 'sample', 'delta'];
      if (!validRunTypes.includes(runType)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: `Invalid run type. Must be one of: ${validRunTypes.join(', ')}`
        });
      }

      // Get project configuration
      const project = req.project;

      // Create crawl run record
      const crawlRun = await CrawlRunModel.create({
        project_id: projectId,
        run_type: runType,
        config_snapshot: {
          base_url: project.base_url,
          user_agent: project.user_agent || process.env.USER_AGENT || 'AEO-Platform-Bot/1.0',
          depth_limit: project.depth_limit || 3,
          sample_size: project.sample_size || null,
          token_limit: project.token_limit || null,
          excluded_patterns: project.excluded_patterns || []
        },
        created_by: req.userId
      });

      // Add job to queue
      await addCrawlJob({
        crawlRunId: crawlRun.id,
        projectId: projectId,
        userId: req.userId,
        config: crawlRun.config_snapshot
      });

      console.log(`Crawl job queued: ${crawlRun.id} for project ${projectId}`);

      // Return created crawl run
      res.status(201).json({
        id: crawlRun.id,
        projectId: crawlRun.project_id,
        runType: crawlRun.run_type,
        status: crawlRun.status,
        pagesDiscovered: crawlRun.pages_discovered,
        pagesProcessed: crawlRun.pages_processed,
        tokenUsage: crawlRun.token_usage,
        startedAt: crawlRun.started_at,
        completedAt: crawlRun.completed_at
      });
    } catch (error) {
      console.error('Start crawl error:', error);
      res.status(500).json({
        error: 'Failed to start crawl',
        message: error.message
      });
    }
  }
);

/**
 * GET /projects/:projectId/crawls
 * List project's crawl runs
 */
router.get('/projects/:projectId/crawls', requireAuth, requireProjectAccess, async (req, res) => {
  try {
    const { projectId } = req.params;

    // Get all crawl runs for project
    const crawlRuns = await CrawlRunModel.findByProject(projectId);

    // Transform to API format
    const data = crawlRuns.map(run => ({
      id: run.id,
      projectId: run.project_id,
      runType: run.run_type,
      status: run.status,
      pagesDiscovered: run.pages_discovered,
      pagesProcessed: run.pages_processed,
      tokenUsage: run.token_usage,
      startedAt: run.started_at,
      completedAt: run.completed_at,
      errorMessage: run.error_message
    }));

    res.json({ data });
  } catch (error) {
    console.error('List crawls error:', error);
    res.status(500).json({
      error: 'Failed to list crawls',
      message: error.message
    });
  }
});

/**
 * GET /crawls/:crawlId
 * Get crawl status
 */
router.get('/crawls/:crawlId', requireAuth, requireCrawlAccess, async (req, res) => {
  try {
    const crawlRun = req.crawlRun;

    res.json({
      id: crawlRun.id,
      projectId: crawlRun.project_id,
      runType: crawlRun.run_type,
      status: crawlRun.status,
      pagesDiscovered: crawlRun.pages_discovered,
      pagesProcessed: crawlRun.pages_processed,
      tokenUsage: crawlRun.token_usage,
      startedAt: crawlRun.started_at,
      completedAt: crawlRun.completed_at,
      errorMessage: crawlRun.error_message
    });
  } catch (error) {
    console.error('Get crawl error:', error);
    res.status(500).json({
      error: 'Failed to get crawl',
      message: error.message
    });
  }
});

/**
 * POST /crawls/:crawlId/pause
 * Pause crawl
 */
router.post('/crawls/:crawlId/pause', requireAuth, requireCrawlAccess, async (req, res) => {
  try {
    const { crawlId } = req.params;
    const crawlRun = req.crawlRun;

    // Check if crawl is running or queued
    if (crawlRun.status !== 'running' && crawlRun.status !== 'queued') {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Cannot pause crawl with status: ${crawlRun.status}`
      });
    }

    // Pause the crawl run
    const updated = await CrawlRunModel.pause(crawlId);

    console.log(`Crawl paused: ${crawlId}`);

    res.json({
      id: updated.id,
      projectId: updated.project_id,
      runType: updated.run_type,
      status: updated.status,
      pagesDiscovered: updated.pages_discovered,
      pagesProcessed: updated.pages_processed,
      tokenUsage: updated.token_usage,
      startedAt: updated.started_at,
      completedAt: updated.completed_at
    });
  } catch (error) {
    console.error('Pause crawl error:', error);
    res.status(500).json({
      error: 'Failed to pause crawl',
      message: error.message
    });
  }
});

/**
 * POST /crawls/:crawlId/resume
 * Resume crawl
 */
router.post('/crawls/:crawlId/resume', requireAuth, requireCrawlAccess, async (req, res) => {
  try {
    const { crawlId } = req.params;
    const crawlRun = req.crawlRun;

    // Check if crawl is paused
    if (crawlRun.status !== 'paused') {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Cannot resume crawl with status: ${crawlRun.status}`
      });
    }

    // Resume the crawl run
    const updated = await CrawlRunModel.resume(crawlId);

    // Re-add job to queue
    await addCrawlJob({
      crawlRunId: updated.id,
      projectId: updated.project_id,
      userId: req.userId,
      config: updated.config_snapshot
    });

    console.log(`Crawl resumed: ${crawlId}`);

    res.json({
      id: updated.id,
      projectId: updated.project_id,
      runType: updated.run_type,
      status: updated.status,
      pagesDiscovered: updated.pages_discovered,
      pagesProcessed: updated.pages_processed,
      tokenUsage: updated.token_usage,
      startedAt: updated.started_at,
      completedAt: updated.completed_at
    });
  } catch (error) {
    console.error('Resume crawl error:', error);
    res.status(500).json({
      error: 'Failed to resume crawl',
      message: error.message
    });
  }
});

module.exports = router;
