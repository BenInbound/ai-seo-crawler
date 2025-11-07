/**
 * URL Normalization and Canonicalization Utility
 *
 * Provides URL normalization for duplicate detection and canonical URL following.
 * Based on research.md recommendations for handling tracking parameters,
 * canonical links, and pagination patterns.
 */

const crypto = require('crypto');

/**
 * Common tracking parameters to strip from URLs
 */
const TRACKING_PARAMS = [
  // UTM parameters (Google Analytics)
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  // Facebook
  'fbclid',
  'fb_action_ids',
  'fb_action_types',
  'fb_source',
  'fb_ref',
  // Google
  'gclid',
  'gclsrc',
  'dclid',
  // Other common tracking
  'ref',
  'referrer',
  '_ga',
  '_gl',
  'mc_cid',
  'mc_eid',
  // Social media
  'igshid',
  'twclid',
  'li_fat_id',
  // Email marketing
  'mbid',
  'mkt_tok',
  'trk_contact',
  'trk_msg',
  'trk_module',
  'trk_sid'
];

/**
 * Pagination parameter patterns (for loop detection)
 */
const PAGINATION_PARAMS = ['page', 'p', 'offset', 'start', 'pg'];

/**
 * Normalize a URL by:
 * - Converting to lowercase (hostname only)
 * - Removing tracking parameters
 * - Normalizing protocol, trailing slashes, default ports
 * - Sorting remaining query parameters for consistency
 *
 * @param {string} urlString - The URL to normalize
 * @returns {string|null} - Normalized URL or null if invalid
 */
function normalizeUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    return null;
  }

  try {
    const url = new URL(urlString);

    // Normalize protocol to https (prefer secure)
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      url.protocol = 'https:';
    } else {
      // Skip non-HTTP protocols (mailto:, ftp:, etc.)
      return null;
    }

    // Lowercase hostname for consistency
    url.hostname = url.hostname.toLowerCase();

    // Remove default ports
    if (
      (url.protocol === 'https:' && url.port === '443') ||
      (url.protocol === 'http:' && url.port === '80')
    ) {
      url.port = '';
    }

    // Remove fragment identifier
    url.hash = '';

    // Strip tracking parameters
    const params = new URLSearchParams(url.search);
    TRACKING_PARAMS.forEach(param => params.delete(param));

    // Sort remaining parameters for consistency
    const sortedParams = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));

    url.search = '';
    sortedParams.forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    // Normalize trailing slash (remove unless it's root path)
    let pathname = url.pathname;
    if (pathname !== '/' && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    url.pathname = pathname;

    return url.toString();
  } catch (error) {
    // Invalid URL format
    return null;
  }
}

/**
 * Generate a SHA-256 hash of a normalized URL for fast duplicate detection
 *
 * @param {string} urlString - The URL to hash
 * @returns {string|null} - Hex-encoded hash or null if invalid URL
 */
function hashUrl(urlString) {
  const normalized = normalizeUrl(urlString);
  if (!normalized) {
    return null;
  }

  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Check if a URL contains pagination parameters
 * Used to detect potential infinite loops during crawling
 *
 * @param {string} urlString - The URL to check
 * @returns {boolean} - True if pagination parameters detected
 */
function hasPaginationParams(urlString) {
  try {
    const url = new URL(urlString);
    const params = new URLSearchParams(url.search);

    return PAGINATION_PARAMS.some(param => params.has(param));
  } catch (error) {
    return false;
  }
}

/**
 * Extract canonical URL from HTML content
 * Looks for <link rel="canonical" href="..."> tag
 *
 * @param {string} html - HTML content to parse
 * @returns {string|null} - Canonical URL if found, null otherwise
 */
function extractCanonicalUrl(html) {
  if (!html || typeof html !== 'string') {
    return null;
  }

  // Simple regex to find canonical link (good enough for most cases)
  // For more robust parsing, could use Cheerio, but keeping this lightweight
  const canonicalRegex = /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i;
  const altCanonicalRegex = /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i;

  let match = html.match(canonicalRegex);
  if (!match) {
    match = html.match(altCanonicalRegex);
  }

  if (match && match[1]) {
    return match[1].trim();
  }

  return null;
}

/**
 * Resolve a canonical URL following the chain if necessary
 * Returns the normalized canonical URL or the original normalized URL if no canonical found
 *
 * @param {string} urlString - The original URL
 * @param {string} html - HTML content to extract canonical from
 * @returns {object} - { url: string, isCanonical: boolean }
 */
function resolveCanonical(urlString, html) {
  const normalizedOriginal = normalizeUrl(urlString);
  if (!normalizedOriginal) {
    return { url: null, isCanonical: false };
  }

  const canonicalHref = extractCanonicalUrl(html);
  if (!canonicalHref) {
    return { url: normalizedOriginal, isCanonical: false };
  }

  try {
    // Resolve relative canonical URLs
    const baseUrl = new URL(urlString);
    const canonicalUrl = new URL(canonicalHref, baseUrl);
    const normalizedCanonical = normalizeUrl(canonicalUrl.toString());

    // Check if canonical differs from original
    const isCanonical = normalizedCanonical === normalizedOriginal;

    return {
      url: normalizedCanonical,
      isCanonical,
      originalUrl: normalizedOriginal
    };
  } catch (error) {
    // Invalid canonical URL, fall back to original
    return { url: normalizedOriginal, isCanonical: false };
  }
}

/**
 * Check if two URLs are duplicates after normalization
 *
 * @param {string} url1 - First URL
 * @param {string} url2 - Second URL
 * @returns {boolean} - True if URLs are duplicates
 */
function areDuplicateUrls(url1, url2) {
  const normalized1 = normalizeUrl(url1);
  const normalized2 = normalizeUrl(url2);

  if (!normalized1 || !normalized2) {
    return false;
  }

  return normalized1 === normalized2;
}

module.exports = {
  normalizeUrl,
  hashUrl,
  hasPaginationParams,
  extractCanonicalUrl,
  resolveCanonical,
  areDuplicateUrls,
  TRACKING_PARAMS,
  PAGINATION_PARAMS
};
