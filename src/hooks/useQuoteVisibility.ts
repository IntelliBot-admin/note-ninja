import { useState, useCallback, useEffect } from 'react';
import { create } from 'zustand';

const STORAGE_KEY = 'hideInspiration';

interface QuoteVisibilityStore {
  isQuoteVisible: boolean;
  setQuoteVisible: (visible: boolean) => void;
  toggleQuoteVisibility: () => void;
}

export const useQuoteStore = create<QuoteVisibilityStore>((set) => ({
  isQuoteVisible: (() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === null ? true : stored === 'true';
    } catch (error) {
      console.error('Error reading quote visibility from localStorage:', error);
      return true;
    }
  })(),
  setQuoteVisible: (visible) => {
    try {
      localStorage.setItem(STORAGE_KEY, visible ? 'true' : 'false');
      set({ isQuoteVisible: visible });
    } catch (error) {
      console.error('Error saving quote visibility:', error);
    }
  },
  toggleQuoteVisibility: () => {
    set((state) => {
      const newValue = !state.isQuoteVisible;
      try {
        localStorage.setItem(STORAGE_KEY, newValue ? 'true' : 'false');
      } catch (error) {
        console.error('Error saving quote visibility:', error);
      }
      return { isQuoteVisible: newValue };
    });
  }
}));

export function useQuoteVisibility() {
  return useQuoteStore();
}