/**
 * OrganizationMember Model
 *
 * Links users to organizations with role assignments. Defines access permissions.
 * Based on data-model.md entity definition.
 *
 * Fields:
 * - id (UUID, PK) - Unique identifier
 * - organization_id (UUID, FK → organizations.id, NOT NULL)
 * - user_id (UUID, FK → users.id, NOT NULL)
 * - role (TEXT, NOT NULL) - One of: 'admin', 'editor', 'viewer'
 * - invited_by (UUID, FK → users.id) - User who sent invitation
 * - invited_at (TIMESTAMPTZ, DEFAULT NOW())
 * - joined_at (TIMESTAMPTZ) - When invitation was accepted
 *
 * Role Permissions (enforced in application layer):
 * - admin: Full control including user invites, project management, crawl execution
 * - editor: Create/edit projects, run crawls, view reports
 * - viewer: Read-only access to reports and dashboards
 *
 * RLS Policy:
 * - Users can SELECT memberships for organizations they belong to
 * - Only 'admin' role can INSERT/UPDATE/DELETE memberships
 */

/**
 * Valid roles for organization members
 */
const VALID_ROLES = ['admin', 'editor', 'viewer'];

/**
 * Get Supabase client (will be imported from database service)
 */
let supabase;

function setSupabaseClient(client) {
  supabase = client;
}

/**
 * Validate role
 *
 * @param {string} role - Role to validate
 * @returns {boolean} - True if valid role
 */
function isValidRole(role) {
  return VALID_ROLES.includes(role);
}

/**
 * Add a member to an organization
 *
 * @param {Object} memberData - Member data
 * @param {string} memberData.organization_id - Organization UUID
 * @param {string} memberData.user_id - User UUID
 * @param {string} memberData.role - Role ('admin', 'editor', or 'viewer')
 * @param {string} [memberData.invited_by] - UUID of user who sent invitation
 * @returns {Promise<Object>} - Created membership record
 */
async function addMember(memberData) {
  if (!memberData.organization_id) {
    throw new Error('Organization ID is required');
  }

  if (!memberData.user_id) {
    throw new Error('User ID is required');
  }

  if (!isValidRole(memberData.role)) {
    throw new Error(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
  }

  const { data, error } = await supabase
    .from('org_members')
    .insert([
      {
        organization_id: memberData.organization_id,
        user_id: memberData.user_id,
        role: memberData.role,
        invited_by: memberData.invited_by || null,
        invited_at: new Date().toISOString(),
        joined_at: new Date().toISOString() // Auto-join for now, can implement invitation flow later
      }
    ])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      // Unique constraint violation - user already member
      throw new Error('User is already a member of this organization');
    }
    if (error.code === '23503') {
      // Foreign key constraint violation
      throw new Error('Invalid organization or user ID');
    }
    throw new Error(`Failed to add member: ${error.message}`);
  }

  return data;
}

/**
 * Get all members of an organization
 *
 * @param {string} organizationId - Organization UUID
 * @returns {Promise<Array>} - Array of member records with user details
 */
async function getOrganizationMembers(organizationId) {
  const { data, error } = await supabase
    .from('org_members')
    .select(
      `
      id,
      role,
      invited_at,
      joined_at,
      invited_by,
      user:users (
        id,
        email,
        name,
        created_at
      )
    `
    )
    .eq('organization_id', organizationId)
    .order('joined_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to get members: ${error.message}`);
  }

  return data.map(member => ({
    id: member.id,
    role: member.role,
    invited_at: member.invited_at,
    joined_at: member.joined_at,
    invited_by: member.invited_by,
    user: member.user
  }));
}

/**
 * Get a specific membership
 *
 * @param {string} userId - User UUID
 * @param {string} organizationId - Organization UUID
 * @returns {Promise<Object|null>} - Membership record or null if not found
 */
