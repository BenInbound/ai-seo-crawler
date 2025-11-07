/**
 * CrawlRun Model
 *
 * Represents a single execution of the crawler. Tracks progress and configuration.
 * Based on data-model.md entity definition.
 *
 * Fields:
 * - id (UUID, PK) - Unique identifier
 * - project_id (UUID, FK → projects.id, NOT NULL)
 * - run_type (TEXT, NOT NULL) - One of: 'full', 'sitemap_only', 'sample', 'delta'
 * - status (TEXT, NOT NULL) - One of: 'queued', 'running', 'paused', 'completed', 'failed'
 * - config_snapshot (JSONB, NOT NULL) - Copy of project config at run time
 * - pages_discovered (INTEGER, DEFAULT 0) - Total URLs found
 * - pages_processed (INTEGER, DEFAULT 0) - Pages fully crawled and scored
 * - token_usage (INTEGER, DEFAULT 0) - Cumulative token count
 * - error_message (TEXT) - Error details if status=failed
 * - started_at (TIMESTAMPTZ, DEFAULT NOW())
 * - completed_at (TIMESTAMPTZ)
 * - created_by (UUID, FK → users.id, NOT NULL)
 *
 * RLS Policy:
 * - Users can SELECT/INSERT/UPDATE runs for projects they have access to
 * - Editors and admins can start runs, viewers can only view
 */

/**
 * Get Supabase client (will be imported from database service)
 */
let supabase;

function setSupabaseClient(client) {
  supabase = client;
}

/**
 * Valid run types
 */
const RUN_TYPES = ['full', 'sitemap_only', 'sample', 'delta'];

/**
 * Valid statuses
 */
const STATUSES = ['queued', 'running', 'paused', 'completed', 'failed'];

/**
 * Validate run type
 *
 * @param {string} runType - Run type to validate
 * @returns {boolean} - True if valid
 */
function isValidRunType(runType) {
  return RUN_TYPES.includes(runType);
}

/**
 * Validate status
 *
 * @param {string} status - Status to validate
 * @returns {boolean} - True if valid
 */
function isValidStatus(status) {
  return STATUSES.includes(status);
}

/**
 * Create a new crawl run
 *
 * @param {Object} data - Crawl run data
 * @param {string} data.project_id - Project UUID
 * @param {string} data.run_type - Type of run
 * @param {Object} data.config_snapshot - Project configuration snapshot
 * @param {string} data.created_by - User UUID who initiated the run
 * @returns {Promise<Object>} - Created crawl run
 */
async function create(data) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // Validation
  if (!data.project_id) {
    throw new Error('project_id is required');
  }

  if (!data.run_type || !isValidRunType(data.run_type)) {
    throw new Error(`run_type must be one of: ${RUN_TYPES.join(', ')}`);
  }

  if (!data.config_snapshot || typeof data.config_snapshot !== 'object') {
    throw new Error('config_snapshot is required and must be an object');
  }

  if (!data.created_by) {
    throw new Error('created_by is required');
  }

  const crawlRun = {
    project_id: data.project_id,
    run_type: data.run_type,
    status: 'queued', // Initial status
    config_snapshot: data.config_snapshot,
    pages_discovered: 0,
    pages_processed: 0,
    token_usage: 0,
    created_by: data.created_by,
    started_at: new Date().toISOString()
  };

  const { data: result, error } = await supabase
    .from('crawl_runs')
    .insert([crawlRun])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return result;
}

/**
 * Get crawl run by ID
 *
 * @param {string} id - Crawl run UUID
 * @returns {Promise<Object|null>} - Crawl run or null if not found
 */
async function getById(id) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase.from('crawl_runs').select('*').eq('id', id).single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw error;
  }

  return data;
}

/**
 * List crawl runs for a project
 *
 * @param {string} projectId - Project UUID
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of results
 * @param {number} options.offset - Offset for pagination
 * @param {string} options.status - Filter by status
 * @returns {Promise<Array>} - List of crawl runs
 */
