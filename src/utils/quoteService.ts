interface Quote {
  content: string;
  author: string;
}

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
    const response = await fetchWithTimeout(`${import.meta.env.VITE_SERVER_URL}/api/v1/get-random-quote`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const quoteData = Array.isArray(data) ? data[0] : data;
    
    if (!quoteData?.quote || !quoteData?.author) {
      throw new Error('Invalid quote data received');
    }
    
    return {
      content: quoteData.quote,
      author: quoteData.author
    };
  } catch (error) {
    console.warn('Error fetching quote:', error);
    return FALLBACK_QUOTE;
  }
}