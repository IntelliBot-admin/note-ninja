import { doc, updateDoc } from 'firebase/firestore';

import { db } from '../lib/firebase';

import { serverFetch, serverPost } from './api';

import { PublicClientApplication, PopupRequest } from '@azure/msal-browser';

import { useAuthStore } from '../store/authStore';

import { useMsalStore } from '../store/msalStore';

const { msalInstance, isInitialized, setMsalInstance, setInitialized } = useMsalStore.getState();



// Google OAuth configuration

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const GOOGLE_REDIRECT_URI = `${window.location.origin}/settings`;

const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/calendar.events';



// Microsoft OAuth configuration

const MS_CLIENT_ID = import.meta.env.VITE_MICROSOFT_CLIENT_ID;

const MS_TENANT_ID = 'b966668f-3fe1-4cb2-93ee-0b76ac8c9bf8';

const MS_REDIRECT_URI = `${window.location.origin}/settings`;

const MS_SCOPE = 'Calendars.Read Calendars.ReadWrite Calendars.Read.Shared User.Read offline_access';





export async function handleGoogle() {

  const SCOPES = [

    'https://www.googleapis.com/auth/calendar.events',

    'https://www.googleapis.com/auth/calendar.readonly',

    'https://www.googleapis.com/auth/calendar'

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

        await serverPost('/store-refresh-token', {

          code: response.code,

          redirect_uri: redirect_uri,

          provider: 'google'

        });

      } catch (error) {

        console.error('Error handling Google OAuth callback:', error);

      }

    }

  });

  client.requestCode();

}




// Constants and types

const MSAL_CONFIG = {

  auth: {

    clientId: MS_CLIENT_ID,

    authority: `https://login.microsoftonline.com/${MS_TENANT_ID}`,

    redirectUri: MS_REDIRECT_URI,

  },

  cache: {

    cacheLocation: 'localStorage', // Changed from sessionStorage to localStorage

    storeAuthStateInCookie: true // Enable cookies for better persistence

  }

};



export async function initializeMsal() {



  if (!isInitialized) {

    const instance = new PublicClientApplication(MSAL_CONFIG);

    await instance.initialize();

    setMsalInstance(instance);

    setInitialized(true);

    return instance;

  }



  return msalInstance;

}



// Handle Microsoft login

export async function handleMicrosoft() {

  try {

    console.log("[handleMicrosoft] Starting Microsoft authentication flow");

    // Ensure MSAL is initialized before using it

    if (!msalInstance) {

      console.log("[handleMicrosoft] No MSAL instance found, initializing...");

      await initializeMsal();

    }



    const loginRequest: PopupRequest = {

      scopes: MS_SCOPE.split(' '),

      prompt: 'select_account'

    };

    console.log("[handleMicrosoft] Login request configured:", loginRequest);



    // Check for existing accounts

    const accounts = msalInstance!.getAllAccounts();

    console.log("[handleMicrosoft] Found existing accounts:", accounts.length);

    if (accounts.length > 0) {

      try {

        console.log("[handleMicrosoft] Attempting silent token acquisition");

        const silentRequest = {

          scopes: MS_SCOPE.split(' '),

          account: accounts[0]

        };

        const silentResponse = await msalInstance!.acquireTokenSilent(silentRequest);



        const { user } = useAuthStore.getState();

        if (user?.uid) {

          console.log("[handleMicrosoft] Updating user's Microsoft connection status");

          const userRef = doc(db, 'users', user.uid);

          await updateDoc(userRef, {

            isMicrosoftConnected: true

          });

          console.log("[handleMicrosoft] User's Microsoft connection status updated successfully");

        }

        console.log("[handleMicrosoft] Silent token acquisition successful");

        return silentResponse;

      } catch (silentError) {

        console.warn("[handleMicrosoft] Silent token acquisition failed:", silentError);

      }

    }



    // If no account or silent acquisition failed, do popup login

    console.log("[handleMicrosoft] Initiating popup login");

    const response = await msalInstance!.loginPopup(loginRequest);

    console.log("[handleMicrosoft] Popup login successful, access token received:", !!response.accessToken);

    if (response.accessToken) {

      const { user } = useAuthStore.getState();

      if (user?.uid) {

        console.log("[handleMicrosoft] Updating user's Microsoft connection status");

        const userRef = doc(db, 'users', user.uid);

        await updateDoc(userRef, {

          isMicrosoftConnected: true

        });

        console.log("[handleMicrosoft] User's Microsoft connection status updated successfully");

      }

    }

    return response;

  } catch (error) {

    console.error("[handleMicrosoft] Authentication error:", error);

    throw error;

  }

}



// Get access token (use this before making API calls)

export async function getMicrosoftAccessToken() {

  if (!msalInstance) {

    await initializeMsal();

  }

  const accounts = msalInstance!.getAllAccounts();



  if (accounts.length === 0) {

    // No user signed in, need to login

    return handleMicrosoft();

  }



  try {

    const silentRequest = {

      scopes: MS_SCOPE.split(' '),

      account: accounts[0]

    };

    const response = await msalInstance!.acquireTokenSilent(silentRequest);

    return response.accessToken;

  } catch (error) {

    console.error('Error getting access token:', error);

    // If silent token acquisition fails, fall back to interactive login

    return handleMicrosoft();

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

    const microsoftAccessToken = await getMicrosoftAccessToken();

    console.log(queryParams.toString(), "queryParams");



    return await serverFetch(`/get-events?${queryParams.toString()}`, {

      customHeaders: {

        'X-Microsoft-Token': `Bearer ${microsoftAccessToken}`

      }

    });

  }

  console.log(queryParams.toString(), "queryParams");



  // If only Google is connected or no calendars are connected

  return await serverFetch(`/get-events?${queryParams.toString()}`);

}



export async function disconnectGoogle() {

  try {

    // Update local state if needed

    // Update user's Microsoft connection status in Firestore

    const { user } = useAuthStore.getState();

    if (user?.uid) {

      const userRef = doc(db, 'users', user.uid);

      await updateDoc(userRef, {

        isGoogleConnected: false,

        googleRefreshToken: null

      });

    }

    return true;

  } catch (error) {

    console.error('Error disconnecting Google calendar:', error);

    throw error;

  }

}



export async function disconnectMicrosoft() {

  try {

    console.log("[disconnectMicrosoft] Starting Microsoft disconnect process");



    if (!msalInstance) {

      console.log("[disconnectMicrosoft] No MSAL instance found, initializing...");

      await initializeMsal();

    }



    // Sign out from MSAL

    const accounts = msalInstance?.getAllAccounts() || [];

    console.log("[disconnectMicrosoft] Found accounts to disconnect:", accounts.length);



    if (accounts.length > 0) {

      console.log("[disconnectMicrosoft] Initiating logout popup");

      await msalInstance?.logoutPopup({

        account: accounts[0],

        postLogoutRedirectUri: window.location.origin

      });

      console.log("[disconnectMicrosoft] Logout popup completed successfully");

    }



    // Update user's Microsoft connection status in Firestore

    const { user } = useAuthStore.getState();

    if (user?.uid) {
      console.log("[disconnectMicrosoft] Updating user's connection status in Firestore");
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        isMicrosoftConnected: false
      });
      console.log("[disconnectMicrosoft] User's connection status updated successfully");
    }
    return true;

  } catch (error) {
    console.error("[disconnectMicrosoft] Error during disconnect:", error);
    throw error;
  }

}