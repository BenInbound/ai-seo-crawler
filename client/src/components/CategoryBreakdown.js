import React from 'react';
import { 
  FileText, 
  Shield, 
  Smartphone, 
  Code, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  Users,
  Search
} from 'lucide-react';

function CategoryBreakdown({ analysisData }) {
  if (!analysisData) {
    return (
      <div className="text-center py-8 text-gray-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-4" />
        <p>No detailed analysis data available</p>
      </div>
    );
  }

  const StatusIcon = ({ status }) => {
    if (status === true) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === false) return <XCircle className="w-4 h-4 text-red-500" />;
    return <AlertCircle className="w-4 h-4 text-yellow-500" />;
  };

  const categories = [
    {
      title: 'Content Quality & AI Optimization',
      icon: <FileText className="w-5 h-5 text-blue-600" />,
      data: analysisData.content || {},
      aiData: analysisData.aiReadiness || {},
      items: [
        {
          label: 'Word Count',
          value: analysisData.content?.wordCount || 0,
          status: (analysisData.content?.wordCount || 0) >= 500,
          detail: 'words'
        },
        {
          label: 'Direct Answer in Opening',
          value: analysisData.content?.hasDirectAnswer ? 'Yes' : 'No',
          status: analysisData.content?.hasDirectAnswer,
          detail: 'First 2-3 lines answer main question'
        },
        {
          label: 'Content Format',
          value: analysisData.content?.contentFormat || 'Unknown',
          status: ['listicle', 'step-by-step guide', 'comparison'].includes(analysisData.content?.contentFormat),
          detail: 'Optimized for AI search'
        },
        {
          label: 'FAQ Section',
          value: analysisData.content?.faqAnalysis?.hasFAQSection ? 'Yes' : 'No',
          status: analysisData.content?.faqAnalysis?.hasFAQSection,
          detail: `${analysisData.content?.faqAnalysis?.questionCount || 0} questions found`
        },
        {
          label: 'AI Overview Keywords',
          value: `${analysisData.aiReadiness?.aiOverviewOptimization?.matchedKeywords?.length || 0}`,
          status: (analysisData.aiReadiness?.aiOverviewOptimization?.matchedKeywords?.length || 0) > 0,
          detail: 'Keywords that trigger AI overviews'
        }
      ]
    },
    {
      title: `E-A-T (Expertise, Authority, Trust)${analysisData.pageType ? ` - ${analysisData.pageType.charAt(0).toUpperCase() + analysisData.pageType.slice(1)} Page` : ''}`,
      icon: <Shield className="w-5 h-5 text-green-600" />,
      data: analysisData.eat || {},
      items: [
        {
          label: 'Author Information',
          value: analysisData.eat?.authorInfo?.hasAuthor ? 'Present' : 'Missing',
          status: analysisData.eat?.authorInfo?.hasAuthor,
          detail: analysisData.eat?.authorInfo?.hasAuthorBio ? 'With bio' : 'Basic info only'
        },
        {
          label: 'Contact Information',
          value: (analysisData.eat?.contactInfo?.hasContact || analysisData.eat?.contactInfo?.hasContactPage) ? 'Available' : 'Missing',
          status: analysisData.eat?.contactInfo?.hasContact || analysisData.eat?.contactInfo?.hasContactPage,
          detail: 'Builds trust with visitors'
        },
        {
          label: 'External Citations',
          value: `${analysisData.eat?.citations?.authorityCitations || 0}`,
          status: (analysisData.eat?.citations?.authorityCitations || 0) > 0,
          detail: 'Links to authoritative sources'
        },
        {
          label: 'Content Freshness',
          value: (analysisData.eat?.publishDate || analysisData.eat?.lastUpdated) ? 'Dated' : 'No dates',
          status: !!(analysisData.eat?.publishDate || analysisData.eat?.lastUpdated),
          detail: 'Publication or update dates visible'
        },
        ...(analysisData.eat?.pageSpecificFactors?.factors?.length > 0 ? [{
          label: `Page-Specific Trust Factors`,
          value: `${analysisData.eat.pageSpecificFactors.factors.length} factors`,
          status: analysisData.eat.pageSpecificFactors.score > 50,
          detail: analysisData.eat.pageSpecificFactors.factors.join(', ')
        }] : [])
      ]
    },
    {
      title: 'Technical SEO',
      icon: <Smartphone className="w-5 h-5 text-purple-600" />,
      data: analysisData.technical || {},
      items: [
        {
          label: 'HTTPS Security',
          value: analysisData.technical?.isHTTPS ? 'Secure' : 'Not Secure',
          status: analysisData.technical?.isHTTPS,
          detail: 'SSL certificate active'
        },
        {
          label: 'Mobile Viewport',
          value: analysisData.technical?.mobileOptimization?.hasViewportMeta ? 'Optimized' : 'Not Set',
          status: analysisData.technical?.mobileOptimization?.hasViewportMeta,
          detail: 'Mobile-first indexing ready'
        },
        {
          label: 'Meta Description',
          value: analysisData.technical?.metaAnalysis?.hasMetaDescription ? 'Present' : 'Missing',
          status: analysisData.technical?.metaAnalysis?.hasMetaDescription,
          detail: `${analysisData.technical?.metaAnalysis?.metaDescriptionLength || 0} characters`
        },
        {
          label: 'Page Speed',
          value: `${((analysisData.technical?.speedFactors?.loadTime || 0) / 1000).toFixed(1)}s`,
          status: (analysisData.technical?.speedFactors?.loadTime || 0) < 3000,
          detail: 'Load time performance'
        },
        {
          label: 'Image Alt Text',
          value: `${Math.round(analysisData.technical?.imageOptimization?.imagesWithAlt || 0)}%`,
          status: (analysisData.technical?.imageOptimization?.imagesWithAlt || 0) >= 80,
          detail: `${analysisData.technical?.imageOptimization?.totalImages || 0} images analyzed`
        }
      ]
    },
    {
      title: 'Structured Data & Schema',
      icon: <Code className="w-5 h-5 text-orange-600" />,
      data: analysisData.structuredData || {},
      items: [
        {
          label: 'Schema Markup',
          value: analysisData.structuredData?.hasStructuredData ? 'Present' : 'Missing',
          status: analysisData.structuredData?.hasStructuredData,
          detail: `${analysisData.structuredData?.totalSchemaCount || 0} schemas found`
        },
        {
          label: 'FAQ Schema',
          value: analysisData.structuredData?.faqSchema?.hasFAQSchema ? 'Implemented' : 'Not Found',
          status: analysisData.structuredData?.faqSchema?.hasFAQSchema,
          detail: `${analysisData.structuredData?.faqSchema?.questionCount || 0} questions in schema`
        },
        {
          label: 'Article Schema',
          value: analysisData.structuredData?.articleSchema?.hasArticleSchema ? 'Present' : 'Missing',
          status: analysisData.structuredData?.articleSchema?.hasArticleSchema,
          detail: 'Helps AI understand content type'
        },
        {
          label: 'HowTo Schema',
          value: analysisData.structuredData?.howToSchema?.hasHowToSchema ? 'Present' : 'Not Applicable',
          status: analysisData.structuredData?.howToSchema?.hasHowToSchema || null,
          detail: 'For step-by-step content'
        },
        {
          label: 'Schema Types',
          value: `${analysisData.structuredData?.schemaTypes?.length || 0}`,
          status: (analysisData.structuredData?.schemaTypes?.length || 0) >= 2,
          detail: analysisData.structuredData?.schemaTypes?.join(', ') || 'None detected'
        }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Detailed Analysis Breakdown</h3>
        <p className="text-gray-600">Comprehensive evaluation across all AI search optimization factors</p>
      </div>

      {categories.map((category, index) => (
        <div key={index} className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            {category.icon}
            <h4 className="text-lg font-semibold text-gray-900">{category.title}</h4>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {category.items.map((item, itemIndex) => (
              <div key={itemIndex} className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  <StatusIcon status={item.status} />
                </div>
                
                <div className="mb-1">
                  <span className="text-lg font-semibold text-gray-900">{item.value}</span>
                </div>
                
                <p className="text-xs text-gray-500">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* AI Readiness Summary */}
      {analysisData.aiReadiness && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center space-x-3 mb-4">
            <Search className="w-5 h-5 text-blue-600" />
            <h4 className="text-lg font-semibold text-gray-900">AI Search Optimization Indicators</h4>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {Math.round(analysisData.aiReadiness.aiOverviewOptimization?.score || 0)}%
                </div>
                <div className="text-sm font-medium text-gray-900 mb-1">Trigger Word Coverage</div>
                <div className="text-xs text-gray-600">
                  Words that commonly appear in AI overviews (how to, best, vs, etc.)
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-purple-100">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {analysisData.aiReadiness.isListicle?.isListicle ? 'Yes' : 'No'}
                </div>
                <div className="text-sm font-medium text-gray-900 mb-1">List/Step Format</div>
                <div className="text-xs text-gray-600">
                  Structured as numbered lists or step-by-step guides
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-green-100">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {Math.round(analysisData.aiReadiness.answerDensity || 0)}%
                </div>
                <div className="text-sm font-medium text-gray-900 mb-1">Direct Answers</div>
                <div className="text-xs text-gray-600">
                  Percentage of sentences that provide clear, direct answers
                </div>
              </div>
            </div>
          </div>

          {analysisData.aiReadiness.aiOverviewOptimization?.matchedKeywords?.length > 0 && (
            <div className="mt-6 pt-4 border-t border-blue-200">
              <h5 className="font-medium text-gray-900 mb-3">AI Overview Trigger Words Found:</h5>
              <p className="text-sm text-gray-600 mb-3">
                These words and phrases are commonly found in content that appears in Google AI Overviews:
              </p>
              <div className="flex flex-wrap gap-2">
                {analysisData.aiReadiness.aiOverviewOptimization.matchedKeywords.map((keyword, index) => (
                  <span 
                    key={index} 
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                  >
                    "{keyword}"
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CategoryBreakdown;