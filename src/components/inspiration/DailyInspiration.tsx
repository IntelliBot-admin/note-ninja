import React, { useState, useEffect } from 'react';
import { useQuote } from './useQuote';
import { Loader2 } from 'lucide-react';
import { useQuoteStore } from '../../hooks/useQuoteVisibility';

export default function DailyInspiration() {
  const { quote, error, isLoading } = useQuote();
  const { isQuoteVisible } = useQuoteStore();

  if (error) {
    console.error('Daily inspiration error:', error);
  }

  if (!isQuoteVisible) return null;

  return (
    <div className="w-full bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-gray-700/50 dark:to-gray-600/50 transition-all duration-500 rounded-lg">
      <div className="px-3 py-2.5 text-center relative">
        {isLoading ? (
          <div className="flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : quote ? (
          <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">
            <span className="text-indigo-600">"</span>{quote.content}<span className="text-indigo-600">"</span>
            <span className="text-gray-500 dark:text-gray-400 ml-2 font-normal">— {quote.author}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}