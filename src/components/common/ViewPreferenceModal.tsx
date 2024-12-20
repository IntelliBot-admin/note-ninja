import React from 'react';
import { Calendar, Grid, List } from 'lucide-react';

interface ViewPreferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  viewMode: 'grid' | 'list' | 'calendar';
}

export default function ViewPreferenceModal({ isOpen, onClose, onConfirm, viewMode }: ViewPreferenceModalProps) {
  if (!isOpen) return null;

  const getViewIcon = () => {
    switch (viewMode) {
      case 'calendar':
        return <Calendar className="w-6 h-6 text-indigo-600" />;
      case 'grid':
        return <Grid className="w-6 h-6 text-indigo-600" />;
      case 'list':
        return <List className="w-6 h-6 text-indigo-600" />;
    }
  };

  const getViewName = () => {
    switch (viewMode) {
      case 'calendar':
        return 'Calendar';
      case 'grid':
        return 'Grid';
      case 'list':
        return 'List';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full mx-4 p-6">
        <div className="flex items-center space-x-3 mb-4">
          {getViewIcon()}
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Set Default View
          </h3>
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Would you like to make {getViewName()} view your default view? This will be remembered across sessions.
        </p>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
          >
            Set as Default
          </button>
        </div>
      </div>
    </div>
  );
}