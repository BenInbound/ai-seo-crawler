/**
 * Supabase Client Setup
 * Multi-tenant database access with Row-Level Security
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Validate required environment variables
if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL environment variable is required');
}

if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_ANON_KEY environment variable is required');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
}

/**
 * Supabase client for user-facing operations
 * Uses anon key with RLS enforcement
 * Must be called with user JWT token for proper RLS
 */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false
    }
  }
);

/**
 * Supabase service role client for background jobs
 * Bypasses RLS - use with caution
 * Application must validate organization context manually
 */
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Create a Supabase client with user JWT for RLS enforcement
 * @param {string} userJwt - JWT token from authenticated user
 * @returns {object} Supabase client with user context
 */
function createUserClient(userJwt) {
  if (!userJwt) {
    throw new Error('User JWT is required for RLS-enforced client');
  }

  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${userJwt}`
        }
      }
    }
  );
}

/**
 * Test database connection
 * @returns {Promise<boolean>} True if connection successful
 */
async function testConnection() {
  try {
    const { error } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Database connection test failed:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Database connection test error:', err.message);
    return false;
  }
}

/**
 * Execute a database query with error handling
 * @param {Function} queryFn - Query function to execute
 * @returns {Promise<{data: any, error: any}>}
 */
async function executeQuery(queryFn) {
  try {
    const result = await queryFn();
    return result;
  } catch (err) {
    return {
      data: null,
      error: {
        message: err.message,
        details: err.details || null,
        hint: err.hint || null,
        code: err.code || 'UNKNOWN_ERROR'
      }
    };
  }
}

/**
 * Helper to check if user belongs to organization
 * Used for manual validation in service role operations
 * @param {string} userId - User UUID
 * @param {string} organizationId - Organization UUID
 * @returns {Promise<boolean>}
 */
async function userBelongsToOrg(userId, organizationId) {
  const { data, error } = await supabaseAdmin
    .from('org_members')
    .select('id')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .limit(1);

  if (error) {
    console.error('Error checking org membership:', error);
    return false;
  }

  return data && data.length > 0;
}

/**
 * Helper to get user's role in organization
 * @param {string} userId - User UUID
 * @param {string} organizationId - Organization UUID
 * @returns {Promise<string|null>} Role ('admin', 'editor', 'viewer') or null
 */
async function getUserOrgRole(userId, organizationId) {
  const { data, error } = await supabaseAdmin
    .from('org_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.role;
}

module.exports = {
  supabase,
  supabaseAdmin,
  createUserClient,
  testConnection,
  executeQuery,
  userBelongsToOrg,
  getUserOrgRole
};
