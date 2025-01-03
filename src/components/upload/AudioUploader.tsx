import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileAudio, Loader2, Plus } from 'lucide-react';
import { transcribeAudio } from '../../services/assemblyAI';
import { generateSummary } from '../../utils/aiSummary';
import { MeetingType, meetingTypes } from '../../types/meeting';
import { TranscriptDisplay } from '../recorder/TranscriptDisplay';
import AudioPlayer from '../recorder/AudioPlayer';
import MindMap from '../mindmap/MindMap';
import ShareDialog from '../share/ShareDialog';
import { Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { transcribeAudioFromYoutube, uploadAudioFile } from '../../utils/audioHelpers';
import NoteEditor from '../notes/NoteEditor';
import { Speaker } from '../../types/transcription';
import { useSubscription } from '../../hooks/useSubscription';
import { useActionItemStore } from '../../store/actionItemStore';
import { useNavigationStore } from '../../store/navigationStore';

interface AudioUploaderProps {
  meetingId: string;
  onTranscriptChange: (transcript: string) => void;
  onAudioUrlUpdate: (url: string) => Promise<void>;
  onSummaryChange: (summary: string, type: MeetingType, actionItems: ActionItem[]) => void;
  onSpeakersChange: (speakers: Speaker[]) => void;
  onNotesChange?: (notes: string) => void;
  youtubeLink?: string;
  onYoutubeLinkChange?: (link: string) => void;
  initialTranscript?: string;
  initialAudioUrl?: string;
  initialSummary?: string;
  initialMeetingType?: MeetingType;
  initialSpeakers?: Speaker[];
  personalNotes?: string;
  initialRecommendedActionItems?: ActionItem[];
}

interface ActionItem {
  title: string;
  description: string;
}

export default function AudioUploader({
  meetingId,
  onTranscriptChange,
  onAudioUrlUpdate,
  onSummaryChange,
  onSpeakersChange,
  onNotesChange,
  youtubeLink: initialYoutubeLink = '',
  onYoutubeLinkChange,
  initialTranscript = '',
  initialAudioUrl = '',
  initialSummary = '',
  initialMeetingType = 'general',
  initialSpeakers = [],
  personalNotes: initialPersonalNotes = '',
  initialRecommendedActionItems = [],
}: AudioUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>(initialAudioUrl);
  const [transcript, setTranscript] = useState<string>(initialTranscript);
  const [summary, setSummary] = useState<string>(initialSummary);
  const [selectedMeetingType, setSelectedMeetingType] = useState<MeetingType>(initialMeetingType);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [showEmojis, setShowEmojis] = useState(true);
  const [showMindMap, setShowMindMap] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('transcription');
  const [speakers, setSpeakers] = useState<Speaker[]>(initialSpeakers);
  const [youtubeLink, setYoutubeLink] = useState<string>(initialYoutubeLink);
  const [MAX_FILE_SIZE, setMAX_FILE_SIZE] = useState(5 * 1024 * 1024);
  const [personalNotes, setPersonalNotes] = useState(initialPersonalNotes);
  const { planName } = useSubscription();
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>(initialRecommendedActionItems);
  const { setShowForm, setFormData } = useActionItemStore();
  const { setActiveTab: setActiveTabNavigation } = useNavigationStore();

  const extractYoutubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  useEffect(() => {
    setMAX_FILE_SIZE(planName === 'Free' ? 5 * 1024 * 1024 : 150 * 1024 * 1024);
  }, [planName]);

  useEffect(() => {
    const videoId = youtubeLink ? extractYoutubeId(youtubeLink) : null;
    setYoutubeVideoId(videoId);
  }, [youtubeLink]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const audioFile = acceptedFiles[0];
    console.log("audioFile.size", audioFile.size);
    console.log("MAX_FILE_SIZE", MAX_FILE_SIZE);

    if (!audioFile) return;

    if (audioFile.type !== 'audio/mpeg' && !audioFile.type.includes('audio/mp3')) {
      toast.error('Please upload an MP3 file');
      return;
    }
    
    if (audioFile.size > MAX_FILE_SIZE) {
      toast.error(`File size exceeds ${formatFileSize(MAX_FILE_SIZE)} limit`);
      return;
    }

    setFile(audioFile);
    const tempUrl = URL.createObjectURL(audioFile);
    setAudioUrl(tempUrl);

    try {
      setIsProcessing(true);
      setProcessingStatus('Uploading audio file...');

      const audioUrl = await uploadAudioFile(meetingId, audioFile);
      await onAudioUrlUpdate(audioUrl);

      setProcessingStatus('Transcribing audio...');
      const result = await transcribeAudio(audioUrl, meetingId);
      setTranscript(result.text);
      onTranscriptChange(result.text);
      console.log(result.utterances);
      if (result.utterances) {
        setSpeakers(result.utterances);
        await onSpeakersChange(result.utterances);
      }

      setProcessingStatus('');
      toast.success('Audio transcribed successfully');
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error('Failed to transcribe audio');
      setProcessingStatus('Transcription failed');
    } finally {
      setIsProcessing(false);
    }
  }, [onAudioUrlUpdate, onTranscriptChange, MAX_FILE_SIZE]);

  const addToActionItemModal = (item: ActionItem) => {
    setActiveTabNavigation('actions');
    setShowForm(true);
    if(item.title && item.description) {
      setFormData({
        title: item.title,
        description: item.description
      });
    }
  };

  const handleGenerateSummary = async () => {
    if (!transcript) {
      toast.error('Please upload and transcribe an audio file first');
      return;
    }

    setIsGeneratingSummary(true);
    try {
      const { summary, actionItems } = await generateSummary(transcript, selectedMeetingType, showEmojis);
      setSummary(summary);
      setActionItems(actionItems || []);
      onSummaryChange(summary, selectedMeetingType, actionItems || []);
      toast.success('Summary generated successfully');
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('Failed to generate summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)}MB`;
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/mpeg': ['.mp3'],
      'audio/mp3': ['.mp3']
    },
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
    disabled: isProcessing
  });

  const handleYoutubeLinkSubmit = useCallback(async () => {
    if (!youtubeLink) {
      toast.error('Please enter a valid YouTube link');
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingStatus('Processing YouTube link...');

      const result = await transcribeAudioFromYoutube(youtubeLink);

      setTranscript(result.text);
      onTranscriptChange(result.text);
      if (result.utterances) {
        setSpeakers(result.utterances);
        await onSpeakersChange(result.utterances);
      }

      setProcessingStatus('');
      toast.success('Audio transcribed successfully');
    } catch (error) {
      console.error('Error processing YouTube link:', error);
      toast.error('Failed to process YouTube link');
      setProcessingStatus('Processing failed');
    } finally {
      setIsProcessing(false);
    }
  }, [youtubeLink, onTranscriptChange, onSpeakersChange, speakers]);

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
            transition-colors duration-200 max-w-2xl mx-auto relative
            ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}
            ${isProcessing ? 'cursor-not-allowed opacity-75' : ''}
          `}
        >
          <input {...getInputProps()} disabled={isProcessing} />

          {isProcessing ? (
            <div className="space-y-3">
              <Loader2 className="w-10 h-10 mx-auto text-indigo-500 animate-spin" />
              <p className="text-indigo-600 font-medium">{processingStatus}</p>
              <p className="text-sm text-gray-500">Please wait while we process your audio file...</p>
            </div>
          ) : (
            <>
              <FileAudio className="w-10 h-10 mx-auto text-gray-400 mb-3" />
              {isDragActive ? (
                <p className="text-indigo-600">Drop the MP3 file here...</p>
              ) : (
                <div className="space-y-1">
                  <p className="text-gray-600">Drag and drop an MP3 file here, or click to select</p>
                  <p className="text-sm text-gray-500">Maximum file size: {formatFileSize(MAX_FILE_SIZE)}</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="flex-1 h-px bg-gray-200"></div>
          <span className="text-sm font-medium text-gray-500">or</span>
          <div className="flex-1 h-px bg-gray-200"></div>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              YouTube Video URL
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={youtubeLink}
                onChange={(e) => { 
                  const newValue = e.target.value;
                  setYoutubeLink(newValue);
                  onYoutubeLinkChange?.(newValue);
                }}
                placeholder="Paste YouTube link here"
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              <button
                onClick={handleYoutubeLinkSubmit}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Submit YouTube Link'
                )}
              </button>
            </div>
            {youtubeVideoId && (
              <div className="mt-4 aspect-video w-full max-w-md mx-auto rounded-lg overflow-hidden shadow-sm">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${youtubeVideoId}`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            )}
          </div>
        </div>

        {audioUrl && (
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <AudioPlayer audioUrl={audioUrl} />
          </div>
        )}
      </div>

      {/* Rest of the component remains the same */}
      <div className="space-y-4">
        {/* Tabs Navigation */}
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

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          {activeTab === 'transcription' && (
            <TranscriptDisplay
              transcript={transcript}
              speakers={speakers}
              onUpdateSpeaker={(oldName, newName) => {
                const updatedSpeakers = speakers.map(speaker => ({
                  ...speaker,
                  speaker: speaker.speaker === oldName ? newName : speaker.speaker
                }));
                setSpeakers(updatedSpeakers);
                onSpeakersChange(updatedSpeakers);
              }}
            />
          )}

          {activeTab === 'ai summary' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
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
                </div>
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

              <div className="h-[500px] flex flex-col">
                {summary ? (
                  <>
                    <div className="mb-4 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 items-start sm:items-center">
                      <select
                        value={selectedMeetingType}
                        onChange={(e) => {
                          const newType = e.target.value as MeetingType;
                          setSelectedMeetingType(newType);
                          onSummaryChange(summary, newType, actionItems || []);
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
                      {showMindMap ? (
                        <MindMap summary={summary} meetingType={selectedMeetingType} />
                      ) : (
                        <div className="flex gap-6 h-[calc(500px-4rem)]">
                          <div className="flex-1 overflow-y-auto pr-6">
                            <div className="prose prose-sm max-w-none">
                              <div dangerouslySetInnerHTML={{ __html: summary }} />
                            </div>
                          </div>
                          
                          {!showMindMap && actionItems && actionItems.length > 0 && (
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
                      {isProcessing ? 'Processing audio...' : transcript ? 'Click Generate AI Summary to continue' : 'Upload an MP3 file to get started'}
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
            <NoteEditor
              content={personalNotes}
              onChange={(notes) => {
                setPersonalNotes(notes);
                onNotesChange?.(notes);
              }}
              autoFocus={false}
            />
          )}
        </div>
      </div>

      <ShareDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        transcript={transcript}
        summary={summary}
      />
    </div>
  );
}