import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';

export default function DarkModeToggle() {
  const { isDarkMode, toggleDarkMode } = useThemeStore();

  return (
    <button
      onClick={toggleDarkMode}
      className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDarkMode ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
}