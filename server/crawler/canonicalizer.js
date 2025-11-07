/**
 * Canonicalizer
 *
 * Implements canonical URL following and deduplication logic.
 * Ensures that multiple URLs pointing to the same content are treated as one page.
 * Based on plan.md crawler infrastructure for User Story 2.
 *
 * Features:
 * - URL normalization (protocol, domain, path, query params)
 * - Canonical link tag following
 * - Redirect chain following
 * - Duplicate detection
 * - URL parameter filtering
 */

const { URL } = require('url');
const crypto = require('crypto');

/**
 * Normalize URL for consistent comparison
 *
 * @param {string} url - URL to normalize
 * @param {Object} options - Normalization options
 * @param {boolean} options.lowercaseHost - Convert host to lowercase (default: true)
 * @param {boolean} options.removeTrailingSlash - Remove trailing slash from path (default: true)
 * @param {boolean} options.sortParams - Sort query parameters alphabetically (default: true)
 * @param {Array<string>} options.ignoreParams - Query params to ignore (e.g., utm_*, fbclid)
 * @param {boolean} options.removeFragment - Remove URL fragment/hash (default: true)
 * @param {boolean} options.removeDefaultPort - Remove default ports (80, 443) (default: true)
 * @returns {string} - Normalized URL
 */
function normalizeUrl(url, options = {}) {
  const {
    lowercaseHost = true,
    removeTrailingSlash = true,
    sortParams = true,
    ignoreParams = [],
    removeFragment = true,
    removeDefaultPort = true
  } = options;

  try {
    const parsed = new URL(url);

    // Normalize protocol
    parsed.protocol = parsed.protocol.toLowerCase();

    // Normalize host
    if (lowercaseHost) {
      parsed.hostname = parsed.hostname.toLowerCase();
    }

    // Remove default ports
    if (removeDefaultPort) {
      if (
        (parsed.protocol === 'http:' && parsed.port === '80') ||
        (parsed.protocol === 'https:' && parsed.port === '443')
      ) {
        parsed.port = '';
      }
    }

    // Normalize path
    if (removeTrailingSlash && parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }

    // Normalize query parameters
    if (parsed.search) {
      const params = new URLSearchParams(parsed.search);

      // Remove ignored parameters
      ignoreParams.forEach(param => {
        // Support wildcards
        if (param.includes('*')) {
          const pattern = new RegExp('^' + param.replace(/\*/g, '.*') + '$');
          Array.from(params.keys()).forEach(key => {
            if (pattern.test(key)) {
              params.delete(key);
            }
          });
        } else {
          params.delete(param);
        }
      });

      // Sort parameters if requested
      if (sortParams) {
        const sortedParams = new URLSearchParams();
        Array.from(params.keys())
          .sort()
          .forEach(key => {
            params.getAll(key).forEach(value => sortedParams.append(key, value));
          });
        parsed.search = sortedParams.toString();
      } else {
        parsed.search = params.toString();
      }
    }

    // Remove fragment
    if (removeFragment) {
      parsed.hash = '';
    }

    return parsed.toString();
  } catch (e) {
    // Invalid URL, return as-is
    return url;
  }
}

/**
 * Default tracking parameters to ignore
 */
const DEFAULT_IGNORE_PARAMS = [
  'utm_*', // Google Analytics
  'fbclid', // Facebook
  'gclid', // Google Ads
  'msclkid', // Microsoft Ads
  '_ga', // Google Analytics
  'mc_*', // Mailchimp
  'ref', // Generic referrer
  'source' // Generic source
];

/**
 * Generate URL hash for deduplication
 *
 * @param {string} url - Normalized URL
 * @returns {string} - SHA-256 hash
 */
function generateUrlHash(url) {
  return crypto.createHash('sha256').update(url).digest('hex');
}

/**
 * Extract canonical URL from HTML
 *
 * @param {string} html - HTML content
 * @param {string} fallbackUrl - Original URL to use if no canonical found
 * @returns {string} - Canonical URL
 */
