import React, { useState } from 'react';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Filter
} from 'lucide-react';

function RecommendationsList({ recommendations, scores }) {
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedItems, setExpandedItems] = useState({});
  const [copiedCode, setCopiedCode] = useState(null);

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Excellent Work!</h3>
        <p className="text-gray-600">
          Your website is well-optimized for AI search. No major recommendations at this time.
        </p>
      </div>
    );
  }

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'medium':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'low':
        return <Info className="w-4 h-4 text-blue-600" />;
      default:
        return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'low':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCopyCode = (code, index) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(index);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const toggleExpanded = (index) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const filteredRecommendations = recommendations.filter(rec => {
    const priorityMatch = selectedPriority === 'all' || rec.priority === selectedPriority;
    const categoryMatch = selectedCategory === 'all' || rec.category === selectedCategory;
    return priorityMatch && categoryMatch;
  });

  const categories = [...new Set(recommendations.map(rec => rec.category))];
  const priorityCounts = {
    high: recommendations.filter(rec => rec.priority === 'high').length,
    medium: recommendations.filter(rec => rec.priority === 'medium').length,
    low: recommendations.filter(rec => rec.priority === 'low').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Optimization Recommendations
          </h3>
          <p className="text-gray-600">
            Prioritized improvements to boost your AI search readiness
          </p>
        </div>

        <div className="flex items-center space-x-2 text-sm">
          <div className="flex items-center space-x-1 px-2 py-1 bg-red-100 rounded-full">
            <AlertTriangle className="w-3 h-3 text-red-600" />
            <span className="text-red-700 font-medium">{priorityCounts.high}</span>
          </div>
          <div className="flex items-center space-x-1 px-2 py-1 bg-yellow-100 rounded-full">
            <AlertCircle className="w-3 h-3 text-yellow-600" />
            <span className="text-yellow-700 font-medium">{priorityCounts.medium}</span>
          </div>
          <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 rounded-full">
            <Info className="w-3 h-3 text-blue-600" />
            <span className="text-blue-700 font-medium">{priorityCounts.low}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter by:</span>
          </div>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Recommendations */}
      <div className="space-y-4">
        {filteredRecommendations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Info className="w-8 h-8 mx-auto mb-2" />
            <p>No recommendations match your current filters.</p>
          </div>
        ) : (
          filteredRecommendations.map((recommendation, index) => (
            <div
              key={index}
              className={`border rounded-lg p-6 ${getPriorityColor(recommendation.priority)}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  {getPriorityIcon(recommendation.priority)}
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-semibold text-gray-900">
                        {recommendation.issue}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadge(recommendation.priority)}`}>
                        {recommendation.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{recommendation.category}</p>
                  </div>
                </div>

                <button
                  onClick={() => toggleExpanded(index)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {expandedItems[index] ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Recommendation */}
              <div className="mb-4">
                <p className="text-gray-800 font-medium mb-2">Recommendation:</p>
                <p className="text-gray-700">{recommendation.recommendation}</p>
              </div>

              {/* Impact */}
              {recommendation.impact && (
                <div className="mb-4 p-3 bg-white rounded-lg border">
                  <p className="text-sm text-gray-600">
                    <strong>Impact:</strong> {recommendation.impact}
                  </p>
                </div>
              )}

              {/* Expanded Details */}
              {expandedItems[index] && (
                <div className="space-y-4 border-t pt-4">
                  {/* Example */}
                  {recommendation.example && (
                    <div>
                      <p className="text-sm font-medium text-gray-800 mb-2">Example:</p>
                      <p className="text-sm text-gray-700 italic">{recommendation.example}</p>
                    </div>
                  )}

                  {/* Implementation */}
                  {recommendation.implementation && (
                    <div>
                      <p className="text-sm font-medium text-gray-800 mb-2">Implementation:</p>
                      <div className="bg-gray-800 rounded-lg p-3 overflow-x-auto">
                        <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
                          {recommendation.implementation}
                        </pre>
                        <button
                          onClick={() => handleCopyCode(recommendation.implementation, `impl-${index}`)}
                          className="mt-2 flex items-center space-x-1 text-xs text-gray-400 hover:text-white"
                        >
                          <Copy className="w-3 h-3" />
                          <span>
                            {copiedCode === `impl-${index}` ? 'Copied!' : 'Copy code'}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Current Score */}
                  {recommendation.currentScore && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Current Status:</strong> {recommendation.currentScore}
                      </p>
                    </div>
                  )}

                  {/* Urgency */}
                  {recommendation.urgency && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">
                        <strong>Urgency:</strong> {recommendation.urgency}
                      </p>
                    </div>
                  )}

                  {/* Condition */}
                  {recommendation.condition && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>When to apply:</strong> {recommendation.condition}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Quick Action Summary */}
      {recommendations.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
          <h4 className="font-semibold text-gray-900 mb-3">Quick Action Summary</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 mb-1">
                {priorityCounts.high}
              </div>
              <div className="text-sm text-gray-600">High Priority</div>
              <div className="text-xs text-gray-500 mt-1">Address first</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 mb-1">
                {priorityCounts.medium}
              </div>
              <div className="text-sm text-gray-600">Medium Priority</div>
              <div className="text-xs text-gray-500 mt-1">Next steps</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {priorityCounts.low}
              </div>
              <div className="text-sm text-gray-600">Low Priority</div>
              <div className="text-xs text-gray-500 mt-1">Future improvements</div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-sm text-gray-600 text-center">
              Focus on high-priority items first for maximum impact on your AI search visibility.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecommendationsList;