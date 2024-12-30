import { useState, useEffect } from 'react';
import { getQuote, getCachedQuote, cacheQuote } from '../../utils/quoteService';

export function useQuote() {
  const [quote, setQuote] = useState(() => getCachedQuote());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchQuote() {
      setIsLoading(true);
      try {
        const newQuote = await getQuote();
        setQuote(newQuote);
        cacheQuote(newQuote);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch quote:', err);
        setError('Failed to fetch daily inspiration');
        // Keep using cached quote if available
      } finally {
        setIsLoading(false);
      }
    }

    const cached = getCachedQuote();
    if (!cached || cached.timestamp < new Date().setHours(0, 0, 0, 0)) {
      fetchQuote();
    }

    // Set up timer for next day's quote
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();

    const timer = setTimeout(() => {
      fetchQuote();
    }, timeUntilMidnight);

    return () => clearTimeout(timer);
  }, []);

  return { quote, error, isLoading };
}