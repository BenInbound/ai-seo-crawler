const express = require('express');
const { CrawlerEngine } = require('../../crawler/engine');

const router = express.Router();

// Simple in-memory rate limiting for domain analysis
const domainRateLimit = new Map();
const RATE_LIMIT_MS = 60000; // 1 minute between analyses for same domain

// Analyze a domain
router.post('/analyze', async (req, res) => {
  try {
    const { domain, url } = req.body;

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

    // Simple rate limiting per domain
    const now = Date.now();
    const lastAnalysis = domainRateLimit.get(domain);
    if (lastAnalysis && (now - lastAnalysis) < RATE_LIMIT_MS) {
      const remainingMs = RATE_LIMIT_MS - (now - lastAnalysis);
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Please wait ${Math.ceil(remainingMs / 1000)} seconds before analyzing this domain again`,
        retryAfter: Math.ceil(remainingMs / 1000)
      });
    }

    // Update rate limit timestamp
    domainRateLimit.set(domain, now);

    // Clean up old entries (keep map small)
    if (domainRateLimit.size > 1000) {
      const cutoff = now - RATE_LIMIT_MS;
      for (const [key, timestamp] of domainRateLimit.entries()) {
        if (timestamp < cutoff) {
          domainRateLimit.delete(key);
        }
      }
    }

    // Start crawling - always fresh analysis
    const crawler = new CrawlerEngine();
    const result = await crawler.analyzeDomain(domain, url);

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

module.exports = router;