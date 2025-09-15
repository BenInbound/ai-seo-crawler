import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

function ScoreCard({ title, score, maxScore = 100, category, description, size = 'normal' }) {
  const percentage = Math.min(Math.max((score / maxScore) * 100, 0), 100);
  
  const getScoreColor = (score) => {
    if (score >= 80) return {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      accent: 'text-green-600',
      progress: 'from-green-400 to-green-600'
    };
    if (score >= 60) return {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-700',
      accent: 'text-yellow-600',
      progress: 'from-yellow-400 to-yellow-600'
    };
    return {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      accent: 'text-red-600',
      progress: 'from-red-400 to-red-600'
    };
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Needs Work';
    return 'Poor';
  };

  const getScoreIcon = (score) => {
    if (score >= 70) return <TrendingUp className="w-4 h-4" />;
    if (score >= 40) return <Minus className="w-4 h-4" />;
    return <TrendingDown className="w-4 h-4" />;
  };

  const colors = getScoreColor(score);
  const isLarge = size === 'large';

  return (
    <div className={`bg-white rounded-xl shadow-soft border ${colors.border} ${isLarge ? 'p-8' : 'p-4'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={`font-semibold ${colors.text} ${isLarge ? 'text-xl' : 'text-sm'}`}>
            {title}
          </h3>
          {description && (
            <p className="text-gray-600 text-sm mt-1">{description}</p>
          )}
        </div>
        
        <div className={`flex items-center space-x-1 ${colors.accent}`}>
          {getScoreIcon(score)}
          <span className={`font-medium ${isLarge ? 'text-sm' : 'text-xs'}`}>
            {getScoreLabel(score)}
          </span>
        </div>
      </div>

      {/* Score Display */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className={`${colors.accent} font-bold ${isLarge ? 'text-4xl' : 'text-2xl'} score-animate`}>
            {score}
            <span className={`${colors.text} font-normal ${isLarge ? 'text-2xl' : 'text-lg'}`}>
              /{maxScore}
            </span>
          </div>
        </div>
        
        <div className={`${colors.bg} px-3 py-1 rounded-full`}>
          <span className={`${colors.accent} font-medium text-sm`}>
            {Math.round(percentage)}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`bg-gradient-to-r ${colors.progress} h-2 rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Category-specific insights */}
      {!isLarge && category && (
        <div className="mt-3 text-xs text-gray-500">
          {category === 'content' && 'Content structure, readability, and AI optimization'}
          {category === 'eat' && 'Expertise, Authority, and Trustworthiness signals'}
          {category === 'technical' && 'Mobile, speed, security, and technical SEO'}
          {category === 'structured' && 'Schema markup and rich snippets'}
        </div>
      )}

      {/* AI Readiness Indicator for large cards */}
      {isLarge && (
        <div className="mt-6 flex items-center justify-center space-x-2 p-3 bg-gray-50 rounded-lg">
          <div className={`w-2 h-2 rounded-full ${
            score >= 70 ? 'bg-green-500 animate-pulse' : 
            score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          <span className="text-sm text-gray-600 font-medium">
            {score >= 70 ? 'Ready for AI Search' : 
             score >= 40 ? 'Partially Optimized' : 'Needs Optimization'}
          </span>
        </div>
      )}
    </div>
  );
}

export default ScoreCard;