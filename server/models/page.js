/**
 * Page Model
 *
 * Represents a unique URL discovered during crawling. One record per unique normalized URL.
 * Based on data-model.md entity definition.
 *
 * Fields:
 * - id (UUID, PK) - Unique identifier
 * - project_id (UUID, FK → projects.id, NOT NULL)
 * - url (TEXT, NOT NULL) - Normalized canonical URL
 * - url_hash (TEXT, NOT NULL) - SHA-256 hash of normalized URL for fast lookup
 * - page_type (TEXT) - One of: 'homepage', 'product', 'solution', 'blog', 'resource', 'conversion'
 * - first_discovered_at (TIMESTAMPTZ, NOT NULL) - When first seen
 * - last_crawled_at (TIMESTAMPTZ) - Most recent successful crawl
 * - last_crawl_run_id (UUID, FK → crawl_runs.id) - Most recent crawl run
 * - current_snapshot_id (UUID, FK → page_snapshots.id) - Latest snapshot
 * - current_score_id (UUID, FK → page_scores.id) - Latest score
 *
 * RLS Policy:
 * - Users can SELECT pages for projects they have access to
 * - System (service role) can INSERT/UPDATE
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
 * Valid page types
 */
const PAGE_TYPES = ['homepage', 'product', 'solution', 'blog', 'resource', 'conversion'];

/**
 * Validate page type
 *
 * @param {string} pageType - Page type to validate
 * @returns {boolean} - True if valid
 */
function isValidPageType(pageType) {
  return PAGE_TYPES.includes(pageType);
}

/**
 * Generate SHA-256 hash of URL for fast lookup
 *
 * @param {string} url - URL to hash
 * @returns {string} - Hex-encoded SHA-256 hash
 */
function generateUrlHash(url) {
  return crypto.createHash('sha256').update(url).digest('hex');
}

/**
 * Normalize URL for consistent storage
 *
 * @param {string} url - URL to normalize
 * @returns {string} - Normalized URL
 */
function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    // Remove trailing slash, lowercase domain, sort query params
    parsed.hostname = parsed.hostname.toLowerCase();
    if (parsed.pathname.endsWith('/') && parsed.pathname.length > 1) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    return parsed.toString();
  } catch {
    return url; // Return original if parsing fails
  }
}

/**
 * Create or update a page
 * If page with same URL hash exists, update it. Otherwise, create new.
 *
 * @param {Object} data - Page data
 * @param {string} data.project_id - Project UUID
 * @param {string} data.url - Page URL (will be normalized)
 * @param {string} data.page_type - Type of page
 * @param {string} data.last_crawl_run_id - Crawl run UUID
 * @returns {Promise<Object>} - Created or updated page
 */
async function upsert(data) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // Validation
  if (!data.project_id) {
    throw new Error('project_id is required');
  }

  if (!data.url) {
    throw new Error('url is required');
  }

  if (data.page_type && !isValidPageType(data.page_type)) {
    throw new Error(`page_type must be one of: ${PAGE_TYPES.join(', ')}`);
  }

  // Normalize URL and generate hash
  const normalizedUrl = normalizeUrl(data.url);
  const urlHash = generateUrlHash(normalizedUrl);

  // Check if page already exists
  const existing = await findByUrlHash(data.project_id, urlHash);

  if (existing) {
    // Update existing page
    const updates = {
      last_crawled_at: new Date().toISOString()
    };

    if (data.page_type) {
      updates.page_type = data.page_type;
    }

    if (data.last_crawl_run_id) {
      updates.last_crawl_run_id = data.last_crawl_run_id;
    }

    if (data.current_snapshot_id) {
      updates.current_snapshot_id = data.current_snapshot_id;
    }

    if (data.current_score_id) {
      updates.current_score_id = data.current_score_id;
    }

    const { data: result, error } = await supabase
      .from('pages')
      .update(updates)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return result;
  } else {
    // Create new page
    const page = {
      project_id: data.project_id,
      url: normalizedUrl,
      url_hash: urlHash,
      page_type: data.page_type || null,
      first_discovered_at: new Date().toISOString(),
      last_crawled_at: data.last_crawl_run_id ? new Date().toISOString() : null,
      last_crawl_run_id: data.last_crawl_run_id || null,
      current_snapshot_id: data.current_snapshot_id || null,
      current_score_id: data.current_score_id || null
    };

    const { data: result, error } = await supabase.from('pages').insert([page]).select().single();

    if (error) {
      throw error;
    }

    return result;
  }
}

