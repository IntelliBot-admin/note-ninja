import { useState, useCallback, useRef, useEffect } from 'react';
import { uploadAudioFile, createAudioBlobFromChunks, getMediaRecorderOptions, getAudioStream, getSystemAudioStream } from '../utils/audioHelpers';
import toast from 'react-hot-toast';
import { isMobile } from 'react-device-detect';
import { Socket } from 'socket.io-client';
import { Speaker } from '../types/transcription';
import { useWakeLock } from './useWakeLock';
import { useMediaSession } from './useMediaSession';
import { socket } from '../lib/socket';
import { useSubscription } from './useSubscription';


interface UseAudioRecorderProps {
  meetingId: string;
  onAudioUrlUpdate: (url: string) => Promise<void>;
  onTranscriptUpdate: (transcript: string, translatedTexts?: Record<string, string>) => void;
  onSpeakersUpdate: (speakers: Speaker[]) => void;
}

interface TranscriptWord {
  start: number;
  end: number;
  confidence: number;
  text: string;
}

interface TranscriptMessage {
  message_type: string;
  created: string;
  audio_start: number;
  audio_end: number;
  confidence: number;
  text: string;
  words: TranscriptWord[];
  punctuated: boolean;
  text_formatted: boolean;
}


export function useAudioRecorder({
  meetingId,
  onAudioUrlUpdate,
  onTranscriptUpdate,
  onSpeakersUpdate
}: UseAudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isSystemAudio, setIsSystemAudio] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<'recording' | 'processing' | 'transcribing' | 'completed' | 'error'>('recording');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  // const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [isTranscriberLoading, setIsTranscriberLoading] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);

  const { requestWakeLock, releaseWakeLock } = useWakeLock();
  const { setupMediaSession, clearMediaSession } = useMediaSession(isRecording, () => {
    if (isRecording) {
      stopRecording();
    }
  });
  const { planName } = useSubscription(); 

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // const socketRef = useRef<Socket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastMessageRef = useRef<TranscriptMessage | null>(null);
  const partialTranscriptRef = useRef<string>('');
  const systemStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const accumulatedSpeakersRef = useRef<Speaker[]>([]);

  // Add constant for max duration (in seconds)
  const MAX_FREE_DURATION = 600; // 10 minutes

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const processAudioData = async (audioBlob: Blob) => {
    try {
      // setNotificationStatus('processing');
      // setShowNotification(true);

      const uploadedUrl = await uploadAudioFile(meetingId, audioBlob);
      setAudioUrl(uploadedUrl);
      await onAudioUrlUpdate(uploadedUrl);

      // setNotificationStatus('transcribing');
      // const result = await transcribeAudio(audioBlob);

      // if (result.text) {
      //   onTranscriptUpdate(result.text, result.utterances);
      // }

      // setNotificationStatus('completed');
      setTimeout(() => setShowNotification(false), 3000);

      return { url: uploadedUrl, transcript: currentTranscript };
    } catch (error: any) {
      console.error('Audio processing error:', error);
      setNotificationStatus('error');
      setNotificationMessage(error.message || 'Failed to process recording');
      setTimeout(() => setShowNotification(false), 3000);
      throw error;
    }
  };

  // const handleTranscriptUpdate = (message: TranscriptMessage) => {
  //   console.log('Received transcript:', message);

  //   if (message.message_type === "PartialTranscript") {
  //     // Update the partial transcript
  //     partialTranscriptRef.current = message.text;

  //     // Get the latest transcript value using a callback to ensure we have the most recent state
  //     setCurrentTranscript(prev => {
  //       const displayText = `${prev}${message.text}`;
  //       onTranscriptUpdate(displayText);
  //       return prev; // Don't update the current transcript yet, just display it
  //     });
  //   }
  //   else if (message.message_type === "FinalTranscript" && message.text && message.text.trim()) {
  //     // Clear the partial transcript since we're getting a final version
  //     partialTranscriptRef.current = '';

  //     // Update the current transcript with the finalized text
  //     setCurrentTranscript(prev => {
  //       const needsSpace = prev && !prev.match(/[.!?,]$/);
  //       const newTranscript = prev
  //         ? (needsSpace ? `${prev} ${message.text}` : `${prev}${message.text}`)
  //         : message.text;

  //       onTranscriptUpdate(newTranscript);
  //       return newTranscript;
  //     });

  //     lastMessageRef.current = message;
  //   }
  // };

  const handleSpeakerData = useCallback((data: any) => {
    const words = data.channel?.alternatives[0]?.words || [];
    if (words.length === 0) return;

    // Group consecutive words by speaker
    let currentSpeaker = words[0].speaker;
    let currentText: string[] = [];
    let segmentStart = words[0].start;
    let segmentEnd = words[0].end;

    const newSpeakerSegments: Speaker[] = [];

    words.forEach((word: any, index: number) => {
      if (word.speaker === currentSpeaker) {
        currentText.push(word.punctuated_word || word.word);
        segmentEnd = word.end;
      } else {
        newSpeakerSegments.push({
          speaker: currentSpeaker.toString(),
          text: currentText.join(' '),
          start: segmentStart,
          end: segmentEnd
        });

        currentSpeaker = word.speaker;
        currentText = [word.punctuated_word || word.word];
        segmentStart = word.start;
        segmentEnd = word.end;
      }

      if (index === words.length - 1) {
        newSpeakerSegments.push({
          speaker: currentSpeaker.toString(),
          text: currentText.join(' '),
          start: segmentStart,
          end: segmentEnd
        });
      }
    });

    accumulatedSpeakersRef.current = mergeSegments([
      ...accumulatedSpeakersRef.current,
      ...newSpeakerSegments
    ]);

    onSpeakersUpdate(accumulatedSpeakersRef.current);
  }, [onSpeakersUpdate]);

  // const initializeSocket = useCallback(() => {
  //   if (!socketRef.current) {



  //     socketRef.current = socket;
  //   }
  //   return socketRef.current;
  // }, [onTranscriptUpdate, handleSpeakerData]);

  const getRecordingStream = useCallback(async () => {
    if (isMobile) {
      const stream = await getAudioStream();
      micStreamRef.current = stream;
      return stream;
    }

    // Desktop: Combine mic and system audio
    const micStream = await getAudioStream();
    micStreamRef.current = micStream;

    try {
      const systemStream = await getSystemAudioStream();
      systemStreamRef.current = systemStream;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      const micSource = audioContext.createMediaStreamSource(micStream);
      const systemSource = audioContext.createMediaStreamSource(systemStream);

      const merger = audioContext.createChannelMerger(2);
      micSource.connect(merger, 0, 0);
      systemSource.connect(merger, 0, 1);

      const destination = audioContext.createMediaStreamDestination();
      merger.connect(destination);

      return destination.stream;
    } catch (error: any) {
      if (error.message === 'CANCELLED') {
        micStream.getTracks().forEach(track => track.stop());
        throw error;
      } else if (error.message === 'NO_AUDIO') {
        micStream.getTracks().forEach(track => track.stop());
        throw error;
      }
      console.warn('System audio unavailable, using microphone only:', error);
      return micStream;
    }
  }, []);

  const setupMediaRecorder = useCallback((stream: MediaStream, socket: Socket) => {
    audioChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream, getMediaRecorderOptions());

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
        socket.emit('packet-sent', event.data);
      }
    };

    return mediaRecorder;
  }, []);

  const startRecording = useCallback(async () => {
    try {
      console.log('Starting recording...');
      setIsTranscriberLoading(true);

      // Get audio stream
      let streamForRecording: MediaStream;
      try {
        streamForRecording = await getRecordingStream();
      } catch (error: any) {
        setIsTranscriberLoading(false);
        if (error.message === 'CANCELLED' || error.message === 'NO_AUDIO') {
          if (error.message === 'NO_AUDIO') {
            toast.error('Please enable system audio sharing in the dialog');
          }
          return;
        }
        throw error;
      }

      console.log('Got audio stream:', streamForRecording);

      // Ensure socket is connected
      if (!socket) {
        throw new Error('Socket connection not established');
      }

      // Setup MediaRecorder
      const mediaRecorder = setupMediaRecorder(streamForRecording, socket);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(500);

      // Initialize recording state
      setIsTranscriberLoading(false);
      setIsRecording(true);
      setElapsedTime(0);
      
      // Request wake lock and setup media session
      await requestWakeLock();
      setupMediaSession();
      
      setNotificationStatus('recording');
      setShowNotification(true);

      clearTimer();
      intervalRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);

      setCurrentTranscript('');
      lastMessageRef.current = null;
      partialTranscriptRef.current = '';

    } catch (error: any) {
      setIsTranscriberLoading(false);
      console.error('Error starting recording:', error);
      setIsRecording(false);
      setShowNotification(false);
      toast.error(error.message || 'Failed to start recording');
    }
  }, [meetingId, onAudioUrlUpdate, clearTimer, getRecordingStream, setupMediaRecorder, planName]);

  const stopRecording = useCallback(async () => {
    if (isRecording) {
      try {
        console.log('Stopping recording...');
        clearTimer();
        setIsRecording(false);
        setShowNotification(false);

        // Stop MediaRecorder and process the recorded audio
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          await new Promise<void>((resolve) => {
            mediaRecorderRef.current!.onstop = async () => {
              try {
                // Create blob from recorded chunks
                const audioBlob = createAudioBlobFromChunks(audioChunksRef.current);
                const tempUrl = URL.createObjectURL(audioBlob);
                setAudioUrl(tempUrl);

                // Process the recorded audio
                await processAudioData(audioBlob);

                // Clear the chunks
                audioChunksRef.current = [];
                resolve();
              } catch (error) {
                console.error('Error processing audio:', error);
                resolve();
              }
            };

            mediaRecorderRef.current!.stop();
          });
        }
        
        // Release wake lock and clear media session
        await releaseWakeLock();
        clearMediaSession();

        // Stop microphone stream
        if (micStreamRef.current) {
          console.log('Stopping microphone stream...');
          micStreamRef.current.getTracks().forEach(track => {
            console.log(`Stopping microphone track: ${track.kind}`);
            track.stop();
          });
          micStreamRef.current = null;
        }

        // Stop system audio stream
        if (systemStreamRef.current) {
          console.log('Stopping system audio stream...');
          systemStreamRef.current.getTracks().forEach(track => {
            console.log(`Stopping system track: ${track.kind}`);
            track.stop();
          });
          systemStreamRef.current = null;
        }

        // Clean up audio context
        if (audioContextRef.current) {
          console.log('Closing audio context...');
          audioContextRef.current.close();
          audioContextRef.current = null;
        }

        // Clear all transcript references
        lastMessageRef.current = null;
        partialTranscriptRef.current = '';

        // Clear accumulated speakers
        accumulatedSpeakersRef.current = [];

      } catch (error) {
        console.error('Error stopping recording:', error);
        toast.error('Failed to stop recording properly');
      }
    }
  }, [isRecording, clearTimer]);

  const downloadRecording = useCallback(() => {
    if (audioUrl) {
      try {
        const link = document.createElement('a');
        link.href = audioUrl;
        link.download = `recording_${Date.now()}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Download error:', error);
      }
    }
  }, [audioUrl]);

  const muteMic = useCallback(() => {
    if (micStreamRef.current) {
      console.log('Muting microphone stream');
      micStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
      setIsMicMuted(true);
    } else {
      console.log('No microphone stream to mute');
    }
  }, []);

  const unmuteMic = useCallback(() => {
    if (micStreamRef.current) {
      console.log('Unmuting microphone stream');
      micStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
      setIsMicMuted(false);
    } else {
      console.log('No microphone stream to unmute');
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [clearTimer, isRecording]);

  // Add this helper function to merge overlapping segments
  const mergeSegments = (segments: Speaker[]): Speaker[] => {
    if (segments.length === 0) return [];

    // Sort segments by start time
    const sortedSegments = [...segments].sort((a, b) => a.start - b.start);
    const merged: Speaker[] = [sortedSegments[0]];

    for (let i = 1; i < sortedSegments.length; i++) {
      const current = sortedSegments[i];
      const last = merged[merged.length - 1];

      // Consider segments consecutive if they're from the same speaker and within 2 seconds
      const TIME_THRESHOLD = 2; // seconds
      const isConsecutive = current.speaker === last.speaker &&
        (current.start - last.end) <= TIME_THRESHOLD;

      if (isConsecutive) {
        // Merge consecutive segments from the same speaker
        last.end = Math.max(last.end, current.end);
        // Add space between merged texts and handle punctuation
        const needsSpace = !last.text.match(/[.!?,]$/);
        last.text = needsSpace
          ? `${last.text} ${current.text}`
          : `${last.text}${current.text}`;
      } else {
        merged.push(current);
      }
    }

    return merged;
  };

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to websocket server');
    });

    socket.on('transcript', (transcript: string) => {
      if (transcript) {
        setCurrentTranscript(prev => {
          const newTranscript = prev ? `${prev} ${transcript}` : transcript;
          onTranscriptUpdate(newTranscript);
          return newTranscript;
        });
      }
    });

    socket.on('data', handleSpeakerData);

    return () => {
      socket.off('transcript');
      socket.off('data');
    };
  }, [socket]);

  useEffect(() => {
    console.log("elapsedTime", elapsedTime);
    
    // Auto-stop recording for free planName users at 10 minutes        
    if (planName === 'Free' && elapsedTime >= MAX_FREE_DURATION && isRecording) {
      toast.error('Free plan is limited to 10 minutes of recording');
      console.log("inside of if");
      stopRecording();
    }
  }, [elapsedTime, isRecording, planName, stopRecording]);

  return {
    isRecording,
    audioUrl,
    duration: elapsedTime,
    formatDuration,
    startRecording,
    stopRecording,
    downloadRecording,
    isSystemAudio,
    setIsSystemAudio,
    notificationStatus,
    showNotification,
    notificationMessage,
    isTranscriberLoading,
    isMicMuted,
    muteMic,
    unmuteMic
  };
}