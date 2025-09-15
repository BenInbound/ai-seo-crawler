import React from 'react';

function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-8">
            <div className="text-gray-600">
              <p className="font-medium">AI Search Readiness Analysis</p>
              <p className="text-sm">Optimize for Google AI Overviews & AI Search Engines</p>
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Respectful Crawling</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>AI-Powered Analysis</span>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-gray-500 text-sm">
              Built with modern web technologies for analyzing AI search readiness.
              This tool respects robots.txt and implements ethical crawling practices.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;