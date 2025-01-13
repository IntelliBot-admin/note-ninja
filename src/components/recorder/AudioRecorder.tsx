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
import { Share2, VolumeX, Volume2, Plus } from 'lucide-react';
import { useMeetingStore } from '../../store/meetingStore';
import { translateText, SUPPORTED_LANGUAGES } from '../../utils/translate';
import toast from 'react-hot-toast';
import { isMobile } from 'react-device-detect';
import { Speaker } from '../../types/transcription';
import { debounce } from 'lodash';
import { getStorage, ref, getBlob } from 'firebase/storage';
import { useActionItemStore } from '../../store/actionItemStore';
import { useNavigationStore } from '../../store/navigationStore';
import DeviceSelectDialog from './DeviceSelection';
// import { Transcript } from './HyperAudio';
// import EnhancedHyperAudioTranscript from './HyperAudio';


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
  initialRecommendedActionItems?: ActionItem[];
  meetingId: string;
}

interface ActionItem {
  title: string;
  description: string;
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
  initialRecommendedActionItems = [],
  meetingId
}: AudioRecorderProps) {
  const [transcript, setTranscript] = useState(initialTranscript);
  const [summary, setSummary] = useState(initialSummary);
  const [speakers, setSpeakers] = useState<Speaker[]>(initialSpeakers);
  const [selectedMeetingType, setSelectedMeetingType] = useState<MeetingType>(initialMeetingType);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showEmojis, setShowEmojis] = useState(true);
  const [showMindMap, setShowMindMap] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [mobileView, setMobileView] = useState<'summary' | 'actions'>('summary');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('transcription');
  const [notes, setNotes] = useState(initialNotes);
  const { updateMeeting } = useMeetingStore();
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [translatedSummary, setTranslatedSummary] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>(initialRecommendedActionItems);
  // const [hyperAudioTranscript, setHyperAudioTranscript] = useState<Transcript | null>(null);
  const [showDeviceSelect, setShowDeviceSelect] = useState(false);
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);

  const { setShowForm, setFormData } = useActionItemStore();
  const { setActiveTab: setActiveTabNavigation } = useNavigationStore();

  const [showInstructions, setShowInstructions] = useState(() => {
    if (isMobile) return false;
    const savedPreference = localStorage.getItem(SHOW_INSTRUCTIONS_KEY);
    return savedPreference === null ? true : savedPreference === 'true';
  });
  const [showingInstructions, setShowingInstructions] = useState(false);

  const notesRef = useRef<HTMLDivElement>(null);
  const saveNotesTimeoutRef = useRef<NodeJS.Timeout>();
  const saveTranscriptTimeoutRef = useRef<NodeJS.Timeout>();

  const debouncedSpeakersChange = useRef(
    debounce((newSpeakers: Speaker[]) => {
      if (onSpeakersChange) {
        onSpeakersChange(newSpeakers);
      }
    }, 4000)
  ).current;

  const {
    isRecording,
    startRecording: startRecordingFn,
    stopRecording,
    notificationStatus,
    showNotification,
    notificationMessage,
    isTranscriberLoading,
    duration,
    isMicMuted,
    muteMic,
    unmuteMic,
    partialTranscript,
  } = useAudioRecorder({
    setAudioUrl,
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
      // onTranscriptChange(newTranscript);

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
    },
    onSpeakersUpdate: (newSpeakers: Speaker[]) => {
      setSpeakers(newSpeakers);
      debouncedSpeakersChange(newSpeakers);
    },
    // onHyperAudioUpdate: (newHyperAudio: {transcript: Transcript, audioSrc: string}) => {
    //   setHyperAudioTranscript(newHyperAudio.transcript);
    //   setAudioUrl(newHyperAudio.audioSrc);
    // }
  });

  const loadAudioDevices = useCallback(async () => {
    try {
      // Request permission and enumerate devices
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      setAudioInputDevices(devices.filter(device => device.kind === 'audioinput'));
      setAudioOutputDevices(devices.filter(device => device.kind === 'audiooutput'));
    } catch (error) {
      console.error('Error loading audio devices:', error);
      toast.error('Failed to load audio devices');
    }
  }, []);

  const handleRecordClick = async () => {
    if (isRecording) {
      await updateMeeting(meetingId, { transcription: transcript });
      stopRecording();
    } else {
      if (isMobile) {
        // On mobile, start recording directly
        startRecordingFn();
      } else {
        // On desktop, show device selection dialog
        loadAudioDevices().then(() => {
          setShowDeviceSelect(true);
        });
      }
    }
  };

  const handleDeviceSelect = (microphoneId: string, speakerId: string) => {
    setShowDeviceSelect(false);
    startRecordingFn(microphoneId, speakerId);
  };

  const handleDontShowAgain = (value: boolean) => {
    localStorage.setItem(SHOW_INSTRUCTIONS_KEY, (!value).toString());
    setShowInstructions(!value);
    setShowingInstructions(false);
  };

  async function downloadRecording() {
    try {
      const storage = getStorage();
      const url = audioUrl || initialAudioUrl;

      if (!url) {
        throw new Error('No audio URL available');
      }

      // Get the part after '/o/' and remove query parameters
      const pathPart = url.split('/o/')[1];
      const path = decodeURIComponent(pathPart.split('?')[0]);
      const audioRef = ref(storage, path);

      // Get the blob directly instead of the download URL
      const blob = await getBlob(audioRef);

      // Create object URL from blob
      const blobUrl = URL.createObjectURL(blob);

      // Create and trigger download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `recording_${Date.now()}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL after download starts
      setTimeout(() => URL.revokeObjectURL(blobUrl), 300);

    } catch (error) {
      console.error('Error downloading recording:', error);
      toast.error('Failed to download recording');
    }
  }

  const { showWarning, countdown, keepRecording } = useRecordingDuration(
    isRecording,
    stopRecording
  );

  const addToActionItemModal = (item: ActionItem) => {
    setActiveTabNavigation('actions');
    setShowForm(true);
    if (item.title && item.description) {
      setFormData({
        title: item.title,
        description: item.description,
        meetingId: meetingId,

      });
    }
  };

  const handleGenerateSummary = async () => {
    if (!transcript) {
      toast.error('Please record audio first');
      return;
    }

    setIsGeneratingSummary(true);
    try {
      const { summary, actionItems } = await generateSummary(transcript, selectedMeetingType, showEmojis);
      setSummary(summary);
      setActionItems(actionItems || []);
      onSummaryChange(summary, selectedMeetingType);



      await updateMeeting(meetingId, {
        summary: summary,
        meetingType: selectedMeetingType,
        recommendedActionItems: actionItems,
        source: 'record'
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

  useEffect(() => {
    return () => {
      debouncedSpeakersChange.cancel();
    };
  }, [debouncedSpeakersChange]);

  const handleMicToggle = () => {
    console.log('Mic toggle clicked');
    if (isMicMuted) {
      console.log('Unmuting mic');
      unmuteMic();
    } else {
      console.log('Muting mic');
      muteMic();
    }
  };

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
            {isRecording && (
              <button
                onClick={handleMicToggle}
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center transition-all
                  ${isMicMuted
                    ? 'bg-purple-500 hover:bg-purple-600'
                    : 'bg-blue-500 hover:bg-blue-600'
                  }
                `}
                title={isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
              >
                {isMicMuted ? (
                  <Volume2 className="w-5 h-5 text-white" />
                ) : (
                  <VolumeX className="w-5 h-5 text-white" />
                )}
              </button>
            )}
          </div>

          {(audioUrl || initialAudioUrl) && (
            <div className="flex flex-col sm:flex-row w-full space-y-4 sm:space-y-0 sm:space-x-4 items-center">
              <div className="w-full sm:flex-1">
                <AudioPlayer audioUrl={audioUrl || initialAudioUrl} />
              </div>
              <button
                onClick={downloadRecording}
                className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Download Recording
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-sm">
          <nav className="flex" aria-label="Tabs">
            {['Transcription', 'AI Summary', 'Personal Notes'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab.toLowerCase())}
                className={`
                  relative min-w-0 flex-1 overflow-hidden py-4 px-4 text-sm font-medium text-center
                  hover:bg-gray-50 focus:z-10 focus:outline-none
                  ${activeTab === tab.toLowerCase()
                    ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-50'
                    : 'text-gray-500 hover:text-gray-700'
                  }
                  ${tab === 'Transcription' ? 'rounded-l-lg' : ''}
                  ${tab === 'Personal Notes' ? 'rounded-r-lg' : ''}
                `}
              >
                <span className="relative">
                  {tab}
                  {activeTab === tab.toLowerCase() && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-500" />
                  )}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'transcription' && (
          <div className="space-y-4 bg-white rounded-lg shadow-sm border p-4">
            <TranscriptDisplay
              transcript={transcript}
              partialTranscript={partialTranscript}
              className="min-h-[600px]"
            />
          </div>
        )}

        {activeTab === 'ai summary' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex space-x-2 bg-gray-100 rounded-lg p-1">
                {['Text', 'With Emojis', 'Mind Map'].map((view) => (
                  <button
                    key={view}
                    onClick={() => {
                      if (view === 'Text') {
                        setShowEmojis(false);
                        setShowMindMap(false);
                      } else if (view === 'With Emojis') {
                        setShowEmojis(true);
                        setShowMindMap(false);
                      } else {
                        setShowMindMap(true);
                      }
                    }}
                    className={`
                      px-4 py-2 text-sm font-medium rounded-md transition-colors
                      ${(view === 'Text' && !showEmojis && !showMindMap) ||
                        (view === 'With Emojis' && showEmojis && !showMindMap) ||
                        (view === 'Mind Map' && showMindMap)
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                      }
                    `}
                  >
                    {view}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedLanguage}
                  onChange={handleLanguageChange}
                  disabled={isTranslating || !summary}
                  className="text-xs sm:text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 max-w-[120px] sm:max-w-none"
                >
                  <option value="">Original (English)</option>
                  {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
                {(transcript || summary) && (
                  <button
                    onClick={() => setShowShareDialog(true)}
                    className="inline-flex items-center px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 whitespace-nowrap min-w-0"
                  >
                    <Share2 className="w-4 h-4 mr-1.5" />
                    <span className="hidden sm:inline">Share</span>
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-4 h-[500px] flex flex-col">
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
                  <div className="flex-1 overflow-hidden">
                    {isTranslating ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                      </div>
                    ) : showMindMap ? (
                      <MindMap summary={translatedSummary || summary} meetingType={selectedMeetingType} />
                    ) : !showMindMap && window.innerWidth <= 640 ? (
                      <div className="flex flex-col h-[calc(500px-4rem)]">
                        <div className="flex justify-center space-x-2 mb-4">
                          <button
                            onClick={() => setMobileView('summary')}
                            className={`px-4 py-2 text-sm font-medium rounded-md ${mobileView === 'summary'
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-gray-100 text-gray-600'
                              }`}
                          >
                            Summary
                          </button>
                          <button
                            onClick={() => setMobileView('actions')}
                            className={`px-4 py-2 text-sm font-medium rounded-md ${mobileView === 'actions'
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-gray-100 text-gray-600'
                              }`}
                          >
                            Action Items
                          </button>
                        </div>

                        {mobileView === 'summary' ? (
                          <div className="flex-1 overflow-y-auto px-4">
                            <div className="prose prose-sm max-w-none">
                              <div dangerouslySetInnerHTML={{ __html: translatedSummary || summary }} />
                            </div>
                          </div>
                        ) : (
                          actionItems && actionItems.length > 0 && (
                            <div className="flex-1 overflow-y-auto px-4">
                              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center sticky top-0 bg-white py-2">
                                <span className="mr-2">📋</span> Recommended Action Items
                              </h3>
                              <div className="space-y-2">
                                {actionItems.map((item, index) => (
                                  <div
                                    key={index}
                                    className="bg-gray-50 p-3 rounded-md border border-gray-200 hover:border-indigo-200 transition-colors text-sm group"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <h4 className="font-medium text-gray-900 flex items-center text-sm">
                                          <span className="mr-2">•</span>
                                          {item.title}
                                        </h4>
                                        <p className="text-gray-600 mt-0.5 ml-4 text-xs leading-relaxed">
                                          {item.description}
                                        </p>
                                      </div>
                                      <button
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded-md"
                                        title="Add Action Item"
                                        onClick={() => addToActionItemModal(item)}
                                      >
                                        <Plus className="w-4 h-4 text-gray-600" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <div className="hidden sm:flex gap-6 h-[calc(500px-4rem)]">
                        <div className="flex-1 overflow-y-auto pr-6 pb-6">
                          <div className="prose prose-sm max-w-none">
                            <div dangerouslySetInnerHTML={{ __html: translatedSummary || summary }} />
                          </div>
                        </div>

                        {actionItems && actionItems.length > 0 && (
                          <div className="w-1/3 border-l pl-6 flex flex-col">
                            <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center sticky top-0 bg-white py-2">
                              <span className="mr-2">📋</span> Recommended Action Items
                            </h3>
                            <div className="space-y-2 overflow-y-auto pr-6 pb-6 scrollbar-hide">
                              {actionItems.map((item, index) => (
                                <div
                                  key={index}
                                  className="bg-gray-50 p-3 rounded-md border border-gray-200 hover:border-indigo-200 transition-colors text-sm group"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h4 className="font-medium text-gray-900 flex items-center text-sm">
                                        <span className="mr-2">•</span>
                                        {item.title}
                                      </h4>
                                      <p className="text-gray-600 mt-0.5 ml-4 text-xs leading-relaxed">
                                        {item.description}
                                      </p>
                                    </div>
                                    <button
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded-md"
                                      title="Add Action Item"
                                      onClick={() => addToActionItemModal(item)}
                                    >
                                      <Plus className="w-4 h-4 text-gray-600" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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
        )}

        {activeTab === 'personal notes' && (
          <div ref={notesRef} className="space-y-4 scroll-mt-8 bg-white rounded-lg shadow-sm border p-4">
            <NoteEditor
              content={notes}
              onChange={handleNotesChange}
              autoFocus={false}
            />
          </div>
        )}
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

      {!isMobile && (
        <DeviceSelectDialog
          isOpen={showDeviceSelect}
          onClose={() => setShowDeviceSelect(false)}
          onConfirm={handleDeviceSelect}
          audioInputDevices={audioInputDevices}
          audioOutputDevices={audioOutputDevices}
        />
      )}
    </div>
  );
}