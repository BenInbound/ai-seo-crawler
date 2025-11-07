/**
 * ProjectForm Component
 *
 * Form for creating and editing projects.
 * Includes validation and configuration options.
 *
 * Based on plan.md frontend architecture for User Story 1
 */

import React, { useState, useEffect } from 'react';
import { useOrg } from '../../contexts/OrgContext';
import { projects as projectsAPI } from '../../services/api';

function ProjectForm({ project, onSuccess, onCancel }) {
  const { currentOrg } = useOrg();
  const isEditing = !!project;

  const [formData, setFormData] = useState({
    name: '',
    target_url: '',
    description: '',
    depth_limit: 3,
    sample_size: '',
    token_limit: '',
    excluded_patterns: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        target_url: project.target_url || '',
        description: project.description || '',
        depth_limit: project.config?.depth_limit || 3,
        sample_size: project.config?.sample_size || '',
        token_limit: project.config?.token_limit || '',
        excluded_patterns: Array.isArray(project.config?.excluded_patterns)
          ? project.config.excluded_patterns.join('\n')
          : ''
      });
    }
  }, [project]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError(null);
  };

  const validateUrl = url => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Project name is required');
      return;
    }

    if (!formData.target_url.trim()) {
      setError('Target URL is required');
      return;
    }

    if (!validateUrl(formData.target_url)) {
      setError('Please enter a valid URL (including http:// or https://)');
      return;
    }

    if (formData.depth_limit < 1 || formData.depth_limit > 10) {
      setError('Depth limit must be between 1 and 10');
      return;
    }

    setLoading(true);

    try {
      // Prepare config
      const config = {
        depth_limit: parseInt(formData.depth_limit, 10)
      };

      if (formData.sample_size) {
        config.sample_size = parseInt(formData.sample_size, 10);
      }

      if (formData.token_limit) {
        config.token_limit = parseInt(formData.token_limit, 10);
      }

      if (formData.excluded_patterns) {
        config.excluded_patterns = formData.excluded_patterns
          .split('\n')
          .map(p => p.trim())
          .filter(p => p.length > 0);
      }

      const projectData = {
        name: formData.name.trim(),
        target_url: formData.target_url.trim(),
        description: formData.description.trim(),
        config
      };

      if (isEditing) {
        await projectsAPI.update(project.id, projectData);
      } else {
        await projectsAPI.create(currentOrg.id, projectData);
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err.error || err.details || 'Failed to save project');
      console.error('Save project error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Project Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          value={formData.name}
          onChange={handleChange}
          disabled={loading}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="My Website"
        />
      </div>

      <div>
        <label htmlFor="target_url" className="block text-sm font-medium text-gray-700">
          Target URL *
        </label>
        <input
          type="url"
          id="target_url"
          name="target_url"
          required
          value={formData.target_url}
          onChange={handleChange}
          disabled={loading}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="https://example.com"
        />
        <p className="mt-1 text-sm text-gray-500">The root URL of the website to crawl</p>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          value={formData.description}
          onChange={handleChange}
          disabled={loading}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Optional project description"
        />
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Crawl Configuration</h3>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="depth_limit" className="block text-sm font-medium text-gray-700">
              Depth Limit *
            </label>
            <input
              type="number"
              id="depth_limit"
              name="depth_limit"
              min="1"
              max="10"
              required
              value={formData.depth_limit}
              onChange={handleChange}
              disabled={loading}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <p className="mt-1 text-sm text-gray-500">Maximum crawl depth (1-10)</p>
          </div>

          <div>
            <label htmlFor="sample_size" className="block text-sm font-medium text-gray-700">
              Sample Size
            </label>
            <input
              type="number"
              id="sample_size"
              name="sample_size"
              min="1"
              value={formData.sample_size}
              onChange={handleChange}
              disabled={loading}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Optional"
            />
            <p className="mt-1 text-sm text-gray-500">Limit crawl to N pages (optional)</p>
          </div>

          <div>
            <label htmlFor="token_limit" className="block text-sm font-medium text-gray-700">
              Token Limit
            </label>
            <input
              type="number"
              id="token_limit"
              name="token_limit"
              min="1"
              value={formData.token_limit}
              onChange={handleChange}
              disabled={loading}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Optional"
            />
            <p className="mt-1 text-sm text-gray-500">Max AI tokens per crawl (optional)</p>
          </div>
        </div>

        <div className="mt-6">
          <label htmlFor="excluded_patterns" className="block text-sm font-medium text-gray-700">
            Excluded URL Patterns
          </label>
          <textarea
            id="excluded_patterns"
            name="excluded_patterns"
            rows={4}
            value={formData.excluded_patterns}
            onChange={handleChange}
            disabled={loading}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono text-xs"
            placeholder="/admin&#10;/api/&#10;/private/"
          />
          <p className="mt-1 text-sm text-gray-500">
            One pattern per line. URLs matching these patterns will be skipped.
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : isEditing ? 'Update Project' : 'Create Project'}
        </button>
      </div>
    </form>
  );
}

export default ProjectForm;
