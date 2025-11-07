/**
 * CrawlForm Component
 *
 * Form for initiating new crawls with run type selection.
 * Allows users to start full crawls, sitemap-only, sample, or delta crawls.
 *
 * Based on plan.md frontend architecture for User Story 2
 */

import React, { useState } from 'react';
import { crawls as crawlsAPI } from '../../services/api';

function CrawlForm({ projectId, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    runType: 'full'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runTypes = [
    {
      value: 'full',
      label: 'Full Crawl',
      description: 'Discover URLs from sitemap and follow internal links up to depth limit'
    },
    {
      value: 'sitemap_only',
      label: 'Sitemap Only',
      description: 'Only crawl URLs found in sitemap.xml'
    },
    {
      value: 'sample',
      label: 'Sample Crawl',
      description: 'Crawl up to the configured sample size limit'
    },
    {
      value: 'delta',
      label: 'Delta Crawl',
      description: 'Only crawl pages that have changed since last crawl'
    }
  ];

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError(null);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await crawlsAPI.start(projectId, formData);
      console.log('Crawl started:', response);

      if (onSuccess) {
        onSuccess(response);
      }
    } catch (err) {
      console.error('Failed to start crawl:', err);
      setError(err.details || err.error || 'Failed to start crawl');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-sm rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Start New Crawl</h2>
        <p className="mt-1 text-sm text-gray-600">
          Choose a crawl type and initiate a new crawl run for this project
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
            <p className="text-sm font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Run Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Crawl Type</label>
          <div className="space-y-3">
            {runTypes.map(type => (
              <div key={type.value} className="relative flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id={`runType-${type.value}`}
                    name="runType"
                    type="radio"
                    value={type.value}
                    checked={formData.runType === type.value}
                    onChange={handleChange}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label
                    htmlFor={`runType-${type.value}`}
                    className="font-medium text-gray-700 cursor-pointer"
                  >
                    {type.label}
                  </label>
                  <p className="text-gray-500">{type.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Starting Crawl...
              </span>
            ) : (
              'Start Crawl'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CrawlForm;
