/**
 * Organization Model
 *
 * Represents a client or company using the platform. Complete isolation from other organizations.
 * Based on data-model.md entity definition.
 *
 * Fields:
 * - id (UUID, PK) - Unique identifier
 * - name (TEXT, NOT NULL) - Organization display name
 * - slug (TEXT, UNIQUE, NOT NULL) - URL-friendly identifier
 * - settings (JSONB, DEFAULT '{}') - Organization-specific configuration
 * - billing_email (TEXT) - Contact for billing/admin
 * - created_at (TIMESTAMPTZ, DEFAULT NOW())
 * - updated_at (TIMESTAMPTZ, DEFAULT NOW())
 *
 * RLS Policy:
 * - Users can only SELECT organizations they belong to (via org_members)
 */

/**
 * Get Supabase client (will be imported from database service)
 */
let supabase;

function setSupabaseClient(client) {
  supabase = client;
}

/**
 * Generate a URL-friendly slug from organization name
 *
 * @param {string} name - Organization name
 * @returns {string} - URL-friendly slug
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Validate slug format
 *
 * @param {string} slug - Slug to validate
 * @returns {boolean} - True if valid slug format
 */
function isValidSlug(slug) {
  const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

/**
 * Create a new organization
 *
 * @param {Object} orgData - Organization data
 * @param {string} orgData.name - Organization display name
 * @param {string} [orgData.slug] - URL-friendly identifier (auto-generated if not provided)
 * @param {Object} [orgData.settings] - Organization-specific configuration
 * @param {string} [orgData.billing_email] - Contact for billing/admin
 * @returns {Promise<Object>} - Created organization record
 */
async function createOrganization(orgData) {
  if (!orgData.name || orgData.name.trim().length === 0) {
    throw new Error('Organization name is required');
  }

  const slug = orgData.slug || generateSlug(orgData.name);

  if (!isValidSlug(slug)) {
    throw new Error('Invalid slug format. Use lowercase letters, numbers, and hyphens only.');
  }

  const { data, error } = await supabase
    .from('organizations')
    .insert([
      {
        name: orgData.name.trim(),
        slug,
        settings: orgData.settings || {},
        billing_email: orgData.billing_email || null
      }
    ])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      // Unique constraint violation on slug
      throw new Error(`Organization slug '${slug}' already exists`);
    }
    throw new Error(`Failed to create organization: ${error.message}`);
  }

  return data;
}

/**
 * Find organization by ID
 *
 * @param {string} orgId - Organization UUID
 * @returns {Promise<Object|null>} - Organization record or null if not found
 */
async function findOrganizationById(orgId) {
  const { data, error } = await supabase.from('organizations').select('*').eq('id', orgId).single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to find organization: ${error.message}`);
  }

  return data;
}

/**
 * Find organization by slug
 *
 * @param {string} slug - Organization slug
 * @returns {Promise<Object|null>} - Organization record or null if not found
 */
async function findOrganizationBySlug(slug) {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to find organization: ${error.message}`);
  }

  return data;
}

/**
 * Get all organizations for a user
 *
 * @param {string} userId - User UUID
 * @returns {Promise<Array>} - Array of organizations
 */
async function getOrganizationsForUser(userId) {
  const { data, error } = await supabase
    .from('org_members')
    .select(
      `
      role,
      joined_at,
      organization:organizations (*)
    `
    )
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to get organizations: ${error.message}`);
  }

  return data.map(membership => ({
    ...membership.organization,
    role: membership.role,
    joined_at: membership.joined_at
  }));
}

/**
 * Update organization data
 *
 * @param {string} orgId - Organization UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated organization record
 */
async function updateOrganization(orgId, updates) {
  // Filter out fields that shouldn't be updated directly
  const allowedFields = ['name', 'settings', 'billing_email'];
  const filteredUpdates = {};

  Object.keys(updates).forEach(key => {
    if (allowedFields.includes(key)) {
      filteredUpdates[key] = updates[key];
    }
  });

  filteredUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('organizations')
    .update(filteredUpdates)
    .eq('id', orgId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update organization: ${error.message}`);
  }

  return data;
}

/**
 * Delete organization
 * Note: This will cascade delete all related records (members, projects, etc.)
 *
 * @param {string} orgId - Organization UUID
 * @returns {Promise<boolean>} - True if deleted successfully
 */
async function deleteOrganization(orgId) {
  const { error } = await supabase.from('organizations').delete().eq('id', orgId);

  if (error) {
    throw new Error(`Failed to delete organization: ${error.message}`);
  }

  return true;
}

/**
 * Get organization member count
 *
 * @param {string} orgId - Organization UUID
 * @returns {Promise<number>} - Number of members
 */
async function getMemberCount(orgId) {
  const { count, error } = await supabase
    .from('org_members')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId);

  if (error) {
    throw new Error(`Failed to get member count: ${error.message}`);
  }

  return count || 0;
}

/**
 * Get organization project count
 *
 * @param {string} orgId - Organization UUID
 * @returns {Promise<number>} - Number of projects
 */
async function getProjectCount(orgId) {
  const { count, error } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId);

  if (error) {
    throw new Error(`Failed to get project count: ${error.message}`);
  }

  return count || 0;
}

/**
 * Get organization with member and project counts
 *
 * @param {string} orgId - Organization UUID
 * @returns {Promise<Object|null>} - Organization with counts
 */
async function getOrganizationWithStats(orgId) {
  const org = await findOrganizationById(orgId);

  if (!org) {
    return null;
  }

  const [memberCount, projectCount] = await Promise.all([
    getMemberCount(orgId),
    getProjectCount(orgId)
  ]);

  return {
    ...org,
    member_count: memberCount,
    project_count: projectCount
  };
}

/**
 * Check if a user belongs to an organization
 *
 * @param {string} userId - User UUID
 * @param {string} orgId - Organization UUID
 * @returns {Promise<boolean>} - True if user is a member
 */
async function isUserMember(userId, orgId) {
  const { data, error } = await supabase
    .from('org_members')
    .select('id')
    .eq('user_id', userId)
    .eq('organization_id', orgId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return false;
    }
    throw new Error(`Failed to check membership: ${error.message}`);
  }

  return !!data;
}

/**
 * Check if a user has a specific role in an organization
 *
 * @param {string} userId - User UUID
 * @param {string} orgId - Organization UUID
 * @param {string|Array<string>} role - Role(s) to check (e.g., 'admin' or ['admin', 'editor'])
 * @returns {Promise<boolean>} - True if user has the role
 */
async function hasRole(userId, orgId, role) {
  const roles = Array.isArray(role) ? role : [role];

  const { data, error } = await supabase
    .from('org_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', orgId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return false;
    }
    throw new Error(`Failed to check role: ${error.message}`);
  }

  return roles.includes(data.role);
}

module.exports = {
  setSupabaseClient,
  createOrganization,
  findOrganizationById,
  findOrganizationBySlug,
  getOrganizationsForUser,
  updateOrganization,
  deleteOrganization,
  getMemberCount,
  getProjectCount,
  getOrganizationWithStats,
  isUserMember,
  hasRole,
  generateSlug,
  isValidSlug
};
