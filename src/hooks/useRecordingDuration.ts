import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

const WARNING_DURATION = 180 * 60 * 1000; // 75 minutes in milliseconds
const WARNING_TIMEOUT = 60 * 1000; // 60 seconds warning duration

export function useRecordingDuration(
  isRecording: boolean,
  onStopRecording: () => void
) {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const keepRecording = useCallback(() => {
    setShowWarning(false);
    setCountdown(0);
    clearTimers();
    toast.success('Recording continued');
  }, [clearTimers]);

  useEffect(() => {
    if (isRecording && !recordingStartRef.current) {
      recordingStartRef.current = Date.now();

      // Set timer for warning
      warningTimerRef.current = setTimeout(() => {
        setShowWarning(true);
        setCountdown(60);

        // Start countdown
        countdownIntervalRef.current = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearTimers();
              onStopRecording();
              toast.error('Recording stopped due to duration limit');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }, WARNING_DURATION);
    }

    if (!isRecording) {
      clearTimers();
      recordingStartRef.current = null;
      setShowWarning(false);
      setCountdown(0);
    }

    return () => clearTimers();
  }, [isRecording, clearTimers, onStopRecording]);

  return {
    showWarning,
    countdown,
    keepRecording
  };
}