async function listByProject(projectId, options = {}) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  let query = supabase
    .from('crawl_runs')
    .select('*')
    .eq('project_id', projectId)
    .order('started_at', { ascending: false });

  if (options.status) {
    query = query.eq('status', options.status);
  }

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
 * Update crawl run status and progress
 *
 * @param {string} id - Crawl run UUID
 * @param {Object} updates - Fields to update
 * @param {string} updates.status - New status
 * @param {number} updates.pages_discovered - Updated count
 * @param {number} updates.pages_processed - Updated count
 * @param {number} updates.token_usage - Updated token count
 * @param {string} updates.error_message - Error message if failed
 * @returns {Promise<Object>} - Updated crawl run
 */
async function update(id, updates) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // Validation
  if (updates.status && !isValidStatus(updates.status)) {
    throw new Error(`status must be one of: ${STATUSES.join(', ')}`);
  }

  if (updates.pages_processed && updates.pages_discovered) {
    if (updates.pages_processed > updates.pages_discovered) {
      throw new Error('pages_processed cannot exceed pages_discovered');
    }
  }

  // Automatically set completed_at if status is completed or failed
  if (updates.status && (updates.status === 'completed' || updates.status === 'failed')) {
    if (!updates.completed_at) {
      updates.completed_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from('crawl_runs')
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
 * Increment page counts atomically
 *
 * @param {string} id - Crawl run UUID
 * @param {Object} increments - Fields to increment
 * @param {number} increments.pages_discovered - Number to add to pages_discovered
 * @param {number} increments.pages_processed - Number to add to pages_processed
 * @param {number} increments.token_usage - Number to add to token_usage
 * @returns {Promise<Object>} - Updated crawl run
 */
async function incrementCounts(id, increments) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // Get current values
  const current = await getById(id);
  if (!current) {
    throw new Error('Crawl run not found');
  }

  const updates = {};

  if (increments.pages_discovered) {
    updates.pages_discovered = current.pages_discovered + increments.pages_discovered;
  }

  if (increments.pages_processed) {
    updates.pages_processed = current.pages_processed + increments.pages_processed;
  }

  if (increments.token_usage) {
    updates.token_usage = current.token_usage + increments.token_usage;
  }

  return update(id, updates);
}

/**
 * Pause a running crawl run
 *
 * @param {string} id - Crawl run UUID
 * @returns {Promise<Object>} - Updated crawl run
 */
async function pause(id) {
  const current = await getById(id);

  if (!current) {
    throw new Error('Crawl run not found');
  }

  if (current.status !== 'running' && current.status !== 'queued') {
    throw new Error(`Cannot pause crawl run with status: ${current.status}`);
  }

  return update(id, { status: 'paused' });
}

/**
 * Resume a paused crawl run
 *
 * @param {string} id - Crawl run UUID
 * @returns {Promise<Object>} - Updated crawl run
 */
async function resume(id) {
  const current = await getById(id);

  if (!current) {
    throw new Error('Crawl run not found');
  }

  if (current.status !== 'paused') {
    throw new Error(`Cannot resume crawl run with status: ${current.status}`);
  }

  return update(id, { status: 'running' });
}

/**
 * Mark crawl run as failed
 *
 * @param {string} id - Crawl run UUID
 * @param {string} errorMessage - Error description
 * @returns {Promise<Object>} - Updated crawl run
 */
async function fail(id, errorMessage) {
  return update(id, {
    status: 'failed',
    error_message: errorMessage,
    completed_at: new Date().toISOString()
  });
}

/**
 * Mark crawl run as completed
 *
 * @param {string} id - Crawl run UUID
 * @returns {Promise<Object>} - Updated crawl run
 */
async function complete(id) {
  return update(id, {
    status: 'completed',
    completed_at: new Date().toISOString()
  });
}

/**
 * Get active (running or queued) crawl runs
 *
 * @returns {Promise<Array>} - List of active crawl runs
 */
async function getActive() {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase
    .from('crawl_runs')
    .select('*')
    .in('status', ['queued', 'running'])
    .order('started_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

module.exports = {
  setSupabaseClient,
  RUN_TYPES,
  STATUSES,
  create,
  getById,
  listByProject,
  update,
  incrementCounts,
  pause,
  resume,
  fail,
  complete,
  getActive
};
