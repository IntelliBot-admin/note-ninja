import { useState, useEffect } from 'react';
import { getQuote } from '../../utils/quoteService';

export function useQuote() {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchQuote() {
      setIsLoading(true);
      try {
        const newQuote = await getQuote();
        setQuote(newQuote);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch quote:', err);
        setError('Failed to fetch daily inspiration');
      } finally {
        setIsLoading(false);
      }
    }

    // Fetch quote immediately
    fetchQuote();

    // Set up timer for next day
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    const timer = setTimeout(fetchQuote, timeUntilMidnight);

    return () => clearTimeout(timer);
  }, []);

  return { quote, error, isLoading };
}