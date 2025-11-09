/**
 * User Model
 *
 * Represents a person who uses the platform. Can belong to multiple organizations.
 * Based on data-model.md entity definition.
 *
 * Fields:
 * - id (UUID, PK) - Unique identifier
 * - email (TEXT, UNIQUE, NOT NULL) - Email address (used for login)
 * - password_hash (TEXT, NOT NULL) - Bcrypt hashed password
 * - name (TEXT) - Display name
 * - preferences (JSONB, DEFAULT '{}') - User preferences
 * - approved (BOOLEAN, DEFAULT false, NOT NULL) - Admin approval status
 * - approved_at (TIMESTAMPTZ) - Timestamp when user was approved
 * - approved_by (UUID) - Admin user who approved this account
 * - created_at (TIMESTAMPTZ, DEFAULT NOW())
 * - updated_at (TIMESTAMPTZ, DEFAULT NOW())
 * - last_login_at (TIMESTAMPTZ)
 *
 * RLS Policy:
 * - Users can SELECT/UPDATE their own record only
 */

/**
 * Get Supabase client (will be imported from database service)
 * For now, we'll assume it's available via the database service
 */
let supabase;

function setSupabaseClient(client) {
  supabase = client;
}

/**
 * Validate email format
 *
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Create a new user
 *
 * @param {Object} userData - User data
 * @param {string} userData.email - Email address
 * @param {string} userData.password_hash - Bcrypt hashed password
 * @param {string} [userData.name] - Display name
 * @param {Object} [userData.preferences] - User preferences
 * @returns {Promise<Object>} - Created user record
 */
async function createUser(userData) {
  if (!userData.email || !isValidEmail(userData.email)) {
    throw new Error('Valid email address is required');
  }

  if (!userData.password_hash) {
    throw new Error('Password hash is required');
  }

  const { data, error } = await supabase
    .from('users')
    .insert([
      {
        email: userData.email.toLowerCase(),
        password_hash: userData.password_hash,
        name: userData.name || null,
        preferences: userData.preferences || {}
      }
    ])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      // Unique constraint violation
      throw new Error('Email address already exists');
    }
    throw new Error(`Failed to create user: ${error.message}`);
  }

  return data;
}

/**
 * Find user by ID
 *
 * @param {string} userId - User UUID
 * @returns {Promise<Object|null>} - User record or null if not found
 */
async function findUserById(userId) {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to find user: ${error.message}`);
  }

  return data;
}

/**
 * Find user by email
 *
 * @param {string} email - Email address
 * @returns {Promise<Object|null>} - User record or null if not found
 */
async function findUserByEmail(email) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to find user: ${error.message}`);
  }

  return data;
}

/**
 * Update user data
 *
 * @param {string} userId - User UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated user record
 */
async function updateUser(userId, updates) {
  // Filter out fields that shouldn't be updated directly
  const allowedFields = ['name', 'preferences', 'last_login_at'];
  const filteredUpdates = {};

  Object.keys(updates).forEach(key => {
    if (allowedFields.includes(key)) {
      filteredUpdates[key] = updates[key];
    }
  });

  filteredUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('users')
    .update(filteredUpdates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update user: ${error.message}`);
  }

  return data;
}

/**
 * Update user's last login timestamp
 *
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} - Updated user record
 */
async function updateLastLogin(userId) {
  return updateUser(userId, {
    last_login_at: new Date().toISOString()
  });
}

/**
 * Update user password hash
 *
 * @param {string} userId - User UUID
 * @param {string} newPasswordHash - New bcrypt hashed password
 * @returns {Promise<Object>} - Updated user record
 */
async function updatePassword(userId, newPasswordHash) {
  if (!newPasswordHash) {
    throw new Error('Password hash is required');
  }

  const { data, error } = await supabase
    .from('users')
    .update({
      password_hash: newPasswordHash,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update password: ${error.message}`);
  }

  return data;
}

/**
 * Delete user (soft delete by setting email to null might be preferred)
 *
 * @param {string} userId - User UUID
 * @returns {Promise<boolean>} - True if deleted successfully
 */
async function deleteUser(userId) {
  const { error } = await supabase.from('users').delete().eq('id', userId);

  if (error) {
    throw new Error(`Failed to delete user: ${error.message}`);
  }

  return true;
}

/**
 * Get user's organizations (via organization_members join)
 *
 * @param {string} userId - User UUID
 * @returns {Promise<Array>} - Array of organizations with role
 */
async function getUserOrganizations(userId) {
  const { data, error } = await supabase
    .from('org_members')
    .select(
      `
      role,
      joined_at,
      organization:organizations (
        id,
        name,
        slug,
        created_at
      )
    `
    )
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to get user organizations: ${error.message}`);
  }

  return data.map(membership => ({
    ...membership.organization,
    role: membership.role,
    joined_at: membership.joined_at
  }));
}

/**
 * Sanitize user object (remove sensitive fields)
 *
 * @param {Object} user - User object
 * @returns {Object} - Sanitized user object
 */
function sanitizeUser(user) {
  if (!user) return null;

  // eslint-disable-next-line no-unused-vars
  const { password_hash, ...sanitized } = user;
  return sanitized;
}

module.exports = {
  setSupabaseClient,
  createUser,
  findUserById,
  findUserByEmail,
  updateUser,
  updateLastLogin,
  updatePassword,
  deleteUser,
  getUserOrganizations,
  sanitizeUser,
  isValidEmail
};
