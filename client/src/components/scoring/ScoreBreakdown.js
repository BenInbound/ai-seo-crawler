import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Award,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';

/**
 * ScoreBreakdown Component
 *
 * Displays a detailed breakdown of page scores by criterion.
 * Shows overall score, individual criterion scores, and explanations.
 *
 * Props:
 * - overallScore: Overall score (0-100)
 * - criteriaScores: Object with criterion names and scores
 * - criteriaExplanations: Object with criterion names and explanation text
 * - pageType: Page type for context
 */
function ScoreBreakdown({
  overallScore = 0,
  criteriaScores = {},
  criteriaExplanations = {},
  pageType = 'unknown'
}) {
  const [expandedCriteria, setExpandedCriteria] = useState({});

  // Get score color and label
  const getScoreColor = (score) => {
    if (score >= 80) return {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      accent: 'text-green-600',
      progress: 'bg-green-500'
    };
    if (score >= 60) return {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-700',
      accent: 'text-yellow-600',
      progress: 'bg-yellow-500'
    };
    if (score >= 40) return {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-700',
      accent: 'text-orange-600',
      progress: 'bg-orange-500'
    };
    return {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      accent: 'text-red-600',
      progress: 'bg-red-500'
    };
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  const getScoreIcon = (score) => {
    if (score >= 80) return <CheckCircle className="w-5 h-5" />;
    if (score >= 60) return <TrendingUp className="w-5 h-5" />;
    if (score >= 40) return <AlertCircle className="w-5 h-5" />;
    return <XCircle className="w-5 h-5" />;
  };

  // Format criterion name
  const formatCriterionName = (name) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get criterion category
  const getCriterionCategory = (name) => {
    const categories = {
      direct_answer: 'Content Quality',
      question_coverage: 'Content Quality',
      readability: 'Content Quality',
      eeat_signals: 'E-A-T Signals',
      outbound_links: 'E-A-T Signals',
      performance: 'Technical SEO',
      indexing: 'Technical SEO',
      internal_linking: 'Technical SEO',
      accessibility: 'Technical SEO',
      schema_markup: 'Structured Data'
    };
    return categories[name] || 'General';
  };

  // Toggle criterion expansion
  const toggleCriterion = (name) => {
    setExpandedCriteria(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  // Group criteria by category
  const criteriaByCategory = {};
  Object.entries(criteriaScores).forEach(([name, score]) => {
    const category = getCriterionCategory(name);
    if (!criteriaByCategory[category]) {
      criteriaByCategory[category] = [];
    }
    criteriaByCategory[category].push({ name, score });
  });

  // Calculate category averages
  const categoryAverages = {};
  Object.entries(criteriaByCategory).forEach(([category, criteria]) => {
    const sum = criteria.reduce((acc, c) => acc + c.score, 0);
    categoryAverages[category] = Math.round(sum / criteria.length);
  });

  const overallColors = getScoreColor(overallScore);

  return (
    <div className="bg-white rounded-xl shadow-soft overflow-hidden">
      {/* Overall Score Header */}
      <div className={`${overallColors.bg} border-b ${overallColors.border} p-6`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Award className={`w-6 h-6 ${overallColors.accent}`} />
              <h2 className="text-2xl font-bold text-gray-900">Overall Score</h2>
            </div>
            <p className="text-gray-600 text-sm">
              {formatCriterionName(pageType)} page • {Object.keys(criteriaScores).length} criteria evaluated
            </p>
          </div>
          <div className="text-right">
            <div className={`${overallColors.accent} font-bold text-5xl`}>
              {overallScore}
              <span className="text-2xl text-gray-600">/100</span>
            </div>
            <div className={`mt-2 inline-flex items-center space-x-1 ${overallColors.accent}`}>
              {getScoreIcon(overallScore)}
              <span className="font-medium text-sm">{getScoreLabel(overallScore)}</span>
            </div>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="mt-4 w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full ${overallColors.progress} transition-all duration-500 ease-out`}
            style={{ width: `${Math.min(overallScore, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Breakdown</h3>

        <div className="space-y-6">
          {Object.entries(criteriaByCategory).map(([category, criteria]) => {
            const avgScore = categoryAverages[category];
            const colors = getScoreColor(avgScore);

            return (
              <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Category Header */}
                <div className={`${colors.bg} border-b ${colors.border} px-4 py-3`}>
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900">{category}</h4>
                    <div className="flex items-center space-x-2">
                      <span className={`${colors.accent} font-semibold text-sm`}>
                        {avgScore}/100
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.accent}`}>
                        {getScoreLabel(avgScore)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Criteria List */}
                <div className="divide-y divide-gray-200">
                  {criteria.map(({ name, score }) => {
                    const isExpanded = expandedCriteria[name];
                    const criterionColors = getScoreColor(score);
                    const explanation = criteriaExplanations[name] || 'No explanation available';

                    return (
                      <div key={name} className="bg-white">
                        <button
                          onClick={() => toggleCriterion(name)}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <div className={criterionColors.accent}>
                              {getScoreIcon(score)}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {formatCriterionName(name)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full ${criterionColors.progress} transition-all duration-300`}
                                style={{ width: `${Math.min(score, 100)}%` }}
                              ></div>
                            </div>
                            <span className={`${criterionColors.accent} font-semibold text-sm w-12 text-right`}>
                              {score}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </button>

                        {/* Expanded Explanation */}
                        {isExpanded && (
                          <div className="px-4 pb-4 bg-gray-50">
                            <div className="flex items-start space-x-2 p-3 bg-white rounded-lg border border-gray-200">
                              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                              <p className="text-sm text-gray-700">{explanation}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scoring Guide */}
      <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Scoring Guide</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-xs text-gray-600">81-100: Excellent</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-xs text-gray-600">61-80: Good</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span className="text-xs text-gray-600">41-60: Fair</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-xs text-gray-600">0-40: Poor</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScoreBreakdown;
