import React, { useState } from 'react';
import { Sparkles, Minimize2 } from 'lucide-react';

export default function ChatInterface() {
  const [isMinimized, setIsMinimized] = useState(true);

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-colors group"
        title="AI Meeting Assistant"
      >
        <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-t-lg">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5" />
          <h3 className="text-lg font-semibold">AI Meeting Assistant</h3>
        </div>
        <button
          onClick={() => setIsMinimized(true)}
          className="p-1 text-white/80 hover:text-white rounded-full hover:bg-white/10"
          title="Minimize"
        >
          <Minimize2 className="w-5 h-5" />
        </button>
      </div>

      <div className="p-8 text-center">
        <Sparkles className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
        <h4 className="text-lg font-semibold text-gray-900 mb-2">Coming Soon!</h4>
        <p className="text-gray-600">
          Our AI Meeting Assistant is currently under development. Stay tuned for intelligent meeting insights and natural language interactions.
        </p>
      </div>
    </div>
  );
}