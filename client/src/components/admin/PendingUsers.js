/**
 * PendingUsers Component
 *
 * Displays list of users awaiting admin approval
 * Allows admins to approve or reject pending users
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import api from '../../services/api';

function PendingUsers() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingUserId, setProcessingUserId] = useState(null);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/admin/users/pending');
      setPendingUsers(response.data.users || []);
    } catch (err) {
      console.error('Error fetching pending users:', err);
      setError(err.response?.data?.error || 'Failed to load pending users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const handleApprove = async (userId) => {
    if (!window.confirm('Approve this user?')) return;

    try {
      setProcessingUserId(userId);
      await api.post(`/admin/users/${userId}/approve`);

      // Remove from list
      setPendingUsers(prev => prev.filter(u => u.id !== userId));

      alert('User approved successfully!');
    } catch (err) {
      console.error('Error approving user:', err);
      alert(err.response?.data?.error || 'Failed to approve user');
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleReject = async (userId) => {
    if (!window.confirm('Reject and delete this user? This cannot be undone.')) return;

    try {
      setProcessingUserId(userId);
      await api.post(`/admin/users/${userId}/reject`);

      // Remove from list
      setPendingUsers(prev => prev.filter(u => u.id !== userId));

      alert('User rejected and deleted successfully!');
    } catch (err) {
      console.error('Error rejecting user:', err);
      alert(err.response?.data?.error || 'Failed to reject user');
    } finally {
      setProcessingUserId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Pending User Approvals</h2>
            {pendingUsers.length > 0 && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                {pendingUsers.length}
              </span>
            )}
          </div>
          <button
            onClick={fetchPendingUsers}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {pendingUsers.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-500">No pending user approvals</p>
          </div>
        ) : (
          pendingUsers.map(user => (
            <div key={user.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">{user.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{user.email}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Registered: {formatDate(user.created_at)}
                  </p>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleApprove(user.id)}
                    disabled={processingUserId === user.id}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(user.id)}
                    disabled={processingUserId === user.id}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default PendingUsers;
