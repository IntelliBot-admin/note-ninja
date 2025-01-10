import { getAuth } from 'firebase/auth';

interface FetchOptions extends RequestInit {
  requiresAuth?: boolean;
  customHeaders?: Record<string, string>;
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

export async function serverFetch(
  endpoint: string, 
  options: FetchOptions = {}
) {
  try {
    const { requiresAuth = true, customHeaders = {}, ...fetchOptions } = options;
    
    const headers = new Headers(options.headers);

    // Set custom headers first
    Object.entries(customHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });

    // Set default headers
    headers.set('Content-Type', 'application/json');

    // Add auth header if required
    if (requiresAuth) {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      
      if (!idToken) {
        throw new Error('User not authenticated');
      }
      
      headers.set('Authorization', `Bearer ${idToken}`);
    }

    const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/v1${endpoint}`, {
      ...fetchOptions,
      headers
    });

    if (!response.ok) {
      throw new Error(`Server request failed: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Server request error:', error);
    throw error;
  }
}

export async function serverPost(
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

    const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/v1${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(data),
      ...fetchOptions,
      headers
    });

    if (!response.ok) {
      throw new Error(`Server request failed: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Server request error:', error);
    throw error;
  }
}

