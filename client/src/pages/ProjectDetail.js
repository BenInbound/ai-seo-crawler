/**
 * Project Detail Page
 *
 * Displays detailed information about a project including:
 * - Project metadata
 * - Crawl management (initiate, history, status)
 * - Pages list with scores
 *
 * Integrates User Story 2 and 3 components
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Clock, Database } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useOrg } from '../contexts/OrgContext';
import CrawlForm from '../components/projects/CrawlForm';
import CrawlHistory from '../components/projects/CrawlHistory';
import PageTable from '../components/pages/PageTable';
import api, { projects as projectsAPI } from '../services/api';

function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentOrg, canEdit } = useOrg();

  const [project, setProject] = useState(null);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCrawlForm, setShowCrawlForm] = useState(false);
  const [activeTab, setActiveTab] = useState('pages'); // 'pages' or 'crawls'
  const [selectedCrawl, setSelectedCrawl] = useState(null);

  // Fetch project details
  const loadProject = useCallback(async () => {
    if (!projectId || !currentOrg) return;

    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/projects/${projectId}`);
      setProject(response.data);
    } catch (err) {
      console.error('Error fetching project:', err);
      setError(err.response?.data?.error || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId, currentOrg]);

  // Fetch project pages
  const loadPages = useCallback(async () => {
    if (!projectId) return;

    try {
      setPagesLoading(true);
      const response = await api.get(`/projects/${projectId}/pages`);
      setPages(response.data.pages || []);
    } catch (err) {
      console.error('Error fetching pages:', err);
      // Don't show error for pages - just log it
    } finally {
      setPagesLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
    loadPages();
  }, [loadProject, loadPages]);

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleStartCrawl = () => {
    setShowCrawlForm(true);
  };

  const handleCrawlSuccess = () => {
    setShowCrawlForm(false);
    setActiveTab('crawls');
    // Refresh project to get updated crawl count
    loadProject();
  };

  const handleCrawlCancel = () => {
    setShowCrawlForm(false);
  };

  const handlePageClick = (page) => {
    navigate(`/pages/${page.id}`);
  };

  const handleViewCrawl = (crawl) => {
    setSelectedCrawl(crawl);
  };

  const handleCloseCrawlDetail = () => {
    setSelectedCrawl(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={handleBack}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Project not found</p>
          <button
            onClick={handleBack}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#F8F8F4] shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <p className="text-sm text-gray-500 mt-1">{project.target_url}</p>
            </div>
            {canEdit() && !showCrawlForm && (
              <button
                onClick={handleStartCrawl}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Play className="mr-2 h-4 w-4" />
                Start Crawl
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <button
          onClick={handleBack}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          <span>Back</span>
        </button>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-8">
        {/* Project Info Card */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center text-sm text-gray-500 mb-1">
                <Clock className="h-4 w-4 mr-1" />
                Created
              </div>
              <p className="text-sm font-medium text-gray-900">{formatDate(project.created_at)}</p>
            </div>
            <div>
              <div className="flex items-center text-sm text-gray-500 mb-1">
                <Database className="h-4 w-4 mr-1" />
                Crawls
              </div>
              <p className="text-sm font-medium text-gray-900">
                {project.crawl_count || 0} {project.crawl_count === 1 ? 'crawl' : 'crawls'}
              </p>
            </div>
            <div>
              <div className="flex items-center text-sm text-gray-500 mb-1">
                <Database className="h-4 w-4 mr-1" />
                Pages
              </div>
              <p className="text-sm font-medium text-gray-900">
                {pages.length} {pages.length === 1 ? 'page' : 'pages'}
              </p>
            </div>
          </div>
          {project.description && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">{project.description}</p>
            </div>
          )}
        </div>

        {/* Crawl Form */}
        {showCrawlForm && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Start New Crawl</h2>
            <CrawlForm
              projectId={projectId}
              onSuccess={handleCrawlSuccess}
              onCancel={handleCrawlCancel}
            />
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('pages')}
                className={`${
                  activeTab === 'pages'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
              >
                Pages ({pages.length})
              </button>
              <button
                onClick={() => setActiveTab('crawls')}
                className={`${
                  activeTab === 'crawls'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
              >
                Crawl History ({project.crawl_count || 0})
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'pages' ? (
              <div>
                <PageTable
                  pages={pages}
                  onPageClick={handlePageClick}
                  loading={pagesLoading}
                />
              </div>
            ) : (
              <div>
                {selectedCrawl ? (
                  <div className="space-y-4">
                    {/* Crawl Detail View */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={handleCloseCrawlDetail}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        ← Back to Crawl History
                      </button>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Crawl Details
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Status
                          </label>
                          <p className="text-sm text-gray-900 capitalize">{selectedCrawl.status}</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Run Type
                          </label>
                          <p className="text-sm text-gray-900 capitalize">{selectedCrawl.runType?.replace('_', ' ')}</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Pages Discovered
                          </label>
                          <p className="text-sm text-gray-900">{selectedCrawl.pagesDiscovered?.toLocaleString()}</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Pages Processed
                          </label>
                          <p className="text-sm text-gray-900">{selectedCrawl.pagesProcessed?.toLocaleString()}</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Token Usage
                          </label>
                          <p className="text-sm text-gray-900">{selectedCrawl.tokenUsage?.toLocaleString()}</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Started At
                          </label>
                          <p className="text-sm text-gray-900">{formatDate(selectedCrawl.startedAt)}</p>
                        </div>

                        {selectedCrawl.completedAt && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Completed At
                            </label>
                            <p className="text-sm text-gray-900">{formatDate(selectedCrawl.completedAt)}</p>
                          </div>
                        )}

                        {selectedCrawl.errorMessage && (
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-red-700 mb-1">
                              Error Message
                            </label>
                            <p className="text-sm text-red-600">{selectedCrawl.errorMessage}</p>
                          </div>
                        )}
                      </div>

                      {/* Progress bar */}
                      {(selectedCrawl.status === 'running' || selectedCrawl.status === 'paused') && (
                        <div className="mt-6">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Progress
                          </label>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.round((selectedCrawl.pagesProcessed / selectedCrawl.pagesDiscovered) * 100)}%`
                              }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {Math.round((selectedCrawl.pagesProcessed / selectedCrawl.pagesDiscovered) * 100)}% complete
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <CrawlHistory projectId={projectId} onViewCrawl={handleViewCrawl} />
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default ProjectDetail;
