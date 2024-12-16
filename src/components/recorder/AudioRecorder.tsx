import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useRecordingDuration } from '../../hooks/useRecordingDuration';
import { generateSummary } from '../../utils/aiSummary';
import { MeetingType, meetingTypes } from '../../types/meeting';
import { TranscriptDisplay } from './TranscriptDisplay';
import { RecordButton } from './RecordButton';
import AudioPlayer from './AudioPlayer';
import NotificationManager from './NotificationManager';
import MindMap from '../mindmap/MindMap';
import ShareDialog from '../share/ShareDialog';
import DurationWarningModal from './DurationWarningModal';
import NoteEditor from '../notes/NoteEditor';
import RecordingInstructions from './RecordingInstructions';
import { Share2, FileText, Globe } from 'lucide-react';
import { useMeetingStore } from '../../store/meetingStore';
import { translateText, SUPPORTED_LANGUAGES } from '../../utils/translate';
import toast from 'react-hot-toast';
import { isMobile } from 'react-device-detect';
import { Speaker } from '../../types/transcription';


const SHOW_INSTRUCTIONS_KEY = 'showRecordingInstructions';

interface AudioRecorderProps {
  onTranscriptChange: (transcript: string) => void;
  onAudioUrlUpdate: (url: string) => Promise<void>;
  onSummaryChange: (summary: string, type: MeetingType) => void;
  onRecordingStateChange: (isRecording: boolean) => void;
  onNotesChange?: (notes: string) => void;
  onSpeakersChange?: (speakers: Speaker[]) => void;
  initialTranscript?: string;
  initialAudioUrl?: string;
  initialSummary?: string;
  initialMeetingType?: MeetingType;
  initialNotes?: string;
  initialSpeakers?: Speaker[];
  meetingId: string;
}

