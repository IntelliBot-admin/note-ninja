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
      headers.set('Content-Type', 'application/json');
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

export async function apiPost(
  endpoint: string, 
  data: any, 
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
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(data),
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

