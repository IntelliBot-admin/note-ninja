import { useState, useCallback, useRef, useEffect } from 'react';
import {
  uploadAudioFile,
  createAudioBlobFromChunks,
  getMediaRecorderOptions,
  getAudioStream,
  getSystemAudioStream,
} from '../utils/audioHelpers';
import toast from 'react-hot-toast';
import { isMobile } from 'react-device-detect';
import { RealtimeTranscriber } from 'assemblyai';
import { apiFetch } from '../utils/api';
import { Socket } from 'socket.io-client';
import { Speaker } from '../types/transcription';
import { useWakeLock } from './useWakeLock';
import { useMediaSession } from './useMediaSession';
import { socket } from '../lib/socket';

interface UseAudioRecorderProps {
  meetingId: string;
  onAudioUrlUpdate: (url: string) => Promise<void>;
  onTranscriptUpdate: (
    transcript: string,
    translatedTexts?: Record<string, string>
  ) => void;
  onSpeakersUpdate?: (speakers: Speaker[]) => void;
  setAudioUrl: (url: string) => void;
  onHyperAudioUpdate?: (newHyperAudio: {
    transcript: Transcript;
    audioSrc: string;
  }) => void;
  transcriptionMethod?: 'socket' | 'assemblyai';
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

interface Transcript {
  utterances: TranscriptMessage[];
}

type TranscriberEvents = {
  transcript: (message: TranscriptMessage) => void;
  error: (error: any) => void;
  close: () => void;
  open: () => void;
};

interface RealtimeTranscriberType {
  on<K extends keyof TranscriberEvents>(event: K, listener: TranscriberEvents[K]): void;
  connect(): Promise<void>;
  close(): void;
  sendAudio(audio: Int16Array): void;
}

export function useAudioRecorder({
  meetingId,
  onAudioUrlUpdate,
  onTranscriptUpdate,
  onSpeakersUpdate,
  setAudioUrl,
  transcriptionMethod = 'assemblyai',
}: UseAudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isSystemAudio, setIsSystemAudio] = useState(false);
  const [
    notificationStatus,
    setNotificationStatus,
  ] = useState<
    'recording' | 'processing' | 'transcribing' | 'completed' | 'error'
  >('recording');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [isTranscriberLoading, setIsTranscriberLoading] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState<string>('');

