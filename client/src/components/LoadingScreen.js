import React, { useState, useEffect } from 'react';
import { Search, Globe, Zap, CheckCircle, Clock } from 'lucide-react';

function LoadingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const steps = [
    { 
      icon: <Globe className="w-5 h-5" />, 
      title: "Checking robots.txt", 
      description: "Ensuring ethical crawling practices",
      duration: 2000
    },
    { 
      icon: <Search className="w-5 h-5" />, 
      title: "Crawling website", 
      description: "Analyzing page structure and content",
      duration: 4000
    },
    { 
      icon: <Zap className="w-5 h-5" />, 
      title: "AI analysis", 
      description: "Evaluating AI search readiness factors",
      duration: 3000
    },
    { 
      icon: <CheckCircle className="w-5 h-5" />, 
      title: "Generating recommendations", 
      description: "Creating actionable improvement suggestions",
      duration: 2000
    }
  ];

  useEffect(() => {
    const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += 100;
      const newProgress = Math.min((elapsed / totalDuration) * 100, 100);
      setProgress(newProgress);

      // Update current step based on elapsed time
      let stepElapsed = 0;
      for (let i = 0; i < steps.length; i++) {
        if (elapsed <= stepElapsed + steps[i].duration) {
          setCurrentStep(i);
          break;
        }
        stepElapsed += steps[i].duration;
      }

      if (elapsed >= totalDuration) {
        clearInterval(timer);
      }
    }, 100);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-soft-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-blue-600 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyzing Your Website</h2>
          <p className="text-gray-600">We're evaluating your AI search readiness across multiple dimensions</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex items-center space-x-4 p-4 rounded-lg transition-all duration-300 ${
                index === currentStep
                  ? 'bg-blue-50 border-2 border-blue-200'
                  : index < currentStep
                  ? 'bg-green-50 border-2 border-green-200'
                  : 'bg-gray-50 border-2 border-gray-200'
              }`}
            >
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  index === currentStep
                    ? 'bg-blue-500 text-white animate-pulse'
                    : index < currentStep
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-300 text-gray-500'
                }`}
              >
                {index < currentStep ? (
                  <CheckCircle className="w-5 h-5" />
                ) : index === currentStep ? (
                  <Clock className="w-5 h-5 animate-spin" />
                ) : (
                  step.icon
                )}
              </div>
              
              <div className="flex-grow">
                <h3
                  className={`font-medium ${
                    index === currentStep
                      ? 'text-blue-900'
                      : index < currentStep
                      ? 'text-green-900'
                      : 'text-gray-700'
                  }`}
                >
                  {step.title}
                </h3>
                <p
                  className={`text-sm ${
                    index === currentStep
                      ? 'text-blue-600'
                      : index < currentStep
                      ? 'text-green-600'
                      : 'text-gray-500'
                  }`}
                >
                  {step.description}
                </p>
              </div>

              {index === currentStep && (
                <div className="flex-shrink-0">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </div>
              )}

              {index < currentStep && (
                <div className="flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Analysis Info */}
        <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            </div>
            <div className="text-sm">
              <p className="text-gray-700 font-medium mb-1">What we're analyzing:</p>
              <p className="text-gray-600">
                Content quality, E-A-T signals, technical SEO, structured data, and AI search optimization factors 
                to provide you with a comprehensive readiness score and actionable recommendations.
              </p>
            </div>
          </div>
        </div>

        {/* Estimated Time */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            <Clock className="w-4 h-4 inline mr-1" />
            Estimated time: 10-15 seconds
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;