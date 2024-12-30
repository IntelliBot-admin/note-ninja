import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isMobile } from 'react-device-detect';

interface LayoutState {
  isSidebarLayout: boolean;
  toggleLayout: () => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      isSidebarLayout: isMobile ? false : false, // Force false on mobile
      toggleLayout: () => set((state) => ({ isSidebarLayout: !state.isSidebarLayout })),
    }),
    {
      name: 'layout-storage',
      partialize: (state) => ({
        // Only persist layout preference on non-mobile devices
        isSidebarLayout: isMobile ? false : state.isSidebarLayout
      }),
    }
  )
);