import React from 'react';
import { Search, Zap } from 'lucide-react';

function Header() {
  return (
    <header className="bg-white shadow-soft border-b border-gray-100">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Search className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Search Crawler</h1>
              <p className="text-gray-600 text-sm">Optimize your website for AI search engines</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-full">
            <Zap className="w-4 h-4 text-blue-600" />
            <span className="text-blue-700 font-medium text-sm">AI Overview Ready</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;