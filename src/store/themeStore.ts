import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
      toggleDarkMode: () => set((state) => {
        const newDarkMode = !state.isDarkMode;
        if (newDarkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        return { isDarkMode: newDarkMode };
      }),
    }),
    {
      name: 'theme-storage',
    }
  )
);

// Initialize theme on load
if (typeof window !== 'undefined') {
  const isDark = useThemeStore.getState().isDarkMode;
  if (isDark) {
    document.documentElement.classList.add('dark');
  }
}