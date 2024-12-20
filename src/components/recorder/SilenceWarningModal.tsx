import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface SilenceWarningModalProps {
  countdown: number;
  onKeepRecording: () => void;
}

export default function SilenceWarningModal({ countdown, onKeepRecording }: SilenceWarningModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center space-x-3 text-yellow-600 mb-4">
          <AlertTriangle className="w-6 h-6" />
          <h3 className="text-lg font-medium">No Audio Detected</h3>
        </div>
        <p className="text-gray-600 mb-4">
          No audio has been detected for 60 seconds. Recording will automatically stop in {countdown} seconds unless you choose to continue.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onKeepRecording}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Keep Recording
          </button>
        </div>
      </div>
    </div>
  );
}