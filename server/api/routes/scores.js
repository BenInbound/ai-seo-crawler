/**
 * Score Routes
 *
 * Implements scoring endpoints for User Story 3:
 * - GET /scores/:scoreId - Get score details by ID
 * - POST /pages/:pageId/rescore - Trigger page rescoring
 * - POST /projects/:projectId/rescore - Batch rescore pages in project
 *
 * Based on User Story 3: Intelligent Page Scoring
 */

const express = require('express');
const PageScoreModel = require('../../models/score');
const PageModel = require('../../models/page');
const SnapshotModel = require('../../models/snapshot');
const { hasProjectAccess } = require('../../models/project');
const { addScoringJob, addBatchRescoreJob } = require('../../services/jobs/queue');

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
 * GET /api/scores/:scoreId
 *
 * Get detailed score information by score ID
 */
router.get('/:scoreId', requireAuth, async (req, res) => {
  try {
    const { scoreId } = req.params;

    // Get score
    const score = await PageScoreModel.getById(scoreId);

    if (!score) {
      return res.status(404).json({
        error: 'Not Found',
        details: 'Score not found'
      });
    }

    // Get page to check access
    const page = await PageModel.getById(score.page_id);

    if (!page) {
      return res.status(404).json({
        error: 'Not Found',
        details: 'Associated page not found'
      });
    }

    // Check project access
    const hasAccess = await hasProjectAccess(req.userId, page.project_id);

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Forbidden',
        details: 'You do not have access to this score'
      });
    }

    // Return score with page context
    res.status(200).json({
      ...score,
      page: {
        id: page.id,
        url: page.url,
        page_type: page.page_type,
        project_id: page.project_id
      }
    });
  } catch (error) {
    console.error('Error fetching score:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
});

/**
 * POST /api/pages/:pageId/rescore
 *
 * Trigger rescoring of a single page
 */
router.post('/pages/:pageId/rescore', requireAuth, async (req, res) => {
  try {
    const { pageId } = req.params;
    console.log('[Rescore] Starting rescore for page:', pageId);

    // Get page
    const page = await PageModel.getById(pageId);
    console.log('[Rescore] Page data:', {
      id: page?.id,
      current_snapshot_id: page?.current_snapshot_id,
      last_crawl_run_id: page?.last_crawl_run_id
    });

    if (!page) {
      return res.status(404).json({
        error: 'Not Found',
        details: 'Page not found'
      });
    }

    // Check project access
    const hasAccess = await hasProjectAccess(req.userId, page.project_id);

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Forbidden',
        details: 'You do not have access to this page'
      });
    }

    // Get current snapshot
    if (!page.current_snapshot_id) {
      console.error('[Rescore] Page has no snapshot:', pageId);
      return res.status(400).json({
        error: 'Bad Request',
        details: 'Page has no snapshot to score. Please crawl the page first.'
      });
    }

    const snapshot = await SnapshotModel.getById(page.current_snapshot_id);
    console.log('[Rescore] Snapshot data:', { id: snapshot?.id, crawl_run_id: snapshot?.crawl_run_id });

    if (!snapshot) {
      console.error('[Rescore] Snapshot not found:', page.current_snapshot_id);
      return res.status(404).json({
        error: 'Not Found',
        details: 'Page snapshot not found'
      });
    }

    // Use the page's last crawl run ID (required by scoring processor)
    const crawlRunId = page.last_crawl_run_id || snapshot.crawl_run_id;
    console.log('[Rescore] Using crawl run ID:', crawlRunId);

    if (!crawlRunId) {
      console.error('[Rescore] No crawl run ID found for page:', pageId);
      return res.status(400).json({
        error: 'Bad Request',
        details: 'Cannot determine crawl run for this page'
      });
    }

    // Add scoring job to queue with single snapshot
    console.log('[Rescore] Queueing job with data:', { crawlRunId, snapshotIds: [snapshot.id] });
    const job = await addScoringJob({
      crawlRunId,
      snapshotIds: [snapshot.id],
      tokenLimit: null,
      isManualRescore: true
    });
    console.log('[Rescore] Job queued successfully:', job.id);

    res.status(202).json({
      message: 'Rescoring initiated',
      jobId: job.id,
      pageId,
      snapshotId: snapshot.id,
      status: 'queued'
    });
  } catch (error) {
    console.error('[Rescore] Error initiating rescore:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
});

/**
 * POST /api/projects/:projectId/rescore
 *
 * Batch rescore pages in a project
 *
 * Body:
 * - pageIds: Array of page IDs to rescore (optional, rescores all if not provided)
 * - tokenLimit: Max tokens to use (optional)
 */
