import React, { useState } from 'react';
import { ArrowLeft, RefreshCw, ExternalLink } from 'lucide-react';
import ScoreCard from './ScoreCard';
import CategoryBreakdown from './CategoryBreakdown';
import RecommendationsList from './RecommendationsList';

function ResultsDashboard({ result, onReset }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!result) {
    return null;
  }

  // Handle blocked domains
  if (result.blocked || result.status === 'blocked') {
    return (
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-soft-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Analysis Blocked</h1>
              </div>
              <p className="text-gray-600">
                {result.domain} restricts automated crawling via robots.txt
              </p>
            </div>
            
            <button
              onClick={onReset}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Try Another Domain</span>
            </button>
          </div>
        </div>

        {/* Blocked Domain Information */}
        <div className="bg-white rounded-2xl shadow-soft-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Respectful Crawling in Action</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              This website has robots.txt rules that prevent automated analysis. Our crawler respects these rules, which is actually a good sign - it shows the site owners are security-conscious and follow best practices.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-3">What This Means</h3>
              <ul className="text-blue-800 space-y-2 text-sm">
                <li>• The website has proper robots.txt configuration</li>
                <li>• Site owners control automated access responsibly</li>
                <li>• This is actually good practice for security</li>
                <li>• The domain may have sensitive or private content</li>
              </ul>
            </div>

            <div className="bg-green-50 rounded-lg p-6 border border-green-200">
              <h3 className="font-semibold text-green-900 mb-3">Alternative Analysis Options</h3>
              <ul className="text-green-800 space-y-2 text-sm">
                <li>• Manual review using browser developer tools</li>
                <li>• Contact site owner for analysis permission</li>
                <li>• Check if specific paths allow crawling</li>
                <li>• Use Google Search Console if you own the site</li>
              </ul>
            </div>
          </div>

          {/* Robots.txt Info */}
          {result.analysisData?.robotsInfo && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Robots.txt Information</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Robots.txt exists:</span>
                  <span className={`ml-2 font-medium ${result.analysisData.robotsInfo.exists ? 'text-green-600' : 'text-yellow-600'}`}>
                    {result.analysisData.robotsInfo.exists ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Crawling allowed:</span>
                  <span className="ml-2 font-medium text-red-600">No</span>
                </div>
                {result.analysisData.robotsInfo.crawlDelay && (
                  <div>
                    <span className="text-gray-600">Crawl delay:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {result.analysisData.robotsInfo.crawlDelay} seconds
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recommendations for Blocked Sites */}
          {result.recommendations && result.recommendations.length > 0 && (
            <div className="mt-6">
              <RecommendationsList 
                recommendations={result.recommendations}
                scores={{}}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', count: null },
    { id: 'recommendations', label: 'Recommendations', count: result.recommendations?.length || 0 },
    { id: 'technical', label: 'Technical Details', count: null }
  ];

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Needs Work';
    return 'Poor';
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-soft-xl p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">Analysis Results</h1>
              <div className="flex items-center space-x-1 text-sm text-gray-500">
                <ExternalLink className="w-4 h-4" />
                <a 
                  href={result.url || `https://${result.domain}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 font-medium"
                >
                  {result.url || result.domain}
                </a>
              </div>
            </div>
            <p className="text-gray-600">
              Analyzed on {new Date(result.analysisData?.crawlInfo?.crawlDate || Date.now()).toLocaleDateString()}
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onReset}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>New Analysis</span>
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="flex items-center space-x-2 px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overall Score Card */}
      <div className="mb-8">
        <ScoreCard
          title="Overall AI Search Readiness"
          score={result.overall_score || result.overallScore || 0}
          maxScore={100}
          description="Your website's overall optimization for AI search engines and Google AI Overviews"
          size="large"
        />
      </div>

      {/* Category Scores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <ScoreCard
          title="Content Quality"
          score={result.content_score || result.contentScore || 0}
          maxScore={100}
          category="content"
        />
        <ScoreCard
          title="E-A-T Signals"
          score={result.eat_score || result.eatScore || 0}
          maxScore={100}
          category="eat"
        />
        <ScoreCard
          title="Technical SEO"
          score={result.technical_score || result.technicalScore || 0}
          maxScore={100}
          category="technical"
        />
        <ScoreCard
          title="Structured Data"
          score={result.structured_data_score || result.structuredDataScore || 0}
          maxScore={100}
          category="structured"
        />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-soft-xl overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <CategoryBreakdown analysisData={result.analysisData || result.analysis_data} />
          )}

          {activeTab === 'recommendations' && (
            <RecommendationsList 
              recommendations={result.recommendations} 
              scores={{
                overall: result.overall_score || result.overallScore || 0,
                content: result.content_score || result.contentScore || 0,
                eat: result.eat_score || result.eatScore || 0,
                technical: result.technical_score || result.technicalScore || 0,
                structuredData: result.structured_data_score || result.structuredDataScore || 0
              }}
            />
          )}

          {activeTab === 'technical' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Technical Analysis Details</h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Crawl Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Analysis Date:</span>
                        <span className="text-gray-900">
                          {new Date(result.analysisData?.crawlInfo?.crawlDate || Date.now()).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Crawl Strategy:</span>
                        <span className={`font-medium ${
                          result.analysisData?.crawlInfo?.crawlStrategy === 'crawler' ? 'text-blue-600' :
                          result.analysisData?.crawlInfo?.crawlStrategy === 'browser' ? 'text-green-600' : 
                          'text-gray-600'
                        }`}>
                          {result.analysisData?.crawlInfo?.crawlStrategy === 'crawler' ? 'Identified Crawler' :
                           result.analysisData?.crawlInfo?.crawlStrategy === 'browser' ? 'Browser User Agent' :
                           'Standard'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">User Agent:</span>
                        <span className="text-gray-900 text-xs">
                          {result.analysisData?.crawlInfo?.userAgent?.includes('Chrome') ? 'Chrome Browser' :
                           result.analysisData?.crawlInfo?.userAgent?.includes('Firefox') ? 'Firefox Browser' :
                           result.analysisData?.crawlInfo?.userAgent?.includes('Safari') ? 'Safari Browser' :
                           'AI-Search-Crawler'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Crawl Delay:</span>
                        <span className="text-gray-900">
                          {result.analysisData?.crawlInfo?.crawlDelay || 2000}ms
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Robots.txt Analysis</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Robots.txt Found:</span>
                        <span className={`font-medium ${
                          result.analysisData?.robotsInfo?.exists ? 'text-green-600' : 'text-yellow-600'
                        }`}>
                          {result.analysisData?.robotsInfo?.exists ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Crawler Access:</span>
                        <span className={`font-medium ${
                          result.analysisData?.robotsInfo?.canCrawl ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {result.analysisData?.robotsInfo?.canCrawl ? 'Allowed' : 'Blocked'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Browser Access:</span>
                        <span className={`font-medium ${
                          result.analysisData?.robotsInfo?.canCrawlAsBrowser ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {result.analysisData?.robotsInfo?.canCrawlAsBrowser ? 'Allowed' : 'Blocked'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Robots.txt Strategy Information */}
              {result.analysisData?.crawlInfo?.robotsRecommendations && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-3">Robots.txt Strategy</h4>
                  <div className="space-y-1">
                    {result.analysisData.crawlInfo.robotsRecommendations.map((rec, index) => (
                      <p key={index} className="text-blue-700 text-sm">{rec}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Enhanced Strategy Explanation */}
              {result.analysisData?.crawlInfo?.crawlStrategy && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">How This Analysis Was Performed</h4>
                  <div className="text-sm text-gray-700">
                    {result.analysisData.crawlInfo.crawlStrategy === 'crawler' && (
                      <p>✅ <strong>Identified Crawler Method:</strong> This website allows SEO analysis tools to access and analyze content while identifying themselves as crawlers. This demonstrates transparent and ethical crawling practices.</p>
                    )}
                    {result.analysisData.crawlInfo.crawlStrategy === 'browser' && (
                      <p>✅ <strong>Browser User Agent Method:</strong> This analysis was performed using a standard browser user agent, similar to how major SEO tools like Semrush and Ahrefs operate. This approach analyzes publicly accessible content while respecting the site's access preferences.</p>
                    )}
                  </div>
                </div>
              )}

              {result.error_message && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-2">Analysis Error</h4>
                  <p className="text-red-700 text-sm">{result.error_message}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResultsDashboard;