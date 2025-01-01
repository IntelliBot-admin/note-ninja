import React from 'react';
import { Mic, MicOff } from 'lucide-react';

interface RecordButtonProps {
  isRecording: boolean;
  onClick: () => void;
  isLoading?: boolean;
}

export function RecordButton({ isRecording, onClick, isLoading = false }: RecordButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`
        w-12 h-12 rounded-full flex items-center justify-center transition-all
        ${isLoading ? 'opacity-50 cursor-wait' : ''}
        ${isRecording 
          ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
          : 'bg-indigo-600 hover:bg-indigo-700'
        }
      `}
      title={
        isLoading 
          ? 'Initializing...' 
          : isRecording 
            ? 'Stop recording' 
            : 'Start recording'
      }
    >
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : isRecording ? (
        <MicOff className="w-5 h-5 text-white" />
      ) : (
        <Mic className="w-5 h-5 text-white" />
      )}
    </button>
  );
}