router.post('/projects/:projectId/rescore', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { pageIds, tokenLimit } = req.body;

    // Check project access
    const hasAccess = await hasProjectAccess(req.userId, projectId);

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Forbidden',
        details: 'You do not have access to this project'
      });
    }

    // Determine which pages to rescore
    let pagesToRescore = pageIds;

    if (!pagesToRescore || pagesToRescore.length === 0) {
      // Get all pages in project
      const pages = await PageModel.listByProject(projectId);
      pagesToRescore = pages.map(p => p.id);
    }

    if (pagesToRescore.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        details: 'No pages to rescore'
      });
    }

    // Get all pages and their snapshots
    const snapshotIds = [];
    let crawlRunId = null;

    for (const pageId of pagesToRescore) {
      const page = await PageModel.getById(pageId);

      if (!page || !page.current_snapshot_id) {
        continue; // Skip pages without snapshots
      }

      snapshotIds.push(page.current_snapshot_id);

      // Use the first page's crawl run ID
      if (!crawlRunId) {
        crawlRunId = page.last_crawl_run_id;
      }
    }

    if (snapshotIds.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        details: 'No pages with snapshots found to rescore'
      });
    }

    if (!crawlRunId) {
      return res.status(400).json({
        error: 'Bad Request',
        details: 'Cannot determine crawl run for these pages'
      });
    }

    // Add scoring job to queue with all snapshots
    const job = await addScoringJob({
      crawlRunId,
      snapshotIds,
      tokenLimit: tokenLimit || null
    });

    res.status(202).json({
      message: 'Batch rescoring initiated',
      jobId: job.id,
      projectId,
      pageCount: snapshotIds.length,
      status: 'queued'
    });
  } catch (error) {
    console.error('Error initiating batch rescore:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
});

/**
 * GET /api/pages/:pageId/scores
 *
 * Get score history for a page
 */
router.get('/pages/:pageId/scores', requireAuth, async (req, res) => {
  try {
    const { pageId } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    // Get page
    const page = await PageModel.getById(pageId);

    if (!page) {
      return res.status(404).json({
        error: 'Not Found',
        details: 'Page not found'
      });
    }

    // Check project access
    const hasAccess = await hasProjectAccess(req.userId, page.project_id);

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Forbidden',
        details: 'You do not have access to this page'
      });
    }

    // Get score history
    const scores = await PageScoreModel.listByPage(pageId, {
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });

    res.status(200).json({
      pageId,
      scores,
      pagination: {
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        total: scores.length
      }
    });
  } catch (error) {
    console.error('Error fetching score history:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
});

/**
 * GET /api/scores/:scoreId/compare/:compareScoreId
 *
 * Compare two scores
 */
router.get('/:scoreId/compare/:compareScoreId', requireAuth, async (req, res) => {
  try {
    const { scoreId, compareScoreId } = req.params;

    // Get both scores
    const score1 = await PageScoreModel.getById(scoreId);
    const score2 = await PageScoreModel.getById(compareScoreId);

    if (!score1 || !score2) {
      return res.status(404).json({
        error: 'Not Found',
        details: 'One or both scores not found'
      });
    }

    // Get pages to check access
    const page1 = await PageModel.getById(score1.page_id);
    const page2 = await PageModel.getById(score2.page_id);

    if (!page1 || !page2) {
      return res.status(404).json({
        error: 'Not Found',
        details: 'Associated pages not found'
      });
    }

    // Check access to both projects
    const hasAccess1 = await hasProjectAccess(req.userId, page1.project_id);
    const hasAccess2 = await hasProjectAccess(req.userId, page2.project_id);

    if (!hasAccess1 || !hasAccess2) {
      return res.status(403).json({
        error: 'Forbidden',
        details: 'You do not have access to one or both scores'
      });
    }

    // Calculate comparison
    const comparison = {
      score1: {
        id: score1.id,
        overall_score: score1.overall_score,
        scored_at: score1.scored_at,
        page: { id: page1.id, url: page1.url }
      },
      score2: {
        id: score2.id,
        overall_score: score2.overall_score,
        scored_at: score2.scored_at,
        page: { id: page2.id, url: page2.url }
      },
      overall_delta: score2.overall_score - score1.overall_score,
      criteria_deltas: {},
      improved_criteria: [],
      declined_criteria: []
    };

    // Calculate criteria deltas
    Object.keys(score1.criteria_scores).forEach(criterion => {
      const delta = (score2.criteria_scores[criterion] || 0) - (score1.criteria_scores[criterion] || 0);
      comparison.criteria_deltas[criterion] = delta;

      if (delta > 0) {
        comparison.improved_criteria.push({ criterion, delta });
      } else if (delta < 0) {
        comparison.declined_criteria.push({ criterion, delta });
      }
    });

    // Sort by absolute delta
    comparison.improved_criteria.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    comparison.declined_criteria.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    res.status(200).json(comparison);
  } catch (error) {
    console.error('Error comparing scores:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  }
});

module.exports = router;
