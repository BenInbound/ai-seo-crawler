const express = require('express');
const { CrawlerEngine } = require('../../crawler/engine');
const { getCrawlResult, getCrawlHistory } = require('../../models/database');
const { RobotsChecker } = require('../../utils/robotsChecker');

const router = express.Router();

// Create shared robots checker instance to clear cache
const robotsChecker = new RobotsChecker();

// Analyze a domain
router.post('/analyze', async (req, res) => {
  try {
    const { domain, forceRefresh = false } = req.body;

    if (!domain) {
      return res.status(400).json({
        error: 'Domain is required'
      });
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
    if (!domainRegex.test(domain)) {
      return res.status(400).json({
        error: 'Invalid domain format'
      });
    }

    // Check for recent results unless force refresh is requested
    if (!forceRefresh) {
      const recentResult = await getCrawlResult(domain, 24 * 60 * 60 * 1000); // 24 hours
      if (recentResult) {
        return res.json({
          cached: true,
          result: recentResult
        });
      }
    }

    // Start crawling
    const crawler = new CrawlerEngine();
    
    // Clear robots cache if force refresh is requested
    if (forceRefresh) {
      crawler.robotsChecker.clearCache();
      console.log(`🔄 Cleared robots.txt cache for force refresh`);
    }
    
    const result = await crawler.analyzeDomain(domain);

    res.json({
      cached: false,
      result
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message
    });
  }
});

// Get crawl history for a domain
router.get('/history/:domain', async (req, res) => {
  try {
    const { domain } = req.params;
    const { limit = 10 } = req.query;

    const history = await getCrawlHistory(domain, parseInt(limit));

    res.json({
      domain,
      history
    });

  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch history',
      message: error.message
    });
  }
});

// Clear all caches (for debugging)
router.post('/clear-cache', async (req, res) => {
  try {
    // Clear robots.txt cache
    robotsChecker.clearCache();
    console.log(`🧹 All caches cleared via API`);
    
    res.json({
      message: 'All caches cleared successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

// Get analysis status (for potential future real-time updates)
router.get('/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    // This would be used for real-time status updates
    // For now, return a placeholder
    res.json({
      jobId,
      status: 'completed',
      message: 'Analysis complete'
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      error: 'Failed to check status',
      message: error.message
    });
  }
});

module.exports = router;