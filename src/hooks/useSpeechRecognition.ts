import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

interface UseSpeechRecognitionProps {
  onTranscriptUpdate: (transcript: string) => void;
}

export function useSpeechRecognition({ onTranscriptUpdate }: UseSpeechRecognitionProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef('');

  const isQuestion = (text: string): boolean => {
    // Normalize text for consistent checking
    const normalizedText = text.trim().toLowerCase();
    
    // Common question patterns
    const patterns = {
      // Question words at start
      questionWords: /^(who|what|where|when|why|how|which|whose|whom)/,
      
      // Auxiliary verbs at start
      auxiliaryVerbs: /^(do|does|did|is|are|am|was|were|will|would|can|could|should|may|might|must|have|has|had)/,
      
      // Inverted word order
      invertedOrder: /^(have|has|had) (you|we|they|he|she|it)|^(are|is|was|were) (you|we|they|he|she|it)/,
      
      // Tag questions
      tagQuestions: /(isn't it|aren't you|don't you|won't you|can't you|wouldn't you|shouldn't you|haven't you|hasn't it)$/,
      
      // Or questions
      orQuestions: /\b(or not)\b/
    };

    return (
      patterns.questionWords.test(normalizedText) ||
      patterns.auxiliaryVerbs.test(normalizedText) ||
      patterns.invertedOrder.test(normalizedText) ||
      patterns.tagQuestions.test(normalizedText) ||
      patterns.orQuestions.test(normalizedText)
    );
  };

  const formatSentences = (text: string): string => {
    // Split text into sentences using multiple delimiters
    const rawSentences = text.split(/([.!?]+|\s+(?=[A-Z]))/g)
      .filter(s => s.trim())
      .map(s => s.trim());
    
    let formattedSentences = [];
    let currentSentence = '';

    for (const part of rawSentences) {
      // If part is punctuation, add it to current sentence
      if (/^[.!?]+$/.test(part)) {
        currentSentence += part;
        if (currentSentence) {
          formattedSentences.push(currentSentence);
          currentSentence = '';
        }
        continue;
      }

      // Start new sentence
      if (!currentSentence) {
        currentSentence = part.charAt(0).toUpperCase() + part.slice(1);
      } else {
        currentSentence += ' ' + part;
      }

      // If sentence ends with punctuation, push it
      if (/[.!?]$/.test(currentSentence)) {
        formattedSentences.push(currentSentence);
        currentSentence = '';
      }
    }

    // Handle any remaining sentence
    if (currentSentence) {
      // Add appropriate punctuation based on sentence type
      if (!currentSentence.match(/[.!?]$/)) {
        currentSentence += isQuestion(currentSentence) ? '?' : '.';
      }
      formattedSentences.push(currentSentence);
    }

    return formattedSentences.join(' ');
  };

  const cleanup = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current = null;
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }, []);

  const initializeRecognition = useCallback(() => {
    cleanup();

    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const current = event.results[event.results.length - 1];
        if (current.isFinal) {
          const newText = formatSentences(current[0].transcript);
          transcriptRef.current += (transcriptRef.current ? ' ' : '') + newText;
          onTranscriptUpdate(transcriptRef.current);
        }
      };

      recognition.onend = () => {
        if (isRecording && !isPaused) {
          try {
            recognition.start();
          } catch (error) {
            console.error('Error restarting recognition:', error);
            setIsRecording(false);
            setIsPaused(false);
          }
        }
      };

      recognition.onerror = (event) => {
        if (event.error === 'not-allowed') {
          toast.error('Please enable microphone access to use speech recognition');
        } else if (event.error !== 'aborted') {
          toast.error('Speech recognition error. Please try again.');
        }
        setIsRecording(false);
        setIsPaused(false);
        cleanup();
      };

      recognitionRef.current = recognition;
    }
    return recognitionRef.current;
  }, [cleanup, isRecording, isPaused, onTranscriptUpdate]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const startRecording = useCallback(() => {
    const recognition = initializeRecognition();
    if (!recognition) {
      toast.error('Speech recognition is not supported in this browser');
      return;
    }

    try {
      transcriptRef.current = '';
      onTranscriptUpdate('');
      recognition.start();
      setIsRecording(true);
      setIsPaused(false);
    } catch (error) {
      console.error('Error starting recognition:', error);
      toast.error('Failed to start recording. Please try again.');
      setIsRecording(false);
      setIsPaused(false);
      cleanup();
    }
  }, [initializeRecognition, cleanup, onTranscriptUpdate]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    setIsPaused(false);
    cleanup();
  }, [cleanup]);

  const pauseRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setIsPaused(true);
      } catch (error) {
        console.error('Error pausing recognition:', error);
        cleanup();
      }
    }
  }, [cleanup]);

  const resumeRecording = useCallback(() => {
    if (isPaused) {
      const recognition = initializeRecognition();
      if (!recognition) return;

      try {
        recognition.start();
        setIsPaused(false);
      } catch (error) {
        console.error('Error resuming recognition:', error);
        toast.error('Failed to resume recording. Please try again.');
        setIsRecording(false);
        setIsPaused(false);
        cleanup();
      }
    }
  }, [initializeRecognition, cleanup, isPaused]);

  return {
    isRecording,
    isPaused,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    isSupported: !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  };
}