const API_KEY = 'AIzaSyCt8eAZdWHfXGGfUywut2bkpSOWCE30_qs';
const API_URL = 'https://translation.googleapis.com/language/translate/v2';

export async function translateText(text: string, targetLanguage: string): Promise<string> {
  try {
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        target: targetLanguage,
        source: 'en',
        format: 'text'
      })
    });

    if (!response.ok) {
      throw new Error(`Translation failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.data?.translations?.[0]?.translatedText) {
      throw new Error('No translation received');
    }

    return data.data.translations[0].translatedText;
  } catch (error) {
    console.error('Translation error:', error);
    throw new Error('Failed to translate text');
  }
}

export const SUPPORTED_LANGUAGES = {
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese (Simplified)',
  ru: 'Russian',
  pt: 'Portuguese',
  ar: 'Arabic'
};