function extractCanonical(html, fallbackUrl) {
  // Look for canonical link tag
  const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i);

  if (canonicalMatch) {
    const hrefMatch = canonicalMatch[0].match(/href=["']([^"']+)["']/i);
    if (hrefMatch) {
      return hrefMatch[1];
    }
  }

  // Look for og:url
  const ogUrlMatch = html.match(/<meta[^>]+property=["']og:url["'][^>]*>/i);

  if (ogUrlMatch) {
    const contentMatch = ogUrlMatch[0].match(/content=["']([^"']+)["']/i);
    if (contentMatch) {
      return contentMatch[1];
    }
  }

  return fallbackUrl;
}

/**
 * Resolve canonical URL (normalize, extract from HTML if available)
 *
 * @param {string} url - Original URL
 * @param {string} html - HTML content (optional)
 * @param {Object} options - Normalization options
 * @returns {string} - Canonical URL
 */
function resolveCanonical(url, html = null, options = {}) {
  // Default options with tracking param removal
  const normalizeOptions = {
    ...options,
    ignoreParams: options.ignoreParams || DEFAULT_IGNORE_PARAMS
  };

  let canonicalUrl = url;

  // Extract from HTML if available
  if (html) {
    const extracted = extractCanonical(html, url);
    if (extracted !== url) {
      canonicalUrl = extracted;
    }
  }

  // Normalize
  return normalizeUrl(canonicalUrl, normalizeOptions);
}

/**
 * Check if two URLs are canonically equivalent
 *
 * @param {string} url1 - First URL
 * @param {string} url2 - Second URL
 * @param {Object} options - Normalization options
 * @returns {boolean} - True if equivalent
 */
function areEquivalent(url1, url2, options = {}) {
  const normalized1 = normalizeUrl(url1, options);
  const normalized2 = normalizeUrl(url2, options);
  return normalized1 === normalized2;
}

/**
 * Deduplicate a list of URLs
 *
 * @param {Array<string>} urls - List of URLs
 * @param {Object} options - Normalization options
 * @returns {Array<string>} - Deduplicated URLs (normalized)
 */
function deduplicateUrls(urls, options = {}) {
  const seen = new Set();
  const unique = [];

  urls.forEach(url => {
    const normalized = normalizeUrl(url, options);
    const hash = generateUrlHash(normalized);

    if (!seen.has(hash)) {
      seen.add(hash);
      unique.push(normalized);
    }
  });

  return unique;
}

/**
 * Check if URL should be crawled (based on patterns)
 *
 * @param {string} url - URL to check
 * @param {Array<string>} includePatterns - Patterns that URLs must match (empty = all)
 * @param {Array<string>} excludePatterns - Patterns that URLs must NOT match
 * @returns {boolean} - True if URL should be crawled
 */
function shouldCrawl(url, includePatterns = [], excludePatterns = []) {
  // Check exclude patterns first
  if (excludePatterns.length > 0) {
    for (const pattern of excludePatterns) {
      if (url.includes(pattern)) {
        return false;
      }
    }
  }

  // Check include patterns
  if (includePatterns.length > 0) {
    for (const pattern of includePatterns) {
      if (url.includes(pattern)) {
        return true;
      }
    }
    return false; // Didn't match any include pattern
  }

  return true; // No patterns, allow all
}

/**
 * Group URLs by canonical version (deduplicate with mapping)
 *
 * @param {Array<string>} urls - List of URLs
 * @param {Object} options - Normalization options
 * @returns {Map<string, Array<string>>} - Map of canonical URL to original URLs
 */
function groupByCanonical(urls, options = {}) {
  const groups = new Map();

  urls.forEach(url => {
    const canonical = normalizeUrl(url, options);

    if (!groups.has(canonical)) {
      groups.set(canonical, []);
    }

    groups.get(canonical).push(url);
  });

  return groups;
}

/**
 * Check if URL is same domain as base
 *
 * @param {string} url - URL to check
 * @param {string} baseUrl - Base URL for comparison
 * @returns {boolean} - True if same domain
 */
function isSameDomain(url, baseUrl) {
  try {
    const urlObj = new URL(url);
    const baseObj = new URL(baseUrl);
    return urlObj.hostname === baseObj.hostname;
  } catch (e) {
    return false;
  }
}

module.exports = {
  normalizeUrl,
  generateUrlHash,
  extractCanonical,
  resolveCanonical,
  areEquivalent,
  deduplicateUrls,
  shouldCrawl,
  groupByCanonical,
  isSameDomain,
  DEFAULT_IGNORE_PARAMS
};
