import { doc, updateDoc } from 'firebase/firestore';

import { db } from '../lib/firebase';

import { serverFetch, serverPost } from './api';

// import { PublicClientApplication, PopupRequest } from '@azure/msal-browser';

import { useAuthStore } from '../store/authStore';

// import { useMsalStore } from '../store/msalStore';

// const { msalInstance, isInitialized, setMsalInstance, setInitialized } = useMsalStore.getState();



// Google OAuth configuration

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const GOOGLE_REDIRECT_URI = `${window.location.origin}/settings`;

const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/calendar.events';



// Microsoft OAuth configuration

const MS_CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID;

const MS_REDIRECT_URI = import.meta.env.VITE_MICROSOFT_REDIRECT_URI;



const MS_SCOPE = 'Calendars.Read Calendars.ReadWrite Calendars.Read.Shared User.Read offline_access email openid';





export async function handleGoogle() {

  const SCOPES = [

    'https://www.googleapis.com/auth/calendar.events',

    'https://www.googleapis.com/auth/calendar.readonly',

    'https://www.googleapis.com/auth/calendar',

    'https://www.googleapis.com/auth/userinfo.email'

  ].join(' ');



  const redirect_uri = window.location.origin;



  //@ts-ignore

  const client = window.google.accounts.oauth2.initCodeClient({

    client_id: GOOGLE_CLIENT_ID,

    scope: SCOPES,

    access_type: 'offline',

    prompt: 'consent',

    ux_mode: 'popup',

    redirect_uri: redirect_uri,

    callback: async (response: any) => {

      try {

        if (!response.code) {

          return;

        }

        // Send the code to your backend, which will:
        // 1. Exchange the code for tokens
        // 2. Use the access token to fetch user info
        // 3. Return the email along with other necessary data
        const result = await serverPost('/oauth/store-tokens', {

          code: response.code,

          redirect_uri: redirect_uri,

          provider: 'google'

        });

        // The email should now be available in the result from your backend
        console.log('User info from backend:', result);

      } catch (error) {

        console.error('Error handling Google OAuth callback:', error);

      }

    }

  });

  client.requestCode();

}




// Constants and types

// const MSAL_CONFIG = {
//   auth: {
//     clientId: MS_CLIENT_ID,
//     authority: 'https://login.microsoftonline.com/common',
//     redirectUri: MS_REDIRECT_URI,
//   },
//   cache: {
//     cacheLocation: 'sessionStorage'
//   }
// };



// export async function initializeMsal() {

//   if (!isInitialized || !msalInstance) {

//     const instance = new PublicClientApplication(MSAL_CONFIG);

//     await instance.initialize();

//     setMsalInstance(instance);

//     setInitialized(true);

//     return instance;

//   }

//   return msalInstance;

// }



// Handle Microsoft login


export async function handleMicrosoft() {
  try {

    console.log(MS_REDIRECT_URI, MS_CLIENT_ID, "MS_REDIRECT_URI");
      // Get current Firebase user
      const { user } = useAuthStore.getState();
      if (!user?.uid) {
          throw new Error('User not authenticated');
      }

      // Generate state with user ID
      const stateObj = {
          nonce: Math.random().toString(36).substring(7),
          uid: user.uid
      };
      const state = btoa(JSON.stringify(stateObj)); // Encode state object

      // Construct Microsoft OAuth URL
      const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
      const params = {
          client_id: MS_CLIENT_ID,
          response_type: 'code',
          redirect_uri: MS_REDIRECT_URI,
          response_mode: 'query',
          scope: MS_SCOPE,
          state: state
      };

      // Add parameters to URL
      Object.keys(params).forEach(key => 
          authUrl.searchParams.append(key, params[key as keyof typeof params])
      );

      // Redirect to Microsoft login
      window.location.href = authUrl.toString();
  } catch (error) {
      console.error('Microsoft authentication error:', error);
      throw error;
  }
}








// Update getMicrosoftCalendarEvents to ensure MSAL is initialized

export async function getCalendarEvents({ google, microsoft }: { google: boolean, microsoft: boolean }) {

  // Build query parameters based on connected calendars

  const queryParams = new URLSearchParams();

  if (google) {
    queryParams.append('google', 'true');
  }

  if (microsoft) {

    queryParams.append('microsoft', 'true');
  }
  console.log(queryParams.toString(), "queryParams");
  // If only Google is connected or no calendars are connected
  return await serverFetch(`/oauth/get-events?${queryParams.toString()}`);

}



export async function disconnectGoogle(calendarId: string) {

  try {

    await serverPost('/oauth/disconnect/google', { calendarId });

    return true;

  } catch (error) {

    console.error('Error disconnecting Google calendar:', error);

    throw error;

  }

}


export async function disconnectMicrosoft(calendarId: string) {
  try {
    console.log("[disconnectMicrosoft] Starting Microsoft disconnect process");

    await serverPost('/oauth/disconnect/microsoft', { calendarId });

    console.log("[disconnectMicrosoft] Successfully disconnected Microsoft account");
    return true;

  } catch (error) {
    console.error("[disconnectMicrosoft] Error during disconnect:", error);
    throw error;
  }
}