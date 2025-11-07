import React, { useState, useMemo } from 'react';
import { Search, Filter, ArrowUpDown, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';

/**
 * PageTable Component
 *
 * Displays a table of pages with scores and filtering capabilities.
 * Supports filtering by score range, page type, and search.
 *
 * Props:
 * - pages: Array of page objects with scores
 * - onPageClick: Callback when page is clicked
 * - loading: Boolean indicating loading state
 */
function PageTable({ pages = [], onPageClick, loading = false }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('score');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filterPageType, setFilterPageType] = useState('all');
  const [filterScoreMin, setFilterScoreMin] = useState('');
  const [filterScoreMax, setFilterScoreMax] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Get unique page types
  const pageTypes = useMemo(() => {
    const types = new Set(pages.map(p => p.page_type || 'unknown'));
    return ['all', ...Array.from(types)];
  }, [pages]);

  // Filter and sort pages
  const filteredPages = useMemo(() => {
    let filtered = pages.filter(page => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        page.url?.toLowerCase().includes(searchLower) ||
        page.title?.toLowerCase().includes(searchLower);

      // Page type filter
      const matchesType = filterPageType === 'all' || page.page_type === filterPageType;

      // Score range filter
      const score = page.overall_score || 0;
      const matchesMinScore = !filterScoreMin || score >= parseInt(filterScoreMin, 10);
      const matchesMaxScore = !filterScoreMax || score <= parseInt(filterScoreMax, 10);

      return matchesSearch && matchesType && matchesMinScore && matchesMaxScore;
    });

    // Sort pages
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (sortField) {
        case 'score':
          aVal = a.overall_score || 0;
          bVal = b.overall_score || 0;
          break;
        case 'url':
          aVal = a.url || '';
          bVal = b.url || '';
          break;
        case 'type':
          aVal = a.page_type || '';
          bVal = b.page_type || '';
          break;
        case 'date':
          aVal = new Date(a.scored_at || 0);
          bVal = new Date(b.scored_at || 0);
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [pages, searchTerm, sortField, sortDirection, filterPageType, filterScoreMin, filterScoreMax]);

  // Handle sort
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Get score color
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    if (score >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  // Get score icon
  const getScoreIcon = (score) => {
    if (score >= 70) return <TrendingUp className="w-4 h-4 text-green-600" />;
    return <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  // Format page type
  const formatPageType = (type) => {
    if (!type) return 'Unknown';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-soft p-8 text-center">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-soft overflow-hidden">
      {/* Header with Search and Filters */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Pages ({filteredPages.length})
          </h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filters</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search pages by URL or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Page Type
              </label>
              <select
                value={filterPageType}
                onChange={(e) => setFilterPageType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {pageTypes.map(type => (
                  <option key={type} value={type}>
                    {formatPageType(type)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Score
              </label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="0"
                value={filterScoreMin}
                onChange={(e) => setFilterScoreMin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Score
              </label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="100"
                value={filterScoreMax}
                onChange={(e) => setFilterScoreMax(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      {filteredPages.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <p>No pages found matching your filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('url')}
                    className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                  >
                    <span>Page URL</span>
                    {sortField === 'url' && <ArrowUpDown className="w-3 h-3" />}
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('type')}
                    className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                  >
                    <span>Type</span>
                    {sortField === 'type' && <ArrowUpDown className="w-3 h-3" />}
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('score')}
                    className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                  >
                    <span>Score</span>
                    {sortField === 'score' && <ArrowUpDown className="w-3 h-3" />}
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('date')}
                    className="flex items-center space-x-1 text-xs font-medium text-gray-700 uppercase tracking-wider hover:text-gray-900"
                  >
                    <span>Last Scored</span>
                    {sortField === 'date' && <ArrowUpDown className="w-3 h-3" />}
                  </button>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPages.map((page, index) => (
                <tr
                  key={page.id || index}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onPageClick && onPageClick(page)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {page.url || 'Unknown URL'}
                        </p>
                        {page.title && (
                          <p className="text-sm text-gray-500 truncate">
                            {page.title}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {formatPageType(page.page_type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getScoreIcon(page.overall_score || 0)}
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getScoreColor(page.overall_score || 0)}`}>
                        {page.overall_score || 0}/100
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {page.scored_at ? new Date(page.scored_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-600 hover:text-blue-800 inline-flex items-center space-x-1"
                    >
                      <span>Visit</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PageTable;
