import { getAuth } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CalendarProvider } from '../types/calendar';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_REDIRECT_URI = `${window.location.origin}/settings`;
const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

// Microsoft OAuth configuration
const MS_CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
const MS_TENANT_ID = 'b966668f-3fe1-4cb2-93ee-0b76ac8c9bf8';
const MS_REDIRECT_URI = `${window.location.origin}/settings`;
const MS_SCOPE = 'Calendars.Read Calendars.ReadWrite Calendars.Read.Shared User.Read offline_access';

export async function initGoogleAuth() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  // console.log('Starting OAuth callback with code:', code, 'provider:', provider);

  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${GOOGLE_REDIRECT_URI}&response_type=code&scope=${GOOGLE_SCOPE}&access_type=offline&prompt=consent&state=google`;
  
  window.location.href = url;
}

export async function initMicrosoftAuth() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  
  console.log('Initiating Microsoft auth flow...');

  const url = `https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/authorize?client_id=${MS_CLIENT_ID}&redirect_uri=${encodeURIComponent(MS_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(MS_SCOPE)}&prompt=consent&state=microsoft`;
  
  window.location.href = url;
}

export async function handleOAuthCallback(code: string, provider: 'google' | 'microsoft') {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  
  console.log('Handling OAuth callback for provider:', provider);

  // Exchange code for tokens using your backend
  const response = await fetch(`${import.meta.env.VITE_API_URL}/calendar/oauth/callback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await user.getIdToken()}`
    },
    body: JSON.stringify({ code, provider })
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = await response.text();
    }
    console.error('OAuth callback error:', errorData);
    throw new Error('Failed to exchange auth code');
  }

  const data = await response.json();
  console.log('OAuth callback successful, storing provider data...');
  
  // Ensure we have the required data
  if (!data.access_token || !data.refresh_token || !data.expires_in) {
    console.error('Missing required token data:', data);
    throw new Error('Incomplete token data received');
  }

  console.log('Creating Firestore document for calendar provider:', provider);
  // Store calendar provider in Firestore
  const providerDoc = doc(db, 'users', user.uid, 'calendarProviders', provider);
  const providerData = {
    type: provider,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
    email: data.email,
    name: data.name || data.email
  };
  
  await setDoc(providerDoc, providerData);
  console.log('Successfully stored calendar provider data');

  return data;
}

export async function getConnectedCalendars(userId: string): Promise<CalendarProvider[]> {
  try {
    console.log('Fetching connected calendars for user:', userId);

    const microsoftDoc = await getDoc(doc(db, 'users', userId, 'calendarProviders', 'microsoft'));
    const googleDoc = await getDoc(doc(db, 'users', userId, 'calendarProviders', 'google'));
  
    const calendars: CalendarProvider[] = [];
  
    if (microsoftDoc.exists()) {
      console.log('Found Microsoft calendar data:', microsoftDoc.data());
      const msData = microsoftDoc.data();
      // Check if the token is still valid
      if (msData.expiresAt > Date.now()) {
        calendars.push({ id: 'microsoft', ...msData } as CalendarProvider);
      } else {
        console.log('Microsoft token expired');
      }
    }
  
    if (googleDoc.exists()) {
      console.log('Found Google calendar data:', googleDoc.data());
      const googleData = googleDoc.data();
      if (googleData.expiresAt > Date.now()) {
        calendars.push({ id: 'google', ...googleData } as CalendarProvider);
      } else {
        console.log('Google token expired');
      }
    }

    console.log('Returning connected calendars:', calendars);
    return calendars;
  } catch (error) {
    console.error('Error getting connected calendars:', error);
    throw error;
  }
}

export async function fetchCalendarEvents(userId: string): Promise<any[]> {
  try {
    console.log('Fetching calendar events for user:', userId);
    const token = await getAuth().currentUser?.getIdToken();
    
    if (!token) {
      throw new Error('No authentication token available');
    }

    const response = await fetch(`${import.meta.env.VITE_API_URL}/calendar/events`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Calendar events fetch failed:', errorText);
      throw new Error(`Failed to fetch calendar events: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Calendar events fetched successfully:', data.events?.length || 0, 'events');
    return data.events;
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
}