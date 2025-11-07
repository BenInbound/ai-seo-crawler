/**
 * Sitemap Parser
 *
 * Discovers and parses XML sitemaps to find URLs for crawling.
 * Handles sitemap indexes, nested sitemaps, and various sitemap formats.
 * Based on plan.md crawler infrastructure for User Story 2.
 *
 * Features:
 * - Automatic sitemap discovery (robots.txt, /sitemap.xml, common patterns)
 * - Sitemap index support (recursive parsing)
 * - Priority and change frequency extraction
 * - Last modification date tracking
 * - Error handling for malformed XML
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

/**
 * Discover sitemap URLs for a website
 *
 * @param {string} baseUrl - Root URL of the website
 * @param {string} userAgent - User agent string
 * @returns {Promise<Array<string>>} - List of discovered sitemap URLs
 */
async function discoverSitemaps(baseUrl, userAgent = 'AEO-Platform-Bot/1.0') {
  const discovered = new Set();
  const base = new URL(baseUrl);

  // Try robots.txt first
  try {
    const robotsUrl = `${base.origin}/robots.txt`;
    const response = await axios.get(robotsUrl, {
      headers: { 'User-Agent': userAgent },
      timeout: 10000
    });

    const lines = response.data.split('\n');
    lines.forEach(line => {
      const match = line.match(/^Sitemap:\s*(.+)$/i);
      if (match) {
        discovered.add(match[1].trim());
      }
    });
  } catch (e) {
    // robots.txt not found or error, continue
  }

  // Try common sitemap locations
  const commonPaths = [
    '/sitemap.xml',
    '/sitemap_index.xml',
    '/sitemap-index.xml',
    '/sitemaps.xml',
    '/sitemap1.xml'
  ];

  for (const path of commonPaths) {
    const sitemapUrl = `${base.origin}${path}`;
    try {
      await axios.head(sitemapUrl, {
        headers: { 'User-Agent': userAgent },
        timeout: 5000
      });
      discovered.add(sitemapUrl);
    } catch (e) {
      // Not found, continue
    }
  }

  return Array.from(discovered);
}

/**
 * Parse a single sitemap XML file
 *
 * @param {string} sitemapUrl - URL of the sitemap
 * @param {string} userAgent - User agent string
 * @returns {Promise<Object>} - Parsed sitemap { urls: Array, sitemaps: Array }
 */
async function parseSitemap(sitemapUrl, userAgent = 'AEO-Platform-Bot/1.0') {
  try {
    const response = await axios.get(sitemapUrl, {
      headers: { 'User-Agent': userAgent },
      timeout: 30000,
      maxContentLength: 50 * 1024 * 1024 // 50MB max
    });

    const $ = cheerio.load(response.data, { xmlMode: true });

    // Check if this is a sitemap index
    const sitemapTags = $('sitemapindex > sitemap');
    if (sitemapTags.length > 0) {
      return parseSitemapIndex($, sitemapUrl);
    }

    // Parse regular sitemap
    return parseUrlSet($, sitemapUrl);
  } catch (error) {
    console.error(`Error parsing sitemap ${sitemapUrl}:`, error.message);
    return { urls: [], sitemaps: [] };
  }
}

/**
 * Parse sitemap index (contains references to other sitemaps)
 */
function parseSitemapIndex($, baseUrl) {
  const sitemaps = [];

  $('sitemapindex > sitemap').each((i, el) => {
    const $sitemap = $(el);
    const loc = $sitemap.find('loc').text().trim();
    const lastmod = $sitemap.find('lastmod').text().trim();

    if (loc) {
      sitemaps.push({
        url: resolveUrl(loc, baseUrl),
        lastmod: lastmod || null
      });
    }
  });

  return { urls: [], sitemaps };
}

/**
 * Parse URL set from sitemap
 */
function parseUrlSet($, baseUrl) {
  const urls = [];

  $('urlset > url').each((i, el) => {
    const $url = $(el);
    const loc = $url.find('loc').text().trim();
    const lastmod = $url.find('lastmod').text().trim();
    const changefreq = $url.find('changefreq').text().trim();
    const priority = parseFloat($url.find('priority').text().trim()) || null;

    if (loc) {
      urls.push({
        url: resolveUrl(loc, baseUrl),
        lastmod: lastmod || null,
        changefreq: changefreq || null,
        priority
      });
    }
  });

  return { urls, sitemaps: [] };
}

