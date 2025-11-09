import React, { useState } from 'react';
import {
  ExternalLink,
  Calendar,
  Tag,
  FileText,
  BarChart3,
  Lightbulb,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import ScoreBreakdown from '../scoring/ScoreBreakdown';

/**
 * PageDetail Component
 *
 * Displays detailed information about a page including:
 * - Page metadata (URL, type, last scored)
 * - Overall score with breakdown
 * - Individual criterion scores with explanations
 * - AI recommendations
 * - Page snapshot information
 *
 * Props:
 * - page: Page object with score data
 * - onRescore: Callback to trigger rescoring
 * - loading: Boolean indicating loading state
 * - isAnalyzing: Boolean indicating if analysis is in progress
 */
function PageDetail({ page, onRescore, loading = false, isAnalyzing = false }) {
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [pageType, setPageType] = useState(page?.page_type || 'resource');
  const [isUpdatingPageType, setIsUpdatingPageType] = useState(false);

  // Update local state when page changes
  React.useEffect(() => {
    if (page?.page_type) {
      setPageType(page.page_type);
    }
  }, [page?.page_type]);

  if (loading || !page) {
    return (
      <div className="bg-white rounded-xl shadow-soft p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const handleRescore = async () => {
    if (onRescore && !isAnalyzing) {
      await onRescore(page.id);
    }
  };

  const handlePageTypeChange = async (newPageType) => {
    if (newPageType === pageType || isUpdatingPageType) return;

    setIsUpdatingPageType(true);
    try {
      const api = (await import('../../services/api')).default;
      await api.patch(`/pages/${page.id}`, { page_type: newPageType });
      setPageType(newPageType);

      // Refresh page data after a delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error updating page type:', error);
      alert('Failed to update page type. Please try again.');
      // Revert to original
      setPageType(page.page_type);
    } finally {
      setIsUpdatingPageType(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const formatPageType = (type) => {
    if (!type) return 'Unknown';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const pageTypes = [
    { value: 'homepage', label: 'Homepage' },
    { value: 'blog', label: 'Blog' },
    { value: 'product', label: 'Product' },
    { value: 'solution', label: 'Solution' },
    { value: 'resource', label: 'Resource' },
    { value: 'conversion', label: 'Conversion' }
  ];

  return (
    <div className="space-y-6">
      {/* Analyzing Status Banner */}
      {isAnalyzing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900">Analysis in Progress</h3>
              <p className="text-sm text-blue-700 mt-1">
                Your page is being analyzed. This usually takes 10-30 seconds.
                The results will appear automatically when complete - no need to refresh!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-soft p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {page.title || 'Page Details'}
            </h1>
            <a
              href={page.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 inline-flex items-center space-x-1 text-sm"
            >
              <span className="truncate max-w-xl">{page.url}</span>
              <ExternalLink className="w-4 h-4 flex-shrink-0" />
            </a>
          </div>

          <button
            onClick={handleRescore}
            disabled={isAnalyzing}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Analyzing...' : 'Analyze'}</span>
          </button>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Tag className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <label htmlFor="page-type" className="text-xs text-gray-500 uppercase block mb-1">
                Page Type
              </label>
              <select
                id="page-type"
                value={pageType || 'resource'}
                onChange={(e) => handlePageTypeChange(e.target.value)}
                disabled={isUpdatingPageType}
                className="text-sm font-medium text-gray-900 border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed w-full"
              >
                {pageTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {isUpdatingPageType ? 'Updating...' : 'Auto-detected (can be changed)'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Last Scored</p>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(page.scored_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Rubric Version</p>
              <p className="text-sm font-medium text-gray-900">
                {page.rubric_version || '1.0'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      {page.criteria_scores && (
        <ScoreBreakdown
          overallScore={page.overall_score || 0}
          criteriaScores={page.criteria_scores}
          criteriaExplanations={page.criteria_explanations || {}}
          pageType={page.page_type}
        />
      )}

      {/* AI Recommendations */}
      {page.ai_recommendations && page.ai_recommendations.length > 0 && (
        <div className="bg-white rounded-xl shadow-soft p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              AI Recommendations
            </h2>
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
              {page.ai_recommendations.length}
            </span>
          </div>

          <div className="space-y-4">
            {page.ai_recommendations.map((rec, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {rec.category || 'General'}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-2">{rec.text}</p>
                    {rec.references && rec.references.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 uppercase mb-1">References:</p>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                          {rec.references.map((ref, refIndex) => (
                            <li key={refIndex}>{ref}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Snapshot Information */}
      <div className="bg-white rounded-xl shadow-soft">
        <button
          onClick={() => setShowSnapshot(!showSnapshot)}
          className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Snapshot Information
            </h2>
          </div>
          {showSnapshot ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {showSnapshot && (
          <div className="px-6 pb-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Snapshot ID</p>
                <p className="text-sm text-gray-600 font-mono">
                  {page.snapshot_id || 'N/A'}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Content Hash</p>
                <p className="text-sm text-gray-600 font-mono truncate">
                  {page.ai_cache_key || 'N/A'}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">AI Tokens Used</p>
                <p className="text-sm text-gray-600">
                  {page.ai_tokens_used?.toLocaleString() || 0} tokens
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Snapshot Date</p>
                <p className="text-sm text-gray-600">
                  {formatDate(page.snapshot_at)}
                </p>
              </div>
            </div>

            {page.word_count && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Content Stats</p>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>Word Count: {page.word_count.toLocaleString()}</span>
                  {page.internal_links_count && (
                    <span>Internal Links: {page.internal_links_count}</span>
                  )}
                  {page.outbound_links_count && (
                    <span>Outbound Links: {page.outbound_links_count}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Token Usage Information */}
      {page.ai_tokens_used > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <BarChart3 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">Token Usage</p>
              <p className="text-sm text-blue-700 mt-1">
                This page analysis used{' '}
                <span className="font-semibold">
                  {page.ai_tokens_used.toLocaleString()} tokens
                </span>
                . Identical content will be served from cache on future scoring.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PageDetail;
