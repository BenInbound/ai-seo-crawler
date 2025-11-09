/**
 * Admin Routes
 *
 * Endpoints for admin user management:
 * - GET /admin/users/pending - List users awaiting approval
 * - POST /admin/users/:userId/approve - Approve a user
 * - POST /admin/users/:userId/reject - Reject/delete a user
 *
 * All endpoints require admin role via requireAdmin middleware
 */

const express = require('express');
const { findUserById, deleteUser } = require('../../models/user');
const { requireAuth, requireAdmin } = require('../../middleware/auth');

const router = express.Router();

// Get Supabase client
let supabase;
function setSupabaseClient(client) {
  supabase = client;
}

/**
 * GET /admin/users/pending
 * List all users awaiting approval
 */
router.get('/users/pending', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, created_at')
      .eq('approved', false)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch pending users: ${error.message}`);
    }

    res.status(200).json({
      users: data,
      count: data.length
    });
  } catch (error) {
    console.error('Get pending users error:', error);
    res.status(500).json({
      error: 'Failed to fetch pending users',
      details: error.message
    });
  }
});

/**
 * POST /admin/users/:userId/approve
 * Approve a user account
 */
router.post('/users/:userId/approve', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const adminUserId = req.user.userId; // From requireAuth middleware

    // Check if user exists
    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        details: 'The specified user does not exist'
      });
    }

    // Check if already approved
    if (user.approved) {
      return res.status(400).json({
        error: 'User already approved',
        details: 'This user has already been approved'
      });
    }

    // Approve user
    const { data, error } = await supabase
      .from('users')
      .update({
        approved: true,
        approved_at: new Date().toISOString(),
        approved_by: adminUserId
      })
      .eq('id', userId)
      .select('id, email, name, approved, approved_at')
      .single();

    if (error) {
      throw new Error(`Failed to approve user: ${error.message}`);
    }

    res.status(200).json({
      message: 'User approved successfully',
      user: data
    });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({
      error: 'Failed to approve user',
      details: error.message
    });
  }
});

/**
 * POST /admin/users/:userId/reject
 * Reject a user account (deletes the user)
 */
router.post('/users/:userId/reject', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await findUserById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        details: 'The specified user does not exist'
      });
    }

    // Don't allow rejecting approved users
    if (user.approved) {
      return res.status(400).json({
        error: 'Cannot reject approved user',
        details: 'This user has already been approved. Use the delete endpoint instead.'
      });
    }

    // Delete the user
    await deleteUser(userId);

    res.status(200).json({
      message: 'User rejected and deleted successfully',
      email: user.email
    });
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({
      error: 'Failed to reject user',
      details: error.message
    });
  }
});

module.exports = {
  router,
  setSupabaseClient
};
