import React from 'react';
import Header from '../Header';

interface HeaderSlideLayoutProps {
  children: React.ReactNode;
}

export default function HeaderSlideLayout({ children }: HeaderSlideLayoutProps) {

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-16" />
      
      <div className="fixed top-0 left-0 right-0 z-50">
        <Header />
      </div>

      <main className="relative">
        {children}
      </main>
    </div>
  );
}