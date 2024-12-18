import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileAudio, Loader2 } from 'lucide-react';
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
import { Speaker } from '../../types/transcription';

interface AudioUploaderProps {
  meetingId: string;
  onTranscriptChange: (transcript: string) => void;
  onAudioUrlUpdate: (url: string) => Promise<void>;
  onSummaryChange: (summary: string, type: MeetingType) => void;
  onSpeakersChange: (speakers: Speaker[]) => void;
  initialTranscript?: string;
  initialAudioUrl?: string;
  initialSummary?: string;
  initialMeetingType?: MeetingType;
  initialSpeakers?: Speaker[];
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit

export default function AudioUploader({
  meetingId,
  onTranscriptChange,
  onAudioUrlUpdate,
  onSummaryChange,
  onSpeakersChange,
  initialTranscript = '',
  initialAudioUrl = '',
  initialSummary = '',
  initialMeetingType = 'general',
  initialSpeakers = []
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
  const [speakers, setSpeakers] = useState<Speaker[]>(initialSpeakers);
  const [youtubeLink, setYoutubeLink] = useState<string>('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const audioFile = acceptedFiles[0];
    if (!audioFile) return;

    if (audioFile.type !== 'audio/mpeg' && !audioFile.type.includes('audio/mp3')) {
      toast.error('Please upload an MP3 file');
      return;
    }

    if (audioFile.size > MAX_FILE_SIZE) {
      toast.error('File size exceeds 50MB limit');
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
  }, [onAudioUrlUpdate, onTranscriptChange]);

  const handleGenerateSummary = async () => {
    if (!transcript) {
      toast.error('Please upload and transcribe an audio file first');
      return;
    }

    setIsGeneratingSummary(true);
    try {
      const generatedSummary = await generateSummary(transcript, selectedMeetingType, showEmojis);
      setSummary(generatedSummary);
      onSummaryChange(generatedSummary, selectedMeetingType);
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
                onChange={(e) => setYoutubeLink(e.target.value)}
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
          </div>
        </div>

        {audioUrl && (
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <AudioPlayer audioUrl={audioUrl} />
          </div>
        )}
      </div>

      {/* Rest of the component remains the same */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Transcription</h2>
          <TranscriptDisplay transcript={transcript} speakers={speakers} />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">AI Summary</h2>
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
                  {showMindMap ? (
                    <MindMap summary={summary} meetingType={selectedMeetingType} />
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: summary }} />
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