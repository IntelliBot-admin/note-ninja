import { getAuth } from 'firebase/auth';

interface FetchOptions extends RequestInit {
  requiresAuth?: boolean;
}

export async function apiFetch(
  endpoint: string, 
  options: FetchOptions = {}
) {
  try {
    const { requiresAuth = true, ...fetchOptions } = options;
    
    const headers = new Headers(options.headers);

    if (requiresAuth) {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      
      if (!idToken) {
        throw new Error('User not authenticated');
      }
      
      headers.set('Authorization', `Bearer ${idToken}`);
    }

    const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
      ...fetchOptions,
      headers
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}