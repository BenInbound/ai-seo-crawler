/**
 * Content Hashing and Cache Key Generation Utility
 *
 * Provides content hashing for cache optimization and duplicate detection.
 * Based on research.md recommendations for SHA-256 hashing with Node.js crypto.
 *
 * Used for:
 * - Detecting unchanged page content across crawls
 * - Generating AI cache keys to avoid redundant scoring
 * - Content-based deduplication
 */

const crypto = require('crypto');

/**
 * Generate a SHA-256 hash of text content
 *
 * @param {string} content - The content to hash
 * @returns {string|null} - Hex-encoded hash or null if invalid input
 */
function hashContent(content) {
  if (!content || typeof content !== 'string') {
    return null;
  }

  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Generate a cache key for AI scoring results
 * Combines content hash with rubric version to ensure cache invalidation
 * when scoring rules change
 *
 * @param {string} content - The page content (cleaned text)
 * @param {string} rubricVersion - The rubric version identifier
 * @returns {string|null} - Cache key or null if invalid inputs
 */
function generateAICacheKey(content, rubricVersion) {
  if (!content || typeof content !== 'string') {
    return null;
  }
  if (!rubricVersion || typeof rubricVersion !== 'string') {
    return null;
  }

  // Combine content and rubric version for cache key
  const combined = content + rubricVersion;
  return crypto.createHash('sha256').update(combined).digest('hex');
}

/**
 * Generate a cache key for embeddings
 * Combines content with model version to ensure cache invalidation
 * when embedding models change
 *
 * @param {string} content - The content to embed
 * @param {string} modelVersion - The embedding model version
 * @returns {string|null} - Cache key or null if invalid inputs
 */
function generateEmbeddingCacheKey(content, modelVersion) {
  if (!content || typeof content !== 'string') {
    return null;
  }
  if (!modelVersion || typeof modelVersion !== 'string') {
    return null;
  }

  const combined = content + modelVersion;
  return crypto.createHash('sha256').update(combined).digest('hex');
}

/**
 * Check if two content strings are identical by comparing their hashes
 * More efficient than direct string comparison for large content
 *
 * @param {string} content1 - First content string
 * @param {string} content2 - Second content string
 * @returns {boolean} - True if content is identical
 */
function isContentIdentical(content1, content2) {
  if (!content1 || !content2) {
    return false;
  }

  const hash1 = hashContent(content1);
  const hash2 = hashContent(content2);

  return hash1 === hash2;
}

/**
 * Generate a deterministic hash of multiple values
 * Useful for composite cache keys
 *
 * @param {Array<string>} values - Array of strings to hash together
 * @returns {string|null} - Hex-encoded hash or null if invalid input
 */
function hashMultiple(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  // Validate all values are strings
  if (!values.every(v => typeof v === 'string')) {
    return null;
  }

  // Join with delimiter to prevent collision (e.g., ["ab", "c"] vs ["a", "bc"])
  const combined = values.join('||');
  return crypto.createHash('sha256').update(combined).digest('hex');
}

/**
 * Generate a short hash (first 16 characters) for display/logging purposes
 * Not for security-critical operations
 *
 * @param {string} content - Content to hash
 * @returns {string|null} - Shortened hash or null if invalid
 */
function shortHash(content) {
  const fullHash = hashContent(content);
  return fullHash ? fullHash.substring(0, 16) : null;
}

/**
 * Compare a content string against a known hash
 * Useful for quick validation without storing full content
 *
 * @param {string} content - Content to verify
 * @param {string} expectedHash - The hash to compare against
 * @returns {boolean} - True if content matches hash
 */
function verifyContentHash(content, expectedHash) {
  if (!content || !expectedHash) {
    return false;
  }

  const actualHash = hashContent(content);
  return actualHash === expectedHash;
}

/**
 * Cache key configuration for different content types
 */
const CACHE_PREFIXES = {
  AI_SCORE: 'ai_score:',
  EMBEDDING: 'embedding:',
  SNAPSHOT: 'snapshot:',
  RECOMMENDATION: 'recommendation:'
};

/**
 * Generate a namespaced cache key with prefix
 *
 * @param {string} prefix - Cache namespace prefix
 * @param {string} content - Content to hash
 * @param {string} version - Version identifier
 * @returns {string|null} - Prefixed cache key
 */
function generateNamespacedKey(prefix, content, version) {
  if (!Object.values(CACHE_PREFIXES).includes(prefix)) {
    return null;
  }

  const hash = hashMultiple([content, version]);
  return hash ? `${prefix}${hash}` : null;
}

module.exports = {
  hashContent,
  generateAICacheKey,
  generateEmbeddingCacheKey,
  isContentIdentical,
  hashMultiple,
  shortHash,
  verifyContentHash,
  generateNamespacedKey,
  CACHE_PREFIXES
};