/**
 * Recursively parse all sitemaps (including nested indexes)
 *
 * @param {string} baseUrl - Root URL of the website
 * @param {string} userAgent - User agent string
 * @param {number} maxDepth - Maximum recursion depth
 * @returns {Promise<Array>} - All discovered URLs
 */
async function parseAllSitemaps(baseUrl, userAgent = 'AEO-Platform-Bot/1.0', maxDepth = 5) {
  const allUrls = [];
  const visited = new Set();

  async function parseRecursive(sitemapUrl, depth = 0) {
    if (depth > maxDepth || visited.has(sitemapUrl)) {
      return;
    }

    visited.add(sitemapUrl);
    const result = await parseSitemap(sitemapUrl, userAgent);

    // Add URLs
    allUrls.push(...result.urls);

    // Recursively parse nested sitemaps
    for (const sitemap of result.sitemaps) {
      await parseRecursive(sitemap.url, depth + 1);
    }
  }

  // Discover and parse all sitemaps
  const discoveredSitemaps = await discoverSitemaps(baseUrl, userAgent);

  for (const sitemapUrl of discoveredSitemaps) {
    await parseRecursive(sitemapUrl);
  }

  return allUrls;
}

/**
 * Filter sitemap URLs by criteria
 *
 * @param {Array} urls - Sitemap URLs
 * @param {Object} filters - Filter options
 * @param {Date} filters.modifiedAfter - Only URLs modified after this date
 * @param {number} filters.minPriority - Minimum priority (0.0 - 1.0)
 * @param {Array<string>} filters.excludePatterns - URL patterns to exclude
 * @returns {Array} - Filtered URLs
 */
function filterUrls(urls, filters = {}) {
  let filtered = urls;

  if (filters.modifiedAfter) {
    filtered = filtered.filter(item => {
      if (!item.lastmod) return true;
      const modDate = new Date(item.lastmod);
      return modDate >= filters.modifiedAfter;
    });
  }

  if (filters.minPriority !== undefined) {
    filtered = filtered.filter(item => {
      if (item.priority === null) return true;
      return item.priority >= filters.minPriority;
    });
  }

  if (filters.excludePatterns && filters.excludePatterns.length > 0) {
    filtered = filtered.filter(item => {
      return !filters.excludePatterns.some(pattern => item.url.includes(pattern));
    });
  }

  return filtered;
}

/**
 * Resolve relative URLs to absolute
 */
function resolveUrl(url, baseUrl) {
  try {
    return new URL(url, baseUrl).toString();
  } catch (e) {
    return url;
  }
}

/**
 * Get sitemap statistics
 *
 * @param {Array} urls - Sitemap URLs
 * @returns {Object} - Statistics
 */
function getStats(urls) {
  const stats = {
    total: urls.length,
    with_priority: 0,
    with_lastmod: 0,
    with_changefreq: 0,
    priority_distribution: {
      high: 0, // 0.8-1.0
      medium: 0, // 0.5-0.79
      low: 0 // 0.0-0.49
    },
    changefreq_distribution: {}
  };

  urls.forEach(item => {
    if (item.priority !== null) {
      stats.with_priority++;
      if (item.priority >= 0.8) {
        stats.priority_distribution.high++;
      } else if (item.priority >= 0.5) {
        stats.priority_distribution.medium++;
      } else {
        stats.priority_distribution.low++;
      }
    }

    if (item.lastmod) {
      stats.with_lastmod++;
    }

    if (item.changefreq) {
      stats.with_changefreq++;
      stats.changefreq_distribution[item.changefreq] =
        (stats.changefreq_distribution[item.changefreq] || 0) + 1;
    }
  });

  return stats;
}

module.exports = {
  discoverSitemaps,
  parseSitemap,
  parseAllSitemaps,
  filterUrls,
  getStats
};
