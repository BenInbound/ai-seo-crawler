const robotsParser = require('robots-parser');
const { fetch } = require('./package-fix');

class RobotsChecker {
  constructor(projectUserAgent = null) {
    this.cache = new Map();
    this.cacheTimeout = 60 * 60 * 1000; // 1 hour

    // Support project-specific user agent for multi-tenant crawling
    this.projectUserAgent = projectUserAgent || process.env.USER_AGENT || 'AEO-Platform-Bot/1.0';

    // Multiple user agent strategies for ethical analysis
    this.userAgents = {
      crawler: this.projectUserAgent,
      chrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      firefox: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
      safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15'
    };
  }

  /**
   * Set project-specific user agent for multi-tenant support
   * @param {string} userAgent - Custom user agent string
   */
  setProjectUserAgent(userAgent) {
    this.projectUserAgent = userAgent;
    this.userAgents.crawler = userAgent;
    // Clear cache when user agent changes
    this.cache.clear();
  }

  async checkRobots(domain, userAgent = 'AI-Search-Crawler') {
    const cacheKey = `${domain}_${userAgent}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const robotsUrl = `https://${domain}/robots.txt`;
      const response = await fetch(robotsUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': userAgent
        }
      });

      let robotsTxt = '';
      if (response.ok) {
        robotsTxt = await response.text();
      }

      const robots = robotsParser(robotsUrl, robotsTxt);

      // Check multiple user agent strategies
      const crawlerResult = this.checkUserAgentAccess(robots, robotsTxt, userAgent, '/');
      const browserResults = this.checkBrowserUserAgents(robots, robotsTxt, '/');

      const result = {
        exists: response.ok,
        canCrawl: crawlerResult.canCrawl,
        canCrawlAsBrowser: browserResults.canCrawl,
        bestUserAgent: browserResults.canCrawl ? browserResults.userAgent : userAgent,
        crawlDelay: robots.getCrawlDelay(userAgent) || robots.getCrawlDelay('*') || 1,
        sitemapUrls: robots.getSitemaps(),
        disallowedPaths: this.getDisallowedPaths(robotsTxt, userAgent),
        analysisStrategies: {
          crawler: crawlerResult,
          browser: browserResults
        },
        robotsTxtContent: robotsTxt,
        recommendations: this.getRecommendations(crawlerResult, browserResults)
      };

      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      console.error(`Error checking robots.txt for ${domain}:`, error.message);

      // Return permissive defaults on error
      const fallback = {
        exists: false,
        canCrawl: true,
        canCrawlAsBrowser: true,
        bestUserAgent: this.userAgents.chrome,
        crawlDelay: 2,
        sitemapUrls: [],
        disallowedPaths: [],
        error: error.message,
        analysisStrategies: {
          crawler: { canCrawl: true, reason: 'No robots.txt found' },
          browser: { canCrawl: true, userAgent: this.userAgents.chrome, reason: 'No robots.txt found' }
        },
        recommendations: ['No robots.txt restrictions found - crawling allowed']
      };

      this.cache.set(cacheKey, {
        data: fallback,
        timestamp: Date.now()
      });

      return fallback;
    }
  }

  checkUserAgentAccess(robots, robotsTxt, userAgent, path = '/') {
    try {
      const isAllowed = robots.isAllowed(path, userAgent);
      const crawlDelay = robots.getCrawlDelay(userAgent) || robots.getCrawlDelay('*') || 1;

      // Handle undefined result from robots-parser (means no explicit disallow rule)
      // For homepage (/), undefined should be treated as allowed
      const canCrawl = isAllowed === false ? false : true;

      return {
        canCrawl: canCrawl,
        userAgent: userAgent,
        crawlDelay: crawlDelay,
        reason: canCrawl ? 'Allowed by robots.txt' : 'Blocked by robots.txt',
        rawResult: isAllowed // Keep original for debugging
      };
    } catch (error) {
      return {
        canCrawl: false,
        userAgent: userAgent,
        reason: `Error parsing robots.txt: ${error.message}`
      };
    }
  }

  checkBrowserUserAgents(robots, robotsTxt, path = '/') {
    // Check if browser user agents are allowed (common SEO tool strategy)
    for (const [name, userAgent] of Object.entries(this.userAgents)) {
      if (name === 'crawler') continue; // Skip crawler agent

      try {
        const isAllowed = robots.isAllowed(path, userAgent);
        // Handle undefined result - treat as allowed unless explicitly false
        const canCrawl = isAllowed === false ? false : true;

        if (canCrawl) {
          return {
            canCrawl: true,
            userAgent: userAgent,
            userAgentType: name,
            crawlDelay: robots.getCrawlDelay(userAgent) || robots.getCrawlDelay('*') || 1,
            reason: `Allowed as ${name} browser`,
            rawResult: isAllowed
          };
        }
      } catch (error) {
        console.log(`Error checking ${name} user agent:`, error.message);
      }
    }

    return {
      canCrawl: false,
      reason: 'All user agents blocked'
    };
  }

  getRecommendations(crawlerResult, browserResults) {
    const recommendations = [];

    if (crawlerResult.canCrawl) {
      recommendations.push('✅ SEO analysis allowed with crawler identification');
    } else if (browserResults.canCrawl) {
      recommendations.push('✅ SEO analysis possible using browser user agent');
      recommendations.push(`💡 Using ${browserResults.userAgentType} user agent for ethical analysis`);
    } else {
      recommendations.push('❌ All automated access blocked - manual analysis required');
      recommendations.push('💡 Contact site owner for analysis permission');
    }

    return recommendations;
  }

  getDisallowedPaths(robotsTxt, userAgent = '*') {
    const lines = robotsTxt.split('\n');
    const disallowedPaths = [];
    let currentUserAgent = null;
    let isRelevantSection = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.toLowerCase().startsWith('user-agent:')) {
        currentUserAgent = trimmed.substring(11).trim();
        isRelevantSection = currentUserAgent === userAgent || currentUserAgent === '*';
      } else if (isRelevantSection && trimmed.toLowerCase().startsWith('disallow:')) {
        const path = trimmed.substring(9).trim();
        if (path && path !== '/') {
          disallowedPaths.push(path);
        }
      }
    }

    return disallowedPaths;
  }

  isPathAllowed(path, disallowedPaths) {
    if (!disallowedPaths || disallowedPaths.length === 0) {
      return true;
    }

    return !disallowedPaths.some(disallowed => {
      if (disallowed.endsWith('*')) {
        return path.startsWith(disallowed.slice(0, -1));
      }
      return path.startsWith(disallowed);
    });
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = { RobotsChecker };
