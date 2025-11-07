/**
 * CrawlStatus Component
 *
 * Displays real-time status of a running or completed crawl.
 * Shows progress, metrics, and provides pause/resume controls.
 *
 * Based on plan.md frontend architecture for User Story 2
 */

import React, { useState, useEffect } from 'react';
import { crawls as crawlsAPI } from '../../services/api';

function CrawlStatus({ crawlId, autoRefresh = true }) {
  const [crawl, setCrawl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCrawlStatus = async () => {
    try {
      const response = await crawlsAPI.get(crawlId);
      setCrawl(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch crawl status:', err);
      setError(err.details || err.error || 'Failed to load crawl status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCrawlStatus();

    // Auto-refresh for running/queued crawls
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchCrawlStatus();
      }, 5000); // Refresh every 5 seconds

      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crawlId, autoRefresh]);

  const handlePause = async () => {
    setActionLoading(true);
    try {
      const response = await crawlsAPI.pause(crawlId);
      setCrawl(response.data);
    } catch (err) {
      console.error('Failed to pause crawl:', err);
      setError(err.details || err.error || 'Failed to pause crawl');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    setActionLoading(true);
    try {
      const response = await crawlsAPI.resume(crawlId);
      setCrawl(response.data);
    } catch (err) {
      console.error('Failed to resume crawl:', err);
      setError(err.details || err.error || 'Failed to resume crawl');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = status => {
    const colors = {
      queued: 'bg-yellow-100 text-yellow-800',
      running: 'bg-blue-100 text-blue-800',
      paused: 'bg-gray-100 text-gray-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = status => {
    switch (status) {
      case 'queued':
        return '⏳';
      case 'running':
        return '▶️';
      case 'paused':
        return '⏸️';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '❓';
    }
  };

  const formatDate = dateString => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const calculateProgress = () => {
    if (!crawl || crawl.pagesDiscovered === 0) return 0;
    return Math.round((crawl.pagesProcessed / crawl.pagesDiscovered) * 100);
  };

  if (loading) {
    return (
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-full mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
        <p className="text-sm font-medium">Error</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!crawl) {
    return null;
  }

  const progress = calculateProgress();
  const canPause = crawl.status === 'running' || crawl.status === 'queued';
  const canResume = crawl.status === 'paused';

  return (
    <div className="bg-white shadow-sm rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Crawl Status</h3>
          <p className="text-sm text-gray-500">ID: {crawl.id}</p>
        </div>
        <div className="flex items-center space-x-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(crawl.status)}`}
          >
            {getStatusIcon(crawl.status)} {crawl.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      {(crawl.status === 'running' || crawl.status === 'paused') && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Run Type</p>
          <p className="text-lg font-semibold text-gray-900">{crawl.runType}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Pages Discovered</p>
          <p className="text-lg font-semibold text-gray-900">
            {crawl.pagesDiscovered.toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Pages Processed</p>
          <p className="text-lg font-semibold text-gray-900">
            {crawl.pagesProcessed.toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Token Usage</p>
          <p className="text-lg font-semibold text-gray-900">{crawl.tokenUsage.toLocaleString()}</p>
        </div>
      </div>

      {/* Timestamps */}
      <div className="space-y-2 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Started:</span>
          <span className="text-gray-900">{formatDate(crawl.startedAt)}</span>
        </div>
        {crawl.completedAt && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Completed:</span>
            <span className="text-gray-900">{formatDate(crawl.completedAt)}</span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {crawl.status === 'failed' && crawl.errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-6">
          <p className="text-sm font-medium">Error</p>
          <p className="text-sm">{crawl.errorMessage}</p>
        </div>
      )}

      {/* Action Buttons */}
      {(canPause || canResume) && (
        <div className="flex items-center justify-end space-x-3">
          {canPause && (
            <button
              onClick={handlePause}
              disabled={actionLoading}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {actionLoading ? 'Pausing...' : 'Pause Crawl'}
            </button>
          )}
          {canResume && (
            <button
              onClick={handleResume}
              disabled={actionLoading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {actionLoading ? 'Resuming...' : 'Resume Crawl'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default CrawlStatus;
