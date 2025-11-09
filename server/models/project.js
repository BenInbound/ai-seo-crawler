/**
 * Project Model
 *
 * Represents a website being analyzed for AEO readiness. Belongs to one organization.
 * Based on data-model.md entity definition.
 *
 * Fields:
 * - id (UUID, PK) - Unique identifier
 * - organization_id (UUID, FK → organizations.id, NOT NULL)
 * - name (TEXT, NOT NULL) - Project display name
 * - target_url (TEXT, NOT NULL) - Root URL of website to crawl
 * - description (TEXT) - Optional project description
 * - config (JSONB, DEFAULT '{}') - Crawl configuration
 * - created_by (UUID, FK → users.id, NOT NULL)
 * - created_at (TIMESTAMPTZ, DEFAULT NOW())
 * - updated_at (TIMESTAMPTZ, DEFAULT NOW())
 *
 * Config fields:
 * - depth_limit (INTEGER, default 3) - Max crawl depth
 * - sample_size (INTEGER, nullable) - For sample crawls
 * - token_limit (INTEGER, nullable) - Max tokens per crawl
 * - excluded_patterns (ARRAY) - URL patterns to skip
 *
 * RLS Policy:
 * - Users can SELECT/INSERT/UPDATE/DELETE projects for their organizations
 * - Editors and admins can mutate, viewers can only SELECT
 */

/**
 * Get Supabase client (will be imported from database service)
 */
let supabase;

function setSupabaseClient(client) {
  supabase = client;
}

/**
 * Default configuration for new projects
 */
const DEFAULT_CONFIG = {
  depth_limit: 3,
  sample_size: null,
  token_limit: null,
  excluded_patterns: []
};

/**
 * Validate URL format
 *
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid URL
 */
function isValidUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate configuration
 *
 * @param {Object} config - Configuration object
 * @returns {Object} - Validation result { valid: boolean, errors: Array<string> }
 */
function validateConfig(config) {
  const errors = [];

  if (config.depth_limit !== undefined) {
    if (
      typeof config.depth_limit !== 'number' ||
      config.depth_limit < 1 ||
      config.depth_limit > 10
    ) {
      errors.push('depth_limit must be between 1 and 10');
    }
  }

  if (config.sample_size !== undefined && config.sample_size !== null) {
    if (typeof config.sample_size !== 'number' || config.sample_size <= 0) {
      errors.push('sample_size must be greater than 0');
    }
  }

  if (config.token_limit !== undefined && config.token_limit !== null) {
    if (typeof config.token_limit !== 'number' || config.token_limit <= 0) {
      errors.push('token_limit must be greater than 0');
    }
  }

  if (config.excluded_patterns !== undefined) {
    if (!Array.isArray(config.excluded_patterns)) {
      errors.push('excluded_patterns must be an array');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create a new project
 *
 * @param {Object} projectData - Project data
 * @param {string} projectData.organization_id - Organization UUID
 * @param {string} projectData.name - Project display name
 * @param {string} projectData.target_url - Root URL to crawl
 * @param {string} [projectData.description] - Optional description
 * @param {Object} [projectData.config] - Crawl configuration
 * @param {string} projectData.created_by - User UUID who created the project
 * @returns {Promise<Object>} - Created project record
 */
async function createProject(projectData) {
  if (!projectData.organization_id) {
    throw new Error('Organization ID is required');
  }

  if (!projectData.name || projectData.name.trim().length === 0) {
    throw new Error('Project name is required');
  }

  if (!projectData.target_url || !isValidUrl(projectData.target_url)) {
    throw new Error('Valid target URL is required (must start with http:// or https://)');
  }

  if (!projectData.created_by) {
    throw new Error('Creator user ID is required');
  }

  const config = { ...DEFAULT_CONFIG, ...projectData.config };
  const validation = validateConfig(config);

  if (!validation.valid) {
    throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
  }

  const { data, error } = await supabase
    .from('projects')
    .insert([
      {
        organization_id: projectData.organization_id,
        name: projectData.name.trim(),
        target_url: projectData.target_url,
        description: projectData.description || null,
        config,
        created_by: projectData.created_by
      }
    ])
    .select()
    .single();

  if (error) {
    if (error.code === '23503') {
      // Foreign key constraint violation
      throw new Error('Invalid organization or user ID');
    }
    throw new Error(`Failed to create project: ${error.message}`);
  }

  return data;
}

/**
 * Find project by ID
 *
 * @param {string} projectId - Project UUID
 * @returns {Promise<Object|null>} - Project record or null if not found
 */
async function findProjectById(projectId) {
  const { data, error } = await supabase.from('projects').select('*').eq('id', projectId).single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to find project: ${error.message}`);
  }

  return data;
}

/**
 * Get all projects for an organization
 *
 * @param {string} organizationId - Organization UUID
 * @param {Object} options - Query options
 * @param {number} [options.limit] - Maximum number of results
 * @param {number} [options.offset] - Offset for pagination
 * @param {string} [options.orderBy] - Field to order by (default: 'created_at')
 * @param {boolean} [options.ascending] - Sort order (default: false)
 * @returns {Promise<Array>} - Array of project records
 */
async function getOrganizationProjects(organizationId, options = {}) {
  const { limit, offset, orderBy = 'created_at', ascending = false } = options;

  let query = supabase
    .from('projects')
    .select('*')
    .eq('organization_id', organizationId)
    .order(orderBy, { ascending });

  if (limit) {
    query = query.limit(limit);
  }

  if (offset) {
    query = query.range(offset, offset + (limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get projects: ${error.message}`);
  }

  return data;
}

/**
 * Update project
 *
 * @param {string} projectId - Project UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated project record
 */
async function updateProject(projectId, updates) {
  const allowedFields = ['name', 'target_url', 'description', 'config'];
  const filteredUpdates = {};

  Object.keys(updates).forEach(key => {
    if (allowedFields.includes(key)) {
      filteredUpdates[key] = updates[key];
    }
  });

  // Validate config if provided
  if (filteredUpdates.config) {
    const validation = validateConfig(filteredUpdates.config);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }
  }

  // Validate target_url if provided
  if (filteredUpdates.target_url && !isValidUrl(filteredUpdates.target_url)) {
    throw new Error('Invalid target URL format');
  }

  filteredUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('projects')
    .update(filteredUpdates)
    .eq('id', projectId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update project: ${error.message}`);
  }

  return data;
}

/**
 * Delete project
 * Note: This will cascade delete related crawl runs, pages, etc.
 *
 * @param {string} projectId - Project UUID
 * @returns {Promise<boolean>} - True if deleted successfully
 */
async function deleteProject(projectId) {
  const { error } = await supabase.from('projects').delete().eq('id', projectId);

  if (error) {
    throw new Error(`Failed to delete project: ${error.message}`);
  }

  return true;
}

/**
 * Get project with related stats
 *
 * @param {string} projectId - Project UUID
 * @returns {Promise<Object|null>} - Project with crawl and page counts
 */
async function getProjectWithStats(projectId) {
  const project = await findProjectById(projectId);

  if (!project) {
    return null;
  }

  // Get crawl run count
  const { count: crawlCount, error: crawlError } = await supabase
    .from('crawl_runs')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId);

  if (crawlError) {
    throw new Error(`Failed to get crawl count: ${crawlError.message}`);
  }

  // Get page count
  const { count: pageCount, error: pageError } = await supabase
    .from('pages')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId);

  if (pageError) {
    throw new Error(`Failed to get page count: ${pageError.message}`);
  }

  return {
    ...project,
    crawl_count: crawlCount || 0,
    page_count: pageCount || 0
  };
}

/**
 * Search projects by name
 *
 * @param {string} organizationId - Organization UUID
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} - Array of matching projects
 */
async function searchProjects(organizationId, searchTerm) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('organization_id', organizationId)
    .ilike('name', `%${searchTerm}%`)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to search projects: ${error.message}`);
  }

  return data;
}

