import React from 'react';
import { LayoutGrid, List } from 'lucide-react';

interface ViewToggleProps {
  view: 'calendar' | 'timeline';
  onViewChange: (view: 'calendar' | 'timeline') => void;
}

export default function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
      <button
        onClick={() => onViewChange('calendar')}
        className={`inline-flex items-center px-3 py-1.5 rounded-md ${
          view === 'calendar'
            ? 'bg-indigo-100 text-indigo-600'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <LayoutGrid className="w-4 h-4 mr-2" />
        Calendar
      </button>
      <button
        onClick={() => onViewChange('timeline')}
        className={`inline-flex items-center px-3 py-1.5 rounded-md ${
          view === 'timeline'
            ? 'bg-indigo-100 text-indigo-600'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <List className="w-4 h-4 mr-2" />
        Timeline
      </button>
    </div>
  );
}