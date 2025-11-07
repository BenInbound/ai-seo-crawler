/**
 * PageSnapshot Model
 *
 * Immutable versioned capture of page content at a specific point in time.
 * Based on data-model.md entity definition.
 *
 * Fields:
 * - id (UUID, PK) - Unique identifier
 * - page_id (UUID, FK → pages.id, NOT NULL)
 * - crawl_run_id (UUID, FK → crawl_runs.id, NOT NULL)
 * - url (TEXT, NOT NULL) - URL at time of snapshot
 * - status_code (INTEGER, NOT NULL) - HTTP response code
 * - raw_html (TEXT) - Complete HTML response
 * - cleaned_text (TEXT) - Extracted main content
 * - content_hash (TEXT, NOT NULL) - SHA-256 hash of cleaned_text
 * - extraction (JSONB, NOT NULL) - Structured content
 * - metrics (JSONB) - Performance data
 * - snapshot_at (TIMESTAMPTZ, DEFAULT NOW())
 *
 * Extraction fields:
 * - title, meta_description, canonical_url, headings, body, faq,
 *   internal_links, outbound_links, schema_types, author, date_published
 *
 * Metrics fields:
 * - load_time_ms, content_length, word_count, render_method
 *
 * RLS Policy:
 * - Users can SELECT snapshots for pages they have access to
 * - System (service role) can INSERT only (immutable after creation)
 */

const crypto = require('crypto');

/**
 * Get Supabase client (will be imported from database service)
 */
let supabase;

function setSupabaseClient(client) {
  supabase = client;
}

/**
 * Generate SHA-256 hash of content for duplicate detection
 *
 * @param {string} content - Content to hash
 * @returns {string} - Hex-encoded SHA-256 hash
 */
function generateContentHash(content) {
  return crypto
    .createHash('sha256')
    .update(content || '')
    .digest('hex');
}

/**
 * Default extraction structure
 */
const DEFAULT_EXTRACTION = {
  title: null,
  meta_description: null,
  canonical_url: null,
  headings: [],
  body: null,
  faq: [],
  internal_links: [],
  outbound_links: [],
  schema_types: [],
  author: null,
  date_published: null
};

/**
 * Default metrics structure
 */
const DEFAULT_METRICS = {
  load_time_ms: null,
  content_length: null,
  word_count: null,
  render_method: 'static'
};

/**
 * Validate extraction structure
 *
 * @param {Object} extraction - Extraction object to validate
 * @returns {Object} - Validation result { valid: boolean, errors: Array<string> }
 */
