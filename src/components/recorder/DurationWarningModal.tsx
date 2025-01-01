import React from 'react';
import { Clock } from 'lucide-react';

interface DurationWarningModalProps {
  countdown: number;
  onKeepRecording: () => void;
  onStopRecording: () => void;
}

export default function DurationWarningModal({ 
  countdown, 
  onKeepRecording,
  onStopRecording 
}: DurationWarningModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center space-x-3 text-yellow-600 mb-4">
          <Clock className="w-6 h-6" />
          <h3 className="text-lg font-medium">Recording Duration Warning</h3>
        </div>
        <p className="text-gray-600 mb-4">
          This recording has been running for 75 minutes. It will automatically stop in {countdown} seconds unless you choose to continue.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onStopRecording}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Stop Recording
          </button>
          <button
            onClick={onKeepRecording}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Continue Recording
          </button>
        </div>
      </div>
    </div>
  );
}