/**
 * Get recent projects for an organization
 *
 * @param {string} organizationId - Organization UUID
 * @param {number} limit - Maximum number of results (default 5)
 * @returns {Promise<Array>} - Array of recent projects
 */
async function getRecentProjects(organizationId, limit = 5) {
  return getOrganizationProjects(organizationId, {
    limit,
    orderBy: 'updated_at',
    ascending: false
  });
}

/**
 * Check if user has access to project (via organization membership)
 *
 * @param {string} userId - User UUID
 * @param {string} projectId - Project UUID
 * @returns {Promise<boolean>} - True if user has access
 */
async function hasProjectAccess(userId, projectId) {
  const project = await findProjectById(projectId);

  if (!project) {
    return false;
  }

  // Check if user is a member of the project's organization
  const { data, error } = await supabase
    .from('org_members')
    .select('id')
    .eq('user_id', userId)
    .eq('organization_id', project.organization_id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return false;
    }
    throw new Error(`Failed to check access: ${error.message}`);
  }

  return !!data;
}

/**
 * Get all projects across all organizations
 * Used for shared project view where all users can see all projects
 *
 * @param {Object} [options] - Query options
 * @param {number} [options.limit] - Max results
 * @param {number} [options.offset] - Pagination offset
 * @param {string} [options.orderBy] - Field to order by (default: 'created_at')
 * @param {boolean} [options.ascending] - Sort order (default: false)
 * @returns {Promise<Array>} - Array of project records with organization info
 */
async function getAllProjects(options = {}) {
  const { limit, offset, orderBy = 'created_at', ascending = false } = options;

  let query = supabase
    .from('projects')
    .select(`
      *,
      organizations (
        id,
        name
      )
    `)
    .order(orderBy, { ascending });

  if (limit) {
    query = query.limit(limit);
  }

  if (offset) {
    query = query.range(offset, offset + (limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get all projects: ${error.message}`);
  }

  // Flatten organization data into project object
  return data.map(project => ({
    ...project,
    organization_name: project.organizations?.name || 'Unknown'
  }));
}

module.exports = {
  setSupabaseClient,
  createProject,
  findProjectById,
  getOrganizationProjects,
  getAllProjects,
  updateProject,
  deleteProject,
  getProjectWithStats,
  searchProjects,
  getRecentProjects,
  hasProjectAccess,
  isValidUrl,
  validateConfig,
  DEFAULT_CONFIG
};
