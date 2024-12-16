import React from 'react';
import { AlertCircle, Monitor, Volume2, X } from 'lucide-react';
import '../../styles/animations.css';

interface RecordingInstructionsProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: () => void;
  onDontShowAgain: (value: boolean) => void;
}

export default function RecordingInstructions({ 
  isOpen, 
  onClose, 
  onStart,
  onDontShowAgain 
}: RecordingInstructionsProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed top-4 right-4 z-[9999] w-[300px] bg-blue-600 text-white rounded-lg shadow-xl"
      style={{ 
        animation: 'slideIn 0.3s ease-out',
        marginTop: '80px'
      }}
    >
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Quick Guide</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="bg-red-500 rounded p-3 mb-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-sm">
              We only capture audio - no screen content will be recorded. You may see a "share screen" message, but this is only for audio access.
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-start">
            <Monitor className="w-5 h-5 mt-1 mr-3 flex-shrink-0" />
            <div>
              <p className="font-medium mb-1">1. Select any screen</p>
              <p className="text-sm text-blue-100">Choose any screen in Chrome's dialog - we only use it for audio access</p>
            </div>
          </div>
          
          <div className="mt-2 bg-white/10 rounded-lg p-2">
            <div className="flex items-center border border-white/20 rounded bg-white/5 p-2">
              <div className="w-8 h-8 flex-shrink-0 border-2 border-white/40 rounded mr-3">
                <Monitor className="w-full h-full p-1 text-white/60" />
              </div>
              <span className="text-sm text-white/80">Screen 1</span>
            </div>
          </div>
          
          <div className="flex items-start mt-4">
            <Volume2 className="w-5 h-5 mt-1 mr-3 flex-shrink-0" />
            <div>
              <p className="font-medium mb-1">2. Enable system audio</p>
              <p className="text-sm text-blue-100">Find and enable this toggle in Chrome's dialog:</p>
              <div className="mt-2 bg-white/10 rounded-lg p-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Share system audio</span>
                  <div className="relative inline-flex items-center">
                    <div className="w-9 h-5 bg-gray-400 rounded-full">
                      <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-start">
            <span className="w-5 h-5 mt-1 mr-3 flex-shrink-0 text-center font-bold">3</span>
            <div>
              <p className="font-medium mb-1">Complete setup</p>
              <p className="text-sm text-blue-100">Click the blue "Share" button to begin recording</p>
            </div>
          </div>
        </div>
        
        <label className="flex items-center mt-4 text-sm">
          <input
            type="checkbox"
            onChange={(e) => onDontShowAgain(e.target.checked)}
            className="w-4 h-4 mr-2 rounded border-white bg-transparent checked:bg-white checked:border-transparent focus:ring-white"
          />
          Don't show this guide again
        </label>
      </div>
    </div>
  );
}