import React, { useState } from 'react';
import DomainInput from './components/DomainInput';
import LoadingScreen from './components/LoadingScreen';
import ResultsDashboard from './components/ResultsDashboard';
import Header from './components/Header';
import Footer from './components/Footer';

function App() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);

  const handleAnalysis = (result) => {
    setAnalysisResult(result);
    setIsAnalyzing(false);
    setError(null);
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
    setIsAnalyzing(false);
    setAnalysisResult(null);
  };

  const handleStartAnalysis = () => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);
  };

  const handleReset = () => {
    setIsAnalyzing(false);
    setAnalysisResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {!isAnalyzing && !analysisResult && !error && (
          <DomainInput
            onStartAnalysis={handleStartAnalysis}
            onAnalysisComplete={handleAnalysis}
            onError={handleError}
          />
        )}

        {isAnalyzing && <LoadingScreen />}

        {analysisResult && (
          <ResultsDashboard
            result={analysisResult}
            onReset={handleReset}
          />
        )}

        {error && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-red-800">Analysis Failed</h3>
                  <p className="text-red-700 mt-1">{error}</p>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleReset}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;