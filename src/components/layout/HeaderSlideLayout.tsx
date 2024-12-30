import React from 'react';
import Header from '../Header';
import DailyInspiration from '../inspiration/DailyInspiration';
import { useLayoutStore } from '../../store/layoutStore';
import { isMobile } from 'react-device-detect';
import { Layout } from 'lucide-react';

interface HeaderSlideLayoutProps {
  children: React.ReactNode;
}

export default function HeaderSlideLayout({ children }: HeaderSlideLayoutProps) {
  const { isSidebarLayout, toggleLayout } = useLayoutStore();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {!isMobile && (
        <button
          onClick={toggleLayout}
          className="fixed bottom-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          title="Toggle layout"
        >
          <Layout className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      )}

      <div className={`fixed z-40 ${
        isSidebarLayout 
          ? 'top-0 left-0 h-screen w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col'
          : 'top-0 left-0 right-0'
      }`}>
        {!isSidebarLayout && (
          <div className="bg-white dark:bg-gray-800">
            <DailyInspiration />
          </div>
        )}
        <Header />
        {isSidebarLayout && (
          <div className="px-4 py-2">
            <DailyInspiration />
          </div>
        )}
      </div>

      <main className={`relative ${
        isSidebarLayout 
          ? 'ml-64'
          : 'pt-[140px]'
      }`}>
        {children}
      </main>
    </div>
  );
}