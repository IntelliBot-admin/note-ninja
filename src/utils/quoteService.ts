interface Quote {
  content: string;
  author: string;
  timestamp?: number;
}

const CACHE_KEY = 'daily-quote';
const API_URL = 'https://zenquotes.io/api/random';

const FALLBACK_QUOTE: Quote = {
  content: 'The best way to predict the future is to create it.',
  author: 'Peter Drucker'
};

async function fetchWithTimeout(url: string, timeout = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export async function getQuote(): Promise<Quote> {
  try {
    // First try to get from cache
    const cached = getCachedQuote();
    if (cached && cached.timestamp && (Date.now() - cached.timestamp) < 24 * 60 * 60 * 1000) {
      return cached;
    }

    const response = await fetchWithTimeout(API_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // ZenQuotes API returns an array with one quote
    const quoteData = Array.isArray(data) ? data[0] : data;
    
    if (!quoteData?.q || !quoteData?.a) {
      throw new Error('Invalid quote data received');
    }
    
    const newQuote = {
      content: quoteData.q,
      author: quoteData.a,
      timestamp: Date.now()
    };
    
    // Cache the new quote
    cacheQuote(newQuote);
    return newQuote;
  } catch (error) {
    console.warn('Error fetching quote:', error);
    // Return cached quote if available, otherwise use fallback
    return getCachedQuote() || { ...FALLBACK_QUOTE, timestamp: Date.now() };
  }
}

export function getCachedQuote(): Quote | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Error reading cached quote:', error);
    return null;
  }
}

export function cacheQuote(quote: Quote): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(quote));
  } catch (error) {
    console.error('Error caching quote:', error);
  }
}