  const { requestWakeLock, releaseWakeLock } = useWakeLock();
  const { setupMediaSession, clearMediaSession } = useMediaSession(isRecording, () => {
    if (isRecording) {
      stopRecording();
    }
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const realtimeTranscriberRef = useRef<RealtimeTranscriberType | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastMessageRef = useRef<TranscriptMessage | null>(null);
  const systemStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const accumulatedSpeakersRef = useRef<Speaker[]>([]);

  // Add constant for max duration (in seconds)
  const MAX_FREE_DURATION = 3600; // 10 minutes

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
      const isConsecutive =
        current.speaker === last.speaker &&
        current.start - last.end <= TIME_THRESHOLD;

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

  const processAudioData = useCallback(
    async (audioBlob: Blob) => {
      try {
        setNotificationStatus('processing');
        setShowNotification(true);

        const uploadedUrl = await uploadAudioFile(meetingId, audioBlob);
        setAudioUrl(uploadedUrl);
        await onAudioUrlUpdate(uploadedUrl);

        setNotificationStatus('transcribing');

        // You can integrate hyper audio processing here if needed

        setNotificationStatus('completed');
        setTimeout(() => setShowNotification(false), 3000);

        return { url: uploadedUrl, transcript: currentTranscript };
      } catch (error: any) {
        console.error('Audio processing error:', error);
        setNotificationStatus('error');
        setNotificationMessage(error.message || 'Failed to process recording');
        setTimeout(() => setShowNotification(false), 3000);
        throw error;
      }
    },
    [meetingId, onAudioUrlUpdate, currentTranscript]
  );

  const handleTranscriptUpdate = useCallback(
    (message: TranscriptMessage) => {

      if (message.message_type === 'PartialTranscript' && message.text?.trim()) {
        setPartialTranscript(message.text);
      } else if (message.message_type === 'FinalTranscript' && message.text?.trim()) {
        setPartialTranscript(''); // Clear partial transcript
        setCurrentTranscript((prev) => {
          const newTranscript = prev ? `${prev} ${message.text}` : message.text;
          console.log('newTranscript', newTranscript);

          onTranscriptUpdate(newTranscript);
          return newTranscript;
        });

        lastMessageRef.current = message;
      }
    },
    [onTranscriptUpdate]
  );

  const handleSpeakerData = useCallback(
    (data: any) => {
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
            end: segmentEnd,
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
            end: segmentEnd,
          });
        }
      });

      accumulatedSpeakersRef.current = mergeSegments([
        ...accumulatedSpeakersRef.current,
        ...newSpeakerSegments,
      ]);

      if (onSpeakersUpdate) {
        onSpeakersUpdate(accumulatedSpeakersRef.current);
      }
    },
    [onSpeakersUpdate]
  );

  const setupMediaRecorder = useCallback((
    stream: MediaStream, 
    transcriber: RealtimeTranscriberType | null,
    socketInstance: Socket | null
  ) => {
    audioChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream, getMediaRecorderOptions());

    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
        if (transcriptionMethod === 'socket' && socketInstance) {
          socketInstance.emit('packet-sent', event.data);
        }
      }
    };

    return mediaRecorder;
  }, [transcriptionMethod]);

  const getAssemblyToken = useCallback(async () => {
    try {
      const response = await apiFetch('/getAssemblyAIToken');
      if (!response.token) {
        throw new Error('No token received from AssemblyAI');
      }
      return response.token;
    } catch (error) {
      console.error('Error getting AssemblyAI token:', error);
      throw error;
    }
  }, []);

  const startRecording = useCallback(async (microphoneId?: string, speakerId?: string) => {
    try {
      console.log('Starting recording...');
      setIsTranscriberLoading(true);

      // Get audio stream with selected devices
      let streamForRecording: MediaStream;
      try {
        streamForRecording = await getRecordingStream(microphoneId, speakerId);
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

      let transcriber: RealtimeTranscriberType | null = null;

      if (transcriptionMethod === 'assemblyai') {
        try {
          const token = await getAssemblyToken();
          transcriber = new RealtimeTranscriber({
            token,
            sampleRate: 16000,
            wordBoost: [],
          }) as unknown as RealtimeTranscriberType;

          transcriber.on('transcript', handleTranscriptUpdate);
          transcriber.on('error', (error: any) => {
            console.error('AssemblyAI error:', error);
            toast.error('Transcription error occurred');
            transcriber?.connect();
          });

          await transcriber.connect();
          realtimeTranscriberRef.current = transcriber;
        } catch (error) {
          console.error('Error setting up AssemblyAI:', error);
          toast.error('Failed to initialize transcription');
          setIsTranscriberLoading(false);
          return;
        }
      }

      // Setup MediaRecorder
      const mediaRecorder = await setupMediaRecorder(
        streamForRecording,
        transcriber,
        transcriptionMethod === 'socket' ? socket : null
      );
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);

      // Setup audio processing for AssemblyAI
      if (transcriptionMethod === 'assemblyai') {
        audioContextRef.current = new AudioContext({ sampleRate: 16000 });
        const audioSource = audioContextRef.current.createMediaStreamSource(streamForRecording);
        
        const scriptProcessor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
        audioSource.connect(scriptProcessor);
        scriptProcessor.connect(audioContextRef.current.destination);

        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
          const inputBuffer = audioProcessingEvent.inputBuffer;
          const inputData = inputBuffer.getChannelData(0);
          
          const int16Data = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          if (realtimeTranscriberRef.current) {
            try {
              realtimeTranscriberRef.current.sendAudio(int16Data);
            } catch (error) {
              console.error('Error sending audio to AssemblyAI:', error);
            }
          }
        };
      }

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
        setElapsedTime((prev) => prev + 1);
      }, 1000);

      setCurrentTranscript('');
      lastMessageRef.current = null;
      accumulatedSpeakersRef.current = [];
    } catch (error: any) {
      setIsTranscriberLoading(false);
      console.error('Error starting recording:', error);
      setIsRecording(false);
      setShowNotification(false);
      toast.error(error.message || 'Failed to start recording');
    }
  }, [
    getAssemblyToken,
    handleTranscriptUpdate,
    clearTimer,
    setupMediaRecorder,
    requestWakeLock,
    setupMediaSession,
    transcriptionMethod,
    onTranscriptUpdate,
    meetingId,
    onAudioUrlUpdate,
  ]);

  const stopRecording = useCallback(async () => {
    if (isRecording) {
      try {
        console.log('Stopping recording...');
        clearTimer();
        setIsRecording(false);
        setShowNotification(false);

        let audioBlob: Blob | null = null;

        // Stop MediaRecorder and collect the audio data
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          await new Promise<void>((resolve) => {
            mediaRecorderRef.current!.onstop = () => {
              // Just create the blob and store it
              audioBlob = createAudioBlobFromChunks(audioChunksRef.current);
              audioChunksRef.current = [];
              resolve();
            };
            mediaRecorderRef.current!.stop();
          });
        }

        // Clean up all resources immediately
        await releaseWakeLock();
        clearMediaSession();

        // Stop streams
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach(track => track.stop());
          micStreamRef.current = null;
        }

        if (systemStreamRef.current) {
          systemStreamRef.current.getTracks().forEach(track => track.stop());
          systemStreamRef.current = null;
        }

        // Stop transcription services
        if (transcriptionMethod === 'assemblyai' && realtimeTranscriberRef.current) {
          await realtimeTranscriberRef.current.close();
          realtimeTranscriberRef.current = null;
        }

        if (transcriptionMethod === 'socket' && socket) {
          socket.disconnect();
        }

        if (audioContextRef.current) {
          await audioContextRef.current.close();
          audioContextRef.current = null;
        }

        // Clear transcript references
        lastMessageRef.current = null;
        accumulatedSpeakersRef.current = [];

        // Process the audio data after cleanup
        if (audioBlob) {
          const tempUrl = URL.createObjectURL(audioBlob);
          setAudioUrl(tempUrl);
          console.log(tempUrl,'tempUrl');
          
          await processAudioData(audioBlob);
        }

      } catch (error) {
        console.error('Error stopping recording:', error);
        toast.error('Failed to stop recording properly');
      }
    }
  }, [
    isRecording,
    clearTimer,
    processAudioData,
    releaseWakeLock,
    clearMediaSession,
    transcriptionMethod,
    socket,
  ]);

  const getRecordingStream = useCallback(async (microphoneId?: string, speakerId?: string): Promise<MediaStream> => {
    try {
      if (isMobile) {
        const stream = await getAudioStream(microphoneId);
        micStreamRef.current = stream;
        return stream;
      }

      // Desktop: Combine mic and system audio
      console.log('Getting microphone stream with ID:', microphoneId);
      const micStream = await getAudioStream(microphoneId);
      micStreamRef.current = micStream;

      try {
        console.log('Getting system audio stream with ID:', speakerId);
        const systemStream = await getSystemAudioStream(speakerId);
        systemStreamRef.current = systemStream;

        // Create a new audio context with the correct sample rate
        const audioContext = new AudioContext({ sampleRate: 16000 });
        audioContextRef.current = audioContext;

        // Create sources for both streams
        const micSource = audioContext.createMediaStreamSource(micStream);
        const systemSource = audioContext.createMediaStreamSource(systemStream);

        // Create and configure the merger
        const merger = audioContext.createChannelMerger(2);
        
        // Connect microphone to left channel (0) and system audio to right channel (1)
        micSource.connect(merger, 0, 0);
        systemSource.connect(merger, 0, 1);

        // Create destination and connect merger
        const destination = audioContext.createMediaStreamDestination();
        merger.connect(destination);

        console.log('Successfully created combined audio stream');
        return destination.stream;
      } catch (error: any) {
        console.warn('System audio error:', error);
        if (error.message === 'CANCELLED' || error.message === 'NO_AUDIO') {
          micStream.getTracks().forEach(track => track.stop());
          throw error;
        }
        // If system audio fails, fall back to microphone only
        console.warn('System audio unavailable, using microphone only:', error);
        return micStream;
      }
    } catch (error) {
      console.error('Error getting recording stream:', error);
      throw error;
    }
  }, []);

  const downloadRecording = useCallback(() => {
    if (audioChunksRef.current.length === 0) {
      toast.error('No recording available to download');
      return;
    }

    try {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `recording_${Date.now()}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download recording');
    }
  }, []);

  const muteMic = useCallback(() => {
    if (micStreamRef.current) {
      console.log('Muting microphone stream');
      micStreamRef.current.getAudioTracks().forEach((track) => {
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
      micStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
      setIsMicMuted(false);
    } else {
      console.log('No microphone stream to unmute');
    }
  }, []);

  useEffect(() => {
    if (transcriptionMethod === 'socket') {
      socket.on('connect', () => {
        console.log('Connected to websocket server');
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from websocket server');
        // Attempt to reconnect
        socket.connect();
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        // Attempt to reconnect after a short delay
        setTimeout(() => {
          socket.connect();
        }, 1000);
      });

      socket.on('transcript', (transcript: string) => {
        if (transcript) {
          setCurrentTranscript((prev) => {
            const newTranscript = prev ? `${prev} ${transcript}` : transcript;
            console.log('newTranscript', newTranscript);

            onTranscriptUpdate(newTranscript);
            return newTranscript;
          });
        }
      });

      socket.on('data', handleSpeakerData);
    }

    return () => {
      if (transcriptionMethod === 'socket') {
        socket.off('transcript');
        socket.off('disconnect');
        socket.off('connect_error');
        socket.off('data');
      }
    };
  }, [socket, transcriptionMethod, handleSpeakerData, onTranscriptUpdate]);

  useEffect(() => {
    console.log('elapsedTime', elapsedTime);

    // Auto-stop recording for free plan users at MAX_FREE_DURATION seconds
    if (
      elapsedTime >= MAX_FREE_DURATION &&
      isRecording &&
      transcriptionMethod === 'assemblyai'
    ) {
      toast.error(`Free plan is limited to ${MAX_FREE_DURATION / 60} minutes of recording`);
      stopRecording();
    }
  }, [elapsedTime, isRecording, transcriptionMethod, stopRecording]);

  useEffect(() => {
    return () => {
      clearTimer();
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [clearTimer, isRecording]);

  return {
    isRecording,
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
    unmuteMic,
    partialTranscript,
  };
}