export default function AudioRecorder({
  onTranscriptChange,
  onAudioUrlUpdate,
  onSummaryChange,
  onRecordingStateChange,
  onSpeakersChange,
  onNotesChange,
  initialTranscript = '',
  initialAudioUrl = '',
  initialSummary = '',
  initialMeetingType = 'general',
  initialNotes = '',
  initialSpeakers = [],
  meetingId
}: AudioRecorderProps) {
  const [transcript, setTranscript] = useState(initialTranscript);
  const [summary, setSummary] = useState(initialSummary);
  const [speakers, setSpeakers] = useState<Speaker[]>(initialSpeakers);
  const [selectedMeetingType, setSelectedMeetingType] = useState<MeetingType>(initialMeetingType);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [showMindMap, setShowMindMap] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notes, setNotes] = useState(initialNotes);
  const { updateMeeting } = useMeetingStore();
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [translatedSummary, setTranslatedSummary] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [showInstructions, setShowInstructions] = useState(() => {
    if (isMobile) return false;
    const savedPreference = localStorage.getItem(SHOW_INSTRUCTIONS_KEY);
    return savedPreference === null ? true : savedPreference === 'true';
  });
  const [showingInstructions, setShowingInstructions] = useState(false);

  const notesRef = useRef<HTMLDivElement>(null);
  const saveNotesTimeoutRef = useRef<NodeJS.Timeout>();
  const saveTranscriptTimeoutRef = useRef<NodeJS.Timeout>();

  const {
    isRecording,
    audioUrl,
    startRecording: startRecordingFn,
    stopRecording,
    downloadRecording,
    notificationStatus,
    showNotification,
    notificationMessage,
    isTranscriberLoading,
    duration
  } = useAudioRecorder({
    meetingId,
    onAudioUrlUpdate: async (url: string) => {
      setIsProcessing(true);
      try {
        await onAudioUrlUpdate(url);
      } finally {
        setIsProcessing(false);
      }
    },
    onTranscriptUpdate: async (newTranscript: string) => {
      setTranscript(newTranscript);
      onTranscriptChange(newTranscript);

      if (saveTranscriptTimeoutRef.current) {
        clearTimeout(saveTranscriptTimeoutRef.current);
      }

      saveTranscriptTimeoutRef.current = setTimeout(async () => {
        try {
          await updateMeeting(meetingId, { transcription: newTranscript });
        } catch (error) {
          console.error('Error saving transcript:', error);
          toast.error('Failed to save transcript');
        }
      }, 1000);
    }
  });

  const handleRecordClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecordingFn();
      // Show instructions after Chrome dialog appears with shorter delay
      showInstructions && setTimeout(() => setShowingInstructions(true), 400);
    }
  };

  const handleDontShowAgain = (value: boolean) => {
    localStorage.setItem(SHOW_INSTRUCTIONS_KEY, (!value).toString());
    setShowInstructions(!value);
    setShowingInstructions(false);
  };

  const { showWarning, countdown, keepRecording } = useRecordingDuration(
    isRecording,
    stopRecording
  );

  const handleGenerateSummary = async () => {
    if (!transcript) {
      toast.error('Please record audio first');
      return;
    }

    setIsGeneratingSummary(true);
    try {
      const generatedSummary = await generateSummary(transcript, selectedMeetingType, showEmojis);
      setSummary(generatedSummary);
      onSummaryChange(generatedSummary, selectedMeetingType);
      
      await updateMeeting(meetingId, { 
        summary: generatedSummary,
        meetingType: selectedMeetingType
      });
      
      toast.success('Summary generated successfully');
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('Failed to generate summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const targetLanguage = e.target.value;
    setSelectedLanguage(targetLanguage);

    if (!targetLanguage) {
      setTranslatedSummary('');
      return;
    }

    if (!summary) {
      toast.error('Generate a summary first before translating');
      return;
    }

    setIsTranslating(true);
    try {
      const translated = await translateText(summary, targetLanguage);
      setTranslatedSummary(translated);
      toast.success(`Translated to ${SUPPORTED_LANGUAGES[targetLanguage as keyof typeof SUPPORTED_LANGUAGES]}`);
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('Translation failed. Please try again.');
      setSelectedLanguage('');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleNotesChange = useCallback((newNotes: string) => {
    setNotes(newNotes);
    
    if (saveNotesTimeoutRef.current) {
      clearTimeout(saveNotesTimeoutRef.current);
    }

    saveNotesTimeoutRef.current = setTimeout(async () => {
      try {
        await updateMeeting(meetingId, { personalNotes: newNotes });
        if (onNotesChange) {
          onNotesChange(newNotes);
        }
      } catch (error) {
        console.error('Error saving notes:', error);
        toast.error('Failed to save notes');
      }
    }, 1000);
  }, [meetingId, updateMeeting, onNotesChange]);

  const scrollToNotes = () => {
    notesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    onRecordingStateChange(isRecording);
  }, [isRecording, onRecordingStateChange]);

  useEffect(() => {
    return () => {
      if (saveNotesTimeoutRef.current) {
        clearTimeout(saveNotesTimeoutRef.current);
      }
      if (saveTranscriptTimeoutRef.current) {
        clearTimeout(saveTranscriptTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-4">
            <RecordButton
              isRecording={isRecording}
              onClick={handleRecordClick}
              isLoading={isTranscriberLoading}
            />
          </div>

          {(audioUrl || initialAudioUrl) && (
            <div className="flex flex-col sm:flex-row w-full space-y-4 sm:space-y-0 sm:space-x-4 items-center">
              <div className="w-full sm:flex-1">
                <AudioPlayer audioUrl={audioUrl || initialAudioUrl} />
              </div>
              <button
                onClick={downloadRecording}
                className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Download Recording
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={scrollToNotes}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <FileText className="w-4 h-4 mr-2" />
          Personal Notes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Transcription</h2>
          <TranscriptDisplay  transcript={transcript} speakers={speakers} />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">AI Summary</h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-gray-400" />
                <select
                  value={selectedLanguage}
                  onChange={handleLanguageChange}
                  disabled={isTranslating || !summary}
                  className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Original (English)</option>
                  {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setShowEmojis(!showEmojis)}
                className="text-sm text-gray-700 hover:text-indigo-600"
              >
                {showEmojis ? 'Hide Emojis' : 'Show Emojis'}
              </button>
              <button
                onClick={() => setShowMindMap(!showMindMap)}
                className="text-sm text-gray-700 hover:text-indigo-600"
              >
                {showMindMap ? 'Show Text' : 'Show Mind Map'}
              </button>
              {(transcript || summary) && (
                <button
                  onClick={() => setShowShareDialog(true)}
                  className="text-sm text-gray-700 hover:text-indigo-600 flex items-center"
                >
                  <Share2 className="w-4 h-4 mr-1" />
                  Share
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4 h-[400px] flex flex-col">
            {summary ? (
              <>
                <div className="mb-4 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 items-start sm:items-center">
                  <select
                    value={selectedMeetingType}
                    onChange={(e) => {
                      const newType = e.target.value as MeetingType;
                      setSelectedMeetingType(newType);
                      onSummaryChange(summary, newType);
                    }}
                    className="w-full sm:w-64 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    {Object.entries(meetingTypes).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleGenerateSummary}
                    className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    disabled={isGeneratingSummary}
                  >
                    {isGeneratingSummary ? 'Generating...' : 'Regenerate'}
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {isTranslating ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                  ) : showMindMap ? (
                    <MindMap summary={translatedSummary || summary} meetingType={selectedMeetingType} />
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: translatedSummary || summary }} />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <select
                  value={selectedMeetingType}
                  onChange={(e) => setSelectedMeetingType(e.target.value as MeetingType)}
                  className="w-full sm:w-64 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm mb-4"
                >
                  {Object.entries(meetingTypes).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <p className="text-gray-500">
                  {isProcessing ? 'Processing audio...' : transcript ? 'Click Generate AI Summary to continue' : 'Record audio to get started'}
                </p>
                {transcript && !isProcessing && (
                  <button
                    onClick={handleGenerateSummary}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    disabled={isGeneratingSummary}
                  >
                    {isGeneratingSummary ? 'Generating...' : 'Generate AI Summary'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div ref={notesRef} className="space-y-4 scroll-mt-8">
        <h2 className="text-xl font-semibold text-gray-900">Personal Notes</h2>
        <NoteEditor
          content={notes}
          onChange={handleNotesChange}
          autoFocus={false}
        />
      </div>

      <NotificationManager 
        show={showNotification}
        status={notificationStatus}
        message={notificationMessage}
      />

      <ShareDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        transcript={transcript}
        summary={summary}
      />

      <RecordingInstructions
        isOpen={showingInstructions}
        onClose={() => setShowingInstructions(false)}
        onStart={() => {
          startRecordingFn();
          setShowingInstructions(false);
        }}
        onDontShowAgain={handleDontShowAgain}
      />

      {showWarning && (
        <DurationWarningModal
          countdown={countdown}
          onKeepRecording={keepRecording}
          onStopRecording={stopRecording}
        />
      )}
    </div>
  );
}