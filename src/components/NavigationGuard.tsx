import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRecordingStore } from '../store/recordingStore';
import toast from 'react-hot-toast';

interface NavigationGuardProps {
  children: React.ReactNode;
}

export default function NavigationGuard({ children }: NavigationGuardProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isRecording } = useRecordingStore();
  const lastLocationRef = React.useRef(location);

  useEffect(() => {
    // If recording is active and location has changed
    if (isRecording && location !== lastLocationRef.current) {
      // Prevent navigation by going back to the previous location
      navigate(lastLocationRef.current, { replace: true });
      toast.error('Please stop recording before navigating away');
    } else {
      // Update the last known location
      lastLocationRef.current = location;
    }
  }, [location, isRecording, navigate]);

  // Block browser back/forward navigation during recording
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRecording) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRecording]);

  return <>{children}</>;
}