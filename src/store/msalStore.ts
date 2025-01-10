import { create } from 'zustand';
import { PublicClientApplication } from '@azure/msal-browser';

interface MSALState {
  msalInstance: PublicClientApplication | null;
  isInitialized: boolean;
  setMsalInstance: (instance: PublicClientApplication) => void;
  setInitialized: (initialized: boolean) => void;
}

export const useMsalStore = create<MSALState>((set) => ({
  msalInstance: null,
  isInitialized: false,
  setMsalInstance: (instance) => set({ msalInstance: instance }),
  setInitialized: (initialized) => set({ isInitialized: initialized })
}));