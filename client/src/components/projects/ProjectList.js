/**
 * ProjectList Component
 *
 * Displays list of projects for the current organization.
 * Shows project details and allows navigation to project pages.
 *
 * Based on plan.md frontend architecture for User Story 1
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useOrg } from '../../contexts/OrgContext';
import { projects as projectsAPI } from '../../services/api';

function ProjectList({ onCreateClick }) {
  const navigate = useNavigate();
  const { currentOrg, canEdit } = useOrg();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const response = await projectsAPI.listAll();
      setProjects(response.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to load projects');
      console.error('Load projects error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleProjectClick = project => {
    navigate(`/projects/${project.id}`);
  };

  const handleDeleteProject = async (e, project) => {
    e.stopPropagation(); // Prevent navigation when clicking delete

    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name}"?\n\nThis will permanently delete the project and all associated data including crawls, pages, and scores. This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await projectsAPI.delete(project.id);
      // Reload projects after successful deletion
      await loadProjects();
    } catch (err) {
      console.error('Delete project error:', err);
      alert(err.error || err.details || 'Failed to delete project');
    }
  };

  const formatDate = dateString => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading projects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="rounded-md bg-red-50 p-4 max-w-md mx-auto">
          <p className="text-sm text-red-800">{error}</p>
          <button onClick={loadProjects} className="mt-2 text-sm text-red-600 hover:text-red-500">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
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
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by creating a new project.</p>
        {canEdit() && onCreateClick && (
          <div className="mt-6">
            <button
              onClick={onCreateClick}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg
                className="-ml-1 mr-2 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              New Project
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Projects</h2>
          <p className="mt-1 text-sm text-gray-500">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </p>
        </div>
        {canEdit() && onCreateClick && (
          <button
            onClick={onCreateClick}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg
              className="-ml-1 mr-2 h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            New Project
          </button>
        )}
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {projects.map(project => (
            <li key={project.id}>
              <button
                onClick={() => handleProjectClick(project)}
                className="w-full text-left block hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition duration-150 ease-in-out"
              >
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-medium text-blue-600 truncate">{project.name}</h3>
                        {project.organization_name && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {project.organization_name}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-500 truncate">{project.target_url}</p>
                      {project.description && (
                        <p className="mt-1 text-sm text-gray-600">{project.description}</p>
                      )}
                    </div>
                    <div className="ml-4 flex-shrink-0 flex items-start space-x-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          Created {formatDate(project.created_at)}
                        </p>
                        {project.crawl_count !== undefined && (
                          <p className="mt-1 text-sm text-gray-500">
                            {project.crawl_count} {project.crawl_count === 1 ? 'crawl' : 'crawls'}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={(e) => handleDeleteProject(e, project)}
                        className="p-2 bg-red-50 hover:bg-red-100 rounded-md transition-colors group"
                        title="Delete project"
                      >
                        <Trash2 className="w-4 h-4 text-red-600 group-hover:text-red-700" />
                      </button>
                    </div>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default ProjectList;
