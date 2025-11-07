/**
 * Page Detail Page
 *
 * Displays detailed information about a scored page including:
 * - Page metadata and score breakdown
 * - Individual criterion scores
 * - AI recommendations
 * - Rescore functionality
 *
 * Based on User Story 3: Intelligent Page Scoring
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useOrg } from '../contexts/OrgContext';
import PageDetailComponent from '../components/pages/PageDetail';
import api from '../services/api';

function PageDetailPage() {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentOrg } = useOrg();

  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch page details
  useEffect(() => {
    if (!pageId || !currentOrg) return;

    const fetchPageDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch page with score data
        const response = await api.get(`/api/pages/${pageId}`);
        setPage(response.data);
      } catch (err) {
        console.error('Error fetching page details:', err);
        setError(err.response?.data?.error || 'Failed to load page details');
      } finally {
        setLoading(false);
      }
    };

    fetchPageDetails();
  }, [pageId, currentOrg]);

  // Handle rescore
  const handleRescore = async (pageId) => {
    try {
      // Trigger rescore job
      const response = await api.post(`/api/pages/${pageId}/rescore`);

      // Optionally poll for completion or show success message
      alert(
        'Rescoring initiated! The page will be rescored in the background. Refresh to see updated results.'
      );

      // Refresh page data after a delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      console.error('Error rescoring page:', err);
      alert(err.response?.data?.error || 'Failed to initiate rescoring');
    }
  };

  // Handle back navigation
  const handleBack = () => {
    // Try to go back in history, or navigate to dashboard
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Loading Page Details...</h1>
            </div>
          </div>
        </header>

        {/* Loading State */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="inline-flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Page Details</h1>
            </div>
          </div>
        </header>

        {/* Error State */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Page</h3>
                <p className="text-red-700">{error}</p>
                <button
                  onClick={handleBack}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-red-700 hover:bg-red-100 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                <span className="hidden sm:inline">Back</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Page Analysis</h1>
                {currentOrg && (
                  <p className="text-sm text-gray-600 mt-1">
                    Organization: <span className="font-medium">{currentOrg.name}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-sm text-gray-700">
                <span className="font-medium">{user?.name || user?.email}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageDetailComponent page={page} onRescore={handleRescore} loading={false} />
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

export default PageDetailPage;
