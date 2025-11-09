/**
 * Dashboard Page
 *
 * Main application dashboard after login.
 * Shows organization switcher, project list, and project management.
 *
 * Based on plan.md frontend architecture for User Story 1
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrg } from '../contexts/OrgContext';
import OrgSwitcher from '../components/organizations/OrgSwitcher';
import ProjectList from '../components/projects/ProjectList';
import ProjectForm from '../components/projects/ProjectForm';
import PendingUsers from '../components/admin/PendingUsers';

function Dashboard() {
  const { user, logout } = useAuth();
  const { currentOrg } = useOrg();
  const [showCreateProject, setShowCreateProject] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const handleCreateProject = () => {
    setShowCreateProject(true);
  };

  const handleProjectCreated = () => {
    setShowCreateProject(false);
    // ProjectList will automatically refresh via its useEffect
  };

  const handleCancelCreate = () => {
    setShowCreateProject(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#F8F8F4] shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">AEO Platform</h1>
              {currentOrg && (
                <div className="hidden sm:block">
                  <OrgSwitcher />
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-sm text-gray-700">
                <span className="font-medium">{user?.name || user?.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg
                  className="-ml-1 mr-2 h-5 w-5 text-gray-500"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4.414l-4.293 4.293a1 1 0 01-1.414 0L4 7.414 5.414 6l3.293 3.293L13.586 6 15 7.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Logout
              </button>
            </div>
          </div>
          {/* Mobile org switcher */}
          {currentOrg && (
            <div className="mt-4 sm:hidden">
              <OrgSwitcher />
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!currentOrg ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No organization selected</h3>
            <p className="mt-1 text-sm text-gray-500">
              You need to be part of an organization to manage projects.
            </p>
          </div>
        ) : showCreateProject ? (
          <div className="max-w-3xl mx-auto">
            <div className="mb-6">
              <button
                onClick={handleCancelCreate}
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
              >
                <svg
                  className="mr-2 h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Back to Projects
              </button>
            </div>
            <div className="bg-white shadow sm:rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Create New Project</h2>
              <ProjectForm onSuccess={handleProjectCreated} onCancel={handleCancelCreate} />
            </div>
          </div>
        ) : (
          <div>
            {/* Admin Section: Pending User Approvals */}
            {user?.is_admin && (
              <div className="mb-8">
                <PendingUsers />
              </div>
            )}

            {/* Project List */}
            <ProjectList onCreateClick={handleCreateProject} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} AEO Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Dashboard;
