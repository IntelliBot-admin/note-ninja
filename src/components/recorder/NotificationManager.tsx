import React from 'react';
import { Transition } from '@headlessui/react';
import { CheckCircle, Loader2 } from 'lucide-react';

interface NotificationProps {
  show: boolean;
  status: 'recording' | 'processing' | 'transcribing' | 'completed' | 'error';
  message?: string;
}

export default function NotificationManager({ show, status, message }: NotificationProps) {
  const getStatusContent = () => {
    switch (status) {
      case 'recording':
        return (
          <>
            <div className="animate-pulse h-2 w-2 rounded-full bg-red-500 mr-2" />
            <span>Recording in progress...</span>
          </>
        );
      case 'processing':
        return (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span>Processing audio...</span>
          </>
        );
      case 'transcribing':
        return (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span>Generating transcript...</span>
          </>
        );
      case 'completed':
        return (
          <>
            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
            <span>Recording processed successfully</span>
          </>
        );
      case 'error':
        return (
          <span className="text-red-500">
            {message || 'An error occurred'}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <Transition
      show={show}
      enter="transition-opacity duration-300"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="transition-opacity duration-300"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        <div className="flex items-center justify-center space-x-2">
          {getStatusContent()}
        </div>
      </div>
    </Transition>
  );
}