async function getMembership(userId, organizationId) {
  const { data, error } = await supabase
    .from('org_members')
    .select('*')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to get membership: ${error.message}`);
  }

  return data;
}

/**
 * Update a member's role
 *
 * @param {string} userId - User UUID
 * @param {string} organizationId - Organization UUID
 * @param {string} newRole - New role
 * @returns {Promise<Object>} - Updated membership record
 */
async function updateMemberRole(userId, organizationId, newRole) {
  if (!isValidRole(newRole)) {
    throw new Error(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
  }

  const { data, error } = await supabase
    .from('org_members')
    .update({ role: newRole })
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update role: ${error.message}`);
  }

  return data;
}

/**
 * Remove a member from an organization
 *
 * @param {string} userId - User UUID
 * @param {string} organizationId - Organization UUID
 * @returns {Promise<boolean>} - True if removed successfully
 */
async function removeMember(userId, organizationId) {
  const { error } = await supabase
    .from('org_members')
    .delete()
    .eq('user_id', userId)
    .eq('organization_id', organizationId);

  if (error) {
    throw new Error(`Failed to remove member: ${error.message}`);
  }

  return true;
}

/**
 * Get user's role in an organization
 *
 * @param {string} userId - User UUID
 * @param {string} organizationId - Organization UUID
 * @returns {Promise<string|null>} - Role or null if not a member
 */
async function getUserRole(userId, organizationId) {
  const membership = await getMembership(userId, organizationId);
  return membership ? membership.role : null;
}

/**
 * Check if user has permission for an action
 *
 * @param {string} userId - User UUID
 * @param {string} organizationId - Organization UUID
 * @param {string} requiredRole - Minimum role required ('admin', 'editor', or 'viewer')
 * @returns {Promise<boolean>} - True if user has permission
 */
async function hasPermission(userId, organizationId, requiredRole) {
  const userRole = await getUserRole(userId, organizationId);

  if (!userRole) {
    return false;
  }

  // Role hierarchy: admin > editor > viewer
  const roleHierarchy = {
    admin: 3,
    editor: 2,
    viewer: 1
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Get members by role
 *
 * @param {string} organizationId - Organization UUID
 * @param {string} role - Role to filter by
 * @returns {Promise<Array>} - Array of members with the specified role
 */
async function getMembersByRole(organizationId, role) {
  if (!isValidRole(role)) {
    throw new Error(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
  }

  const { data, error } = await supabase
    .from('org_members')
    .select(
      `
      id,
      role,
      invited_at,
      joined_at,
      user:users (
        id,
        email,
        name
      )
    `
    )
    .eq('organization_id', organizationId)
    .eq('role', role);

  if (error) {
    throw new Error(`Failed to get members by role: ${error.message}`);
  }

  return data;
}

/**
 * Get all admins of an organization
 *
 * @param {string} organizationId - Organization UUID
 * @returns {Promise<Array>} - Array of admin members
 */
async function getAdmins(organizationId) {
  return getMembersByRole(organizationId, 'admin');
}

/**
 * Check if there's at least one admin
 * Used to prevent removing the last admin
 *
 * @param {string} organizationId - Organization UUID
 * @returns {Promise<number>} - Number of admins
 */
async function countAdmins(organizationId) {
  const { count, error } = await supabase
    .from('org_members')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('role', 'admin');

  if (error) {
    throw new Error(`Failed to count admins: ${error.message}`);
  }

  return count || 0;
}

/**
 * Ensure organization has at least one admin before removing/downgrading
 *
 * @param {string} organizationId - Organization UUID
 * @param {string} userId - User UUID being removed/downgraded
 * @returns {Promise<boolean>} - True if safe to proceed
 */
async function canRemoveOrDowngrade(organizationId, userId) {
  const membership = await getMembership(userId, organizationId);

  if (!membership || membership.role !== 'admin') {
    // Not an admin, safe to remove
    return true;
  }

  const adminCount = await countAdmins(organizationId);

  // Must have at least 2 admins to remove one
  return adminCount > 1;
}

module.exports = {
  setSupabaseClient,
  addMember,
  getOrganizationMembers,
  getMembership,
  updateMemberRole,
  removeMember,
  getUserRole,
  hasPermission,
  getMembersByRole,
  getAdmins,
  countAdmins,
  canRemoveOrDowngrade,
  isValidRole,
  VALID_ROLES
};
