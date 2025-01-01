import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

interface SilenceDetectionOptions {
  silenceThreshold?: number;
  initialSilenceTimeout?: number;
  warningTimeout?: number;
  checkInterval?: number;
}

export function useAudioSilenceDetection(
  stream: MediaStream | null,
  isRecording: boolean,
  onStopRecording: () => void,
  options: SilenceDetectionOptions = {}
) {
  const {
    silenceThreshold = -50, // Less negative threshold for better detection
    initialSilenceTimeout = 60000,
    warningTimeout = 60000,
    checkInterval = 100 // Check more frequently
  } = options;

  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastAudioLevelRef = useRef<number>(-Infinity);
  const consecutiveSilenceCountRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
  }, []);

  const resetSilenceDetection = useCallback(() => {
    silenceStartRef.current = null;
    consecutiveSilenceCountRef.current = 0;
    setShowWarning(false);
    setCountdown(0);
    clearTimers();
  }, [clearTimers]);

  const keepRecording = useCallback(() => {
    resetSilenceDetection();
    toast.success('Recording continued');
  }, [resetSilenceDetection]);

  const cleanup = useCallback(() => {
    clearTimers();
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
    }
    audioContextRef.current = null;
    analyserRef.current = null;
    lastAudioLevelRef.current = -Infinity;
    consecutiveSilenceCountRef.current = 0;
  }, [clearTimers]);

  useEffect(() => {
    if (!isRecording || !stream) {
      cleanup();
      return;
    }

    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 1024; // Smaller FFT size for more frequent updates
      analyserRef.current.smoothingTimeConstant = 0.2; // Less smoothing for quicker response

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      const bufferLength = analyserRef.current.frequencyBinCount;
      const timeDataArray = new Float32Array(bufferLength);
      const frequencyDataArray = new Uint8Array(bufferLength);

      const checkAudioLevel = () => {
        if (!isRecording || !analyserRef.current) return;

        // Get both time and frequency domain data for better analysis
        analyserRef.current.getFloatTimeDomainData(timeDataArray);
        analyserRef.current.getByteFrequencyData(frequencyDataArray);
        
        // Calculate RMS from time domain
        let rms = 0;
        for (let i = 0; i < bufferLength; i++) {
          rms += timeDataArray[i] * timeDataArray[i];
        }
        rms = Math.sqrt(rms / bufferLength);
        
        // Calculate average frequency magnitude
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += frequencyDataArray[i];
        }
        const avgFrequency = sum / bufferLength;

        // Convert RMS to dB
        const db = 20 * Math.log10(Math.max(rms, 0.00001));
        
        // Combine both metrics for more accurate silence detection
        const isSilent = db < silenceThreshold && avgFrequency < 5;

        if (isSilent) {
          consecutiveSilenceCountRef.current++;
          
          if (!silenceStartRef.current) {
            silenceStartRef.current = Date.now();
            console.log('Silence detected:', { db, avgFrequency });
          } else {
            const silenceDuration = Date.now() - silenceStartRef.current;
            
            if (!showWarning && silenceDuration >= initialSilenceTimeout) {
              console.log('Warning threshold reached:', { silenceDuration, db, avgFrequency });
              setShowWarning(true);
              setCountdown(Math.ceil(warningTimeout / 1000));

              countdownIntervalRef.current = setInterval(() => {
                setCountdown(prev => {
                  if (prev <= 1) {
                    clearTimers();
                    onStopRecording();
                    resetSilenceDetection();
                    toast.error('Recording stopped due to prolonged silence');
                    return 0;
                  }
                  return prev - 1;
                });
              }, 1000);
            }
          }
        } else {
          // Only reset if we have consistent audio above threshold
          if (consecutiveSilenceCountRef.current > 0) {
            consecutiveSilenceCountRef.current--;
            if (consecutiveSilenceCountRef.current === 0) {
              console.log('Audio detected:', { db, avgFrequency });
              resetSilenceDetection();
            }
          }
        }

        lastAudioLevelRef.current = db;
      };

      // Check audio levels more frequently
      checkIntervalRef.current = setInterval(checkAudioLevel, checkInterval);

      return () => cleanup();
    } catch (error) {
      console.error('Error setting up audio analysis:', error);
      cleanup();
    }
  }, [isRecording, stream, silenceThreshold, initialSilenceTimeout, warningTimeout, checkInterval, onStopRecording, resetSilenceDetection, showWarning, cleanup]);

  return {
    showWarning,
    countdown,
    keepRecording
  };
}