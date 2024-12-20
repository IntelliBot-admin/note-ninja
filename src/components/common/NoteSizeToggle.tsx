import React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';

export default function NoteSizeToggle() {
  const { noteSize, setNoteSize } = useUIStore();

  return (
    <button
      onClick={() => setNoteSize(noteSize === 'normal' ? 'compact' : 'normal')}
      className="inline-flex items-center px-2 py-1 text-sm text-gray-600 hover:text-indigo-600 transition-colors"
      title={noteSize === 'normal' ? 'Switch to compact view' : 'Switch to normal view'}
    >
      {noteSize === 'normal' ? (
        <Minimize2 className="w-4 h-4" />
      ) : (
        <Maximize2 className="w-4 h-4" />
      )}
    </button>
  );
}