function validateExtraction(extraction) {
  const errors = [];

  if (typeof extraction !== 'object' || extraction === null) {
    errors.push('extraction must be an object');
    return { valid: false, errors };
  }

  // Validate arrays
  const arrayFields = ['headings', 'faq', 'internal_links', 'outbound_links', 'schema_types'];

  arrayFields.forEach(field => {
    if (extraction[field] !== undefined && !Array.isArray(extraction[field])) {
      errors.push(`extraction.${field} must be an array`);
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Create a new snapshot
 *
 * @param {Object} data - Snapshot data
 * @param {string} data.page_id - Page UUID
 * @param {string} data.crawl_run_id - Crawl run UUID
 * @param {string} data.url - URL at time of snapshot
 * @param {number} data.status_code - HTTP status code
 * @param {string} data.raw_html - Complete HTML response
 * @param {string} data.cleaned_text - Extracted main content
 * @param {Object} data.extraction - Structured content extraction
 * @param {Object} data.metrics - Performance metrics
 * @returns {Promise<Object>} - Created snapshot
 */
async function create(data) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // Validation
  if (!data.page_id) {
    throw new Error('page_id is required');
  }

  if (!data.crawl_run_id) {
    throw new Error('crawl_run_id is required');
  }

  if (!data.url) {
    throw new Error('url is required');
  }

  if (!data.status_code || typeof data.status_code !== 'number') {
    throw new Error('status_code is required and must be a number');
  }

  // Validate extraction if provided
  const extraction = { ...DEFAULT_EXTRACTION, ...(data.extraction || {}) };
  const extractionValidation = validateExtraction(extraction);

  if (!extractionValidation.valid) {
    throw new Error(`Invalid extraction: ${extractionValidation.errors.join(', ')}`);
  }

  // Merge with default metrics
  const metrics = { ...DEFAULT_METRICS, ...(data.metrics || {}) };

  // Generate content hash
  const contentHash = generateContentHash(data.cleaned_text);

  const snapshot = {
    page_id: data.page_id,
    crawl_run_id: data.crawl_run_id,
    url: data.url,
    status_code: data.status_code,
    raw_html: data.raw_html || null,
    cleaned_text: data.cleaned_text || null,
    content_hash: contentHash,
    extraction,
    metrics,
    snapshot_at: new Date().toISOString()
  };

  const { data: result, error } = await supabase
    .from('page_snapshots')
    .insert([snapshot])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return result;
}

/**
 * Get snapshot by ID
 *
 * @param {string} id - Snapshot UUID
 * @returns {Promise<Object|null>} - Snapshot or null if not found
 */
async function getById(id) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase.from('page_snapshots').select('*').eq('id', id).single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw error;
  }

  return data;
}

/**
 * List snapshots for a page
 *
 * @param {string} pageId - Page UUID
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of results
 * @param {number} options.offset - Offset for pagination
 * @returns {Promise<Array>} - List of snapshots ordered by snapshot_at desc
 */
async function listByPage(pageId, options = {}) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  let query = supabase
    .from('page_snapshots')
    .select('*')
    .eq('page_id', pageId)
    .order('snapshot_at', { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * List snapshots for a crawl run
 *
 * @param {string} crawlRunId - Crawl run UUID
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of results
 * @param {number} options.offset - Offset for pagination
 * @returns {Promise<Array>} - List of snapshots
 */
async function listByCrawlRun(crawlRunId, options = {}) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  let query = supabase
    .from('page_snapshots')
    .select('*')
    .eq('crawl_run_id', crawlRunId)
    .order('snapshot_at', { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Find latest snapshot for a page
 *
 * @param {string} pageId - Page UUID
 * @returns {Promise<Object|null>} - Latest snapshot or null
 */
async function getLatestByPage(pageId) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase
    .from('page_snapshots')
    .select('*')
    .eq('page_id', pageId)
    .order('snapshot_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw error;
  }

  return data;
}

/**
 * Check if content has changed since last snapshot
 *
 * @param {string} pageId - Page UUID
 * @param {string} contentHash - Hash of new content
 * @returns {Promise<boolean>} - True if content changed
 */
async function hasContentChanged(pageId, contentHash) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const latest = await getLatestByPage(pageId);

  if (!latest) {
    return true; // No previous snapshot, content is "changed"
  }

  return latest.content_hash !== contentHash;
}

/**
 * Find snapshots with same content hash (duplicates)
 *
 * @param {string} contentHash - Content hash to search for
 * @param {number} limit - Maximum results
 * @returns {Promise<Array>} - List of snapshots with same content
 */
async function findByContentHash(contentHash, limit = 10) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase
    .from('page_snapshots')
    .select('*')
    .eq('content_hash', contentHash)
    .order('snapshot_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Get snapshot statistics for a crawl run
 *
 * @param {string} crawlRunId - Crawl run UUID
 * @returns {Promise<Object>} - Statistics (total, by_status_code)
 */
async function getStatsByCrawlRun(crawlRunId) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // Get all snapshots for this crawl run
  const snapshots = await listByCrawlRun(crawlRunId, { limit: 10000 });

  // Calculate statistics
  const stats = {
    total: snapshots.length,
    by_status_code: {},
    successful: 0,
    failed: 0
  };

  snapshots.forEach(snapshot => {
    const code = snapshot.status_code;
    stats.by_status_code[code] = (stats.by_status_code[code] || 0) + 1;

    if (code >= 200 && code < 300) {
      stats.successful++;
    } else if (code >= 400) {
      stats.failed++;
    }
  });

  return stats;
}

/**
 * Bulk insert snapshots (for efficient batch operations)
 *
 * @param {Array} snapshots - Array of snapshot objects
 * @returns {Promise<Array>} - Created snapshots
 */
async function bulkInsert(snapshots) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    throw new Error('snapshots must be a non-empty array');
  }

  // Process each snapshot to add defaults and content hash
  const processedSnapshots = snapshots.map(snapshot => {
    const extraction = { ...DEFAULT_EXTRACTION, ...(snapshot.extraction || {}) };
    const metrics = { ...DEFAULT_METRICS, ...(snapshot.metrics || {}) };
    const contentHash = generateContentHash(snapshot.cleaned_text);

    return {
      ...snapshot,
      content_hash: contentHash,
      extraction,
      metrics,
      snapshot_at: snapshot.snapshot_at || new Date().toISOString()
    };
  });

  const { data, error } = await supabase.from('page_snapshots').insert(processedSnapshots).select();

  if (error) {
    throw error;
  }

  return data || [];
}

module.exports = {
  setSupabaseClient,
  generateContentHash,
  DEFAULT_EXTRACTION,
  DEFAULT_METRICS,
  create,
  getById,
  listByPage,
  listByCrawlRun,
  getLatestByPage,
  hasContentChanged,
  findByContentHash,
  getStatsByCrawlRun,
  bulkInsert
};