/**
 * Find page by URL hash within a project
 *
 * @param {string} projectId - Project UUID
 * @param {string} urlHash - URL hash
 * @returns {Promise<Object|null>} - Page or null if not found
 */
async function findByUrlHash(projectId, urlHash) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('project_id', projectId)
    .eq('url_hash', urlHash)
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
 * Get page by ID
 *
 * @param {string} id - Page UUID
 * @returns {Promise<Object|null>} - Page or null if not found
 */
async function getById(id) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase.from('pages').select('*').eq('id', id).single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw error;
  }

  return data;
}

/**
 * List pages for a project
 *
 * @param {string} projectId - Project UUID
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of results
 * @param {number} options.offset - Offset for pagination
 * @param {string} options.page_type - Filter by page type
 * @param {string} options.order_by - Field to order by ('last_crawled_at', 'first_discovered_at', 'url')
 * @param {boolean} options.ascending - Sort order (default: false)
 * @returns {Promise<Array>} - List of pages
 */
async function listByProject(projectId, options = {}) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  let query = supabase.from('pages').select('*').eq('project_id', projectId);

  if (options.page_type) {
    query = query.eq('page_type', options.page_type);
  }

  const orderBy = options.order_by || 'last_crawled_at';
  const ascending = options.ascending !== undefined ? options.ascending : false;
  query = query.order(orderBy, { ascending });

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
 * Count pages for a project
 *
 * @param {string} projectId - Project UUID
 * @param {Object} filters - Optional filters
 * @param {string} filters.page_type - Filter by page type
 * @returns {Promise<number>} - Total count
 */
async function countByProject(projectId, filters = {}) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  let query = supabase
    .from('pages')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId);

  if (filters.page_type) {
    query = query.eq('page_type', filters.page_type);
  }

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count || 0;
}

/**
 * Update page metadata
 *
 * @param {string} id - Page UUID
 * @param {Object} updates - Fields to update
 * @param {string} updates.page_type - Updated page type
 * @param {string} updates.current_snapshot_id - Latest snapshot UUID
 * @param {string} updates.current_score_id - Latest score UUID
 * @returns {Promise<Object>} - Updated page
 */
async function update(id, updates) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // Validation
  if (updates.page_type && !isValidPageType(updates.page_type)) {
    throw new Error(`page_type must be one of: ${PAGE_TYPES.join(', ')}`);
  }

  const { data, error } = await supabase
    .from('pages')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get pages that haven't been crawled recently (stale pages)
 *
 * @param {string} projectId - Project UUID
 * @param {number} daysStale - Days since last crawl
 * @param {number} limit - Maximum results
 * @returns {Promise<Array>} - List of stale pages
 */
async function getStalePages(projectId, daysStale = 7, limit = 100) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - daysStale);

  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('project_id', projectId)
    .or(`last_crawled_at.is.null,last_crawled_at.lt.${staleDate.toISOString()}`)
    .order('first_discovered_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Bulk insert pages (for efficient batch operations)
 *
 * @param {Array} pages - Array of page objects
 * @returns {Promise<Array>} - Created pages
 */
async function bulkInsert(pages) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  if (!Array.isArray(pages) || pages.length === 0) {
    throw new Error('pages must be a non-empty array');
  }

  // Normalize URLs and generate hashes
  const normalizedPages = pages.map(page => {
    const normalizedUrl = normalizeUrl(page.url);
    return {
      ...page,
      url: normalizedUrl,
      url_hash: generateUrlHash(normalizedUrl),
      first_discovered_at: page.first_discovered_at || new Date().toISOString()
    };
  });

  const { data, error } = await supabase.from('pages').insert(normalizedPages).select();

  if (error) {
    throw error;
  }

  return data || [];
}

module.exports = {
  setSupabaseClient,
  PAGE_TYPES,
  generateUrlHash,
  normalizeUrl,
  upsert,
  findByUrlHash,
  getById,
  listByProject,
  countByProject,
  update,
  getStalePages,
  bulkInsert
};
