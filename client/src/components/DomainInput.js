import React, { useState } from 'react';
import { Search, Globe, Zap, CheckCircle } from 'lucide-react';
import axios from 'axios';

function DomainInput({ onStartAnalysis, onAnalysisComplete, onError }) {
  const [domain, setDomain] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateDomain = (domain) => {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
    return domainRegex.test(domain);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    if (!validateDomain(cleanDomain)) {
      onError('Please enter a valid domain (e.g., example.com)');
      return;
    }

    setIsSubmitting(true);
    onStartAnalysis();

    try {
      const response = await axios.post('/api/crawler/analyze', {
        domain: cleanDomain,
        forceRefresh: false
      });

      onAnalysisComplete(response.data.result);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to analyze domain. Please try again.';
      onError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    {
      icon: <Globe className="w-5 h-5 text-blue-600" />,
      title: "AI Search Optimization",
      description: "Analyze your content for Google AI Overviews and AI search engines"
    },
    {
      icon: <Zap className="w-5 h-5 text-green-600" />,
      title: "Real-time Analysis",
      description: "Get instant feedback on content quality, E-A-T signals, and technical SEO"
    },
    {
      icon: <CheckCircle className="w-5 h-5 text-purple-600" />,
      title: "Actionable Recommendations",
      description: "Receive specific improvements with code examples and implementation guides"
    }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Is Your Website 
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> AI Search Ready?</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Analyze your website's optimization for AI search engines like Google AI Overviews. 
          Get actionable recommendations to improve your AI search visibility.
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-white rounded-2xl shadow-soft-xl p-8 mb-12">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-2">
              Enter your domain to analyze
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Globe className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
                className="block w-full pl-10 pr-3 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                required
                disabled={isSubmitting}
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Enter just the domain name without http:// or https://
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !domain.trim()}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-4 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <Search className="w-5 h-5" />
            <span>{isSubmitting ? 'Analyzing...' : 'Analyze AI Search Readiness'}</span>
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            This tool crawls respectfully and honors robots.txt files
          </p>
        </div>
      </div>

      {/* Features Section */}
      <div className="grid md:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-soft border border-gray-100">
            <div className="flex items-center space-x-3 mb-3">
              {feature.icon}
              <h3 className="font-semibold text-gray-900">{feature.title}</h3>
            </div>
            <p className="text-gray-600 text-sm">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* What We Analyze Section */}
      <div className="mt-16 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">What We Analyze</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
              Content Quality & Structure
            </h3>
            <ul className="text-sm text-gray-600 space-y-1 ml-5">
              <li>• Direct answer optimization</li>
              <li>• Content format (listicles, guides, comparisons)</li>
              <li>• Question-answer pairs and FAQ sections</li>
              <li>• Heading hierarchy and readability</li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
              E-A-T Signals
            </h3>
            <ul className="text-sm text-gray-600 space-y-1 ml-5">
              <li>• Author information and credentials</li>
              <li>• Content freshness and updates</li>
              <li>• External citations and references</li>
              <li>• Trust and authority indicators</li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
              Technical SEO
            </h3>
            <ul className="text-sm text-gray-600 space-y-1 ml-5">
              <li>• Mobile optimization and viewport</li>
              <li>• Page speed and Core Web Vitals</li>
              <li>• HTTPS and security measures</li>
              <li>• Meta tags and image optimization</li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
              Structured Data
            </h3>
            <ul className="text-sm text-gray-600 space-y-1 ml-5">
              <li>• FAQ and HowTo schema markup</li>
              <li>• Article and breadcrumb schemas</li>
              <li>• Schema diversity and implementation</li>
              <li>• Rich snippet optimization</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DomainInput;