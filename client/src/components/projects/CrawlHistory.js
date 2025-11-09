/**
 * CrawlHistory Component
 *
 * Displays a list of past crawl runs with status, metrics, and actions.
 * Allows filtering, sorting, and viewing individual crawl details.
 *
 * Based on plan.md frontend architecture for User Story 2
 */

import React, { useState, useEffect } from 'react';
import { crawls as crawlsAPI } from '../../services/api';

function CrawlHistory({ projectId, onViewCrawl }) {
  const [crawls, setCrawls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, running, completed, failed

  useEffect(() => {
    fetchCrawls();

    // Auto-refresh if there are running crawls
    const interval = setInterval(() => {
      fetchCrawls();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const fetchCrawls = async () => {
    try {
      const response = await crawlsAPI.list(projectId);
      setCrawls(response.data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch crawls:', err);
      setError(err.details || err.error || 'Failed to load crawl history');
    } finally {
      setLoading(false);
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
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const calculateProgress = crawl => {
    if (crawl.pagesDiscovered === 0) return 0;
    return Math.round((crawl.pagesProcessed / crawl.pagesDiscovered) * 100);
  };

  const filteredCrawls = crawls.filter(crawl => {
    if (filter === 'all') return true;
    if (filter === 'running') return crawl.status === 'running' || crawl.status === 'queued';
    if (filter === 'completed') return crawl.status === 'completed';
    if (filter === 'failed') return crawl.status === 'failed';
    return true;
  });

  if (loading) {
    return (
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
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

  return (
    <div className="bg-white shadow-sm rounded-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Crawl History</h3>
          <button onClick={fetchCrawls} className="text-sm text-blue-600 hover:text-blue-700">
            Refresh
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="mt-4 flex space-x-4">
          {[
            { key: 'all', label: 'All' },
            { key: 'running', label: 'Active' },
            { key: 'completed', label: 'Completed' },
            { key: 'failed', label: 'Failed' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                filter === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.key === 'all' && ` (${crawls.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Crawls List */}
      <div className="divide-y divide-gray-200">
        {filteredCrawls.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500">No crawls found</p>
          </div>
        ) : (
          filteredCrawls.map(crawl => (
            <div
              key={crawl.id}
              className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => onViewCrawl && onViewCrawl(crawl)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(crawl.status)}`}
                    >
                      {getStatusIcon(crawl.status)} {crawl.status}
                    </span>
                    <span className="text-xs text-gray-500 uppercase">{crawl.runType}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Pages</p>
                      <p className="font-medium text-gray-900">
                        {crawl.pagesProcessed.toLocaleString()} /{' '}
                        {crawl.pagesDiscovered.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Started</p>
                      <p className="font-medium text-gray-900">{formatDate(crawl.startedAt)}</p>
                    </div>
                  </div>

                  {/* Progress Bar for Running/Paused */}
                  {(crawl.status === 'running' || crawl.status === 'paused') && (
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${calculateProgress(crawl)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Error Message for Failed */}
                  {crawl.status === 'failed' && crawl.errorMessage && (
                    <div className="mt-2 text-sm text-red-600">Error: {crawl.errorMessage}</div>
                  )}
                </div>

                <div className="ml-4">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      if (onViewCrawl) onViewCrawl(crawl);
                    }}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View Details →
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

export default CrawlHistory;
