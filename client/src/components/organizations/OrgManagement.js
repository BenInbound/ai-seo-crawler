/**
 * OrgManagement Component
 *
 * Organization settings and member management interface.
 * Allows admins to invite members, manage roles, and update organization settings.
 *
 * Based on plan.md frontend architecture for User Story 1
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useOrg } from '../../contexts/OrgContext';
import { members as membersAPI } from '../../services/api';

function OrgManagement() {
  const { currentOrg, isAdmin } = useOrg();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviting, setInviting] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!currentOrg) return;
    try {
      setLoading(true);
      const response = await membersAPI.list(currentOrg.id);
      setMembers(response.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to load members');
      console.error('Load members error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentOrg]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleInvite = async e => {
    e.preventDefault();
    if (!inviteEmail) return;

    setInviting(true);
    setError(null);

    try {
      await membersAPI.add(currentOrg.id, inviteEmail, inviteRole);
      setInviteEmail('');
      setInviteRole('viewer');
      await loadMembers();
    } catch (err) {
      setError(err.error || 'Failed to invite member');
      console.error('Invite member error:', err);
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await membersAPI.updateRole(currentOrg.id, userId, newRole);
      await loadMembers();
    } catch (err) {
      setError(err.error || 'Failed to update role');
      console.error('Update role error:', err);
    }
  };

  const handleRemoveMember = async userId => {
    if (!window.confirm('Are you sure you want to remove this member?')) {
      return;
    }

    try {
      await membersAPI.remove(currentOrg.id, userId);
      await loadMembers();
    } catch (err) {
      setError(err.error || 'Failed to remove member');
      console.error('Remove member error:', err);
    }
  };

  if (!currentOrg) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No organization selected</p>
      </div>
    );
  }

  if (!isAdmin()) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">You need admin permissions to manage this organization</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Organization Settings</h1>
        <p className="mt-1 text-sm text-gray-500">{currentOrg.name}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Invite Member</h2>
        <form onSubmit={handleInvite} className="flex gap-4">
          <div className="flex-1">
            <input
              type="email"
              placeholder="Email address"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              disabled={inviting}
              required
            />
          </div>
          <div className="w-32">
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              disabled={inviting}
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={inviting}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {inviting ? 'Inviting...' : 'Invite'}
          </button>
        </form>
      </div>

      {/* Members List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Members</h2>
        </div>
        {loading ? (
          <div className="px-6 py-8 text-center">
            <p className="text-gray-500">Loading members...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-gray-500">No members yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {members.map(member => (
              <li key={member.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {member.user.name || member.user.email}
                    </p>
                    <p className="text-sm text-gray-500">{member.user.email}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <select
                      value={member.role}
                      onChange={e => handleRoleChange(member.user.id, e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => handleRemoveMember(member.user.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default OrgManagement;
