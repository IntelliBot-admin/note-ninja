import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { useMeetingStore } from '../store/meetingStore';
import { useCategories } from '../hooks/useCategories';
import { Mic, Link2, CheckSquare, Edit2, Check, X, Tag, Upload } from 'lucide-react';
import AudioRecorder from '../components/recorder/AudioRecorder';
import AudioUploader from '../components/upload/AudioUploader';
import ResourceManager from '../components/resources/ResourceManager';
import ActionItemList from '../components/actionItems/ActionItemList';
import { Meeting, MeetingType } from '../types/meeting';
import toast from 'react-hot-toast';
import { useRecordingStore } from '../store/recordingStore';
import { Speaker } from '../types/transcription';
import { useNavigationStore } from '../store/navigationStore';
import { ActionItem } from '../types/actionItem';

const meetingTools = [
  { icon: Mic, label: 'Record', shortLabel: 'Record', action: 'record' },
  { icon: Upload, label: 'Media Uploader', shortLabel: 'Upload', action: 'upload' },
  { icon: Link2, label: 'Files & URLs', shortLabel: 'Files', action: 'files' },
  { icon: CheckSquare, label: 'Action Items', shortLabel: 'Tasks', action: 'actions' }
];

export default function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentMeeting, setCurrentMeeting, updateMeeting } = useMeetingStore();
  const { categories } = useCategories();
  // const [activeTab, setActiveTab] = useState<string>('record');
  const { activeTab, setActiveTab } = useNavigationStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  // const [isRecording, setIsRecording] = useState(false);
  const { isRecording, setIsRecording } = useRecordingStore();
  const [youtubeLink, setYoutubeLink] = useState<string>('');

  // Record Meeting state
  const [recordTranscript, setRecordTranscript] = useState('');
  const [recordAudioUrl, setRecordAudioUrl] = useState('');
  const [recordSummary, setRecordSummary] = useState('');
  const [recordMeetingType, setRecordMeetingType] = useState<MeetingType>('general');
  const [recordSpeakers, setRecordSpeakers] = useState<Speaker[]>([]);
  const [personalNotes, setPersonalNotes] = useState('');
  const [recordRecommendedActionItems, setRecordRecommendedActionItems] = useState<ActionItem[]>([]);
  // MP3 Upload state
  const [uploadTranscript, setUploadTranscript] = useState('');
  const [uploadAudioUrl, setUploadAudioUrl] = useState('');
  const [uploadSummary, setUploadSummary] = useState('');
  const [uploadMeetingType, setUploadMeetingType] = useState<MeetingType>('general');
  const [uploadRecommendedActionItems, setUploadRecommendedActionItems] = useState<ActionItem[]>([]);
  const [uploadSpeakers, setUploadSpeakers] = useState<Speaker[]>([]);
  useEffect(() => {
    if (!id || !user) return;

    const unsubscribe = onSnapshot(
      doc(db, 'meetings', id),
      (doc) => {
        if (doc.exists()) {
          const meetingData = { id: doc.id, ...doc.data() } as Meeting;
          setCurrentMeeting(meetingData);
          setEditedTitle(meetingData.title);
          setSelectedCategory(meetingData.categoryId || '');
          setPersonalNotes(meetingData.personalNotes || '');

          // Set Record Meeting content
          setRecordTranscript(meetingData.recordTranscription || '');
          setRecordAudioUrl(meetingData.recordAudioUrl || '');
          setRecordSummary(meetingData.recordSummary || '');
          setRecordMeetingType(meetingData.recordMeetingType || 'general');
          setRecordSpeakers(meetingData.recordSpeakers || []);
          setRecordRecommendedActionItems(meetingData.recordRecommendedActionItems || []);
          // Set MP3 Upload content
          setUploadTranscript(meetingData.uploadTranscription || '');
          setUploadAudioUrl(meetingData.uploadAudioUrl || '');
          setUploadSummary(meetingData.uploadSummary || '');
          setUploadMeetingType(meetingData.uploadMeetingType || 'general');
          setUploadSpeakers(meetingData.uploadSpeakers || []);
          setUploadRecommendedActionItems(meetingData.uploadRecommendedActionItems || []);
          setYoutubeLink(meetingData.youtubeLink || '');
        } else {
          navigate('/');
        }
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching meeting:', error);
        toast.error('Failed to load meeting');
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
      if (window.location.pathname === '/') {
        setCurrentMeeting(null);
      }
    };
  }, [id, navigate, setCurrentMeeting, user]);

  const handleTabChange = (newTab: string) => {
    if (isRecording) {
      toast.error('Please stop recording before switching tabs');
      return;
    }
    setActiveTab(newTab);
  };

  const handleTitleSave = async () => {
    if (!id || !editedTitle.trim()) return;
    try {
      await updateMeeting(id, { title: editedTitle.trim() });
      setIsEditingTitle(false);
      toast.success('Title updated successfully');
    } catch (error) {
      console.error('Error updating title:', error);
      toast.error('Failed to update title');
    }
  };

  const handleCategorySave = async () => {
    if (!id) return;
    try {
      await updateMeeting(id, { categoryId: selectedCategory });
      setIsEditingCategory(false);
      toast.success('Category updated successfully');
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Failed to update category');
    }
  };

  const handleNotesChange = async (notes: string) => {
    setPersonalNotes(notes);
  };

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.color || '#6366F1';
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      );
    }

    switch (activeTab) {
      case 'record':
        return (
          <AudioRecorder
            meetingId={id!}
            onTranscriptChange={(transcript) =>
              updateMeeting(id!, { transcription: transcript, source: 'record' })}
            onAudioUrlUpdate={(url) =>
              updateMeeting(id!, { audioUrl: url, source: 'record' })}
            onSummaryChange={(summary, type) =>
              updateMeeting(id!, { summary, meetingType: type, source: 'record' })}
            onSpeakersChange={(speakers) =>
              updateMeeting(id!, { speakers, source: 'record' })}
            onRecordingStateChange={setIsRecording}
            onNotesChange={handleNotesChange}
            initialTranscript={recordTranscript}
            initialAudioUrl={recordAudioUrl}
            initialSummary={recordSummary}
            initialMeetingType={recordMeetingType}
            initialSpeakers={recordSpeakers}
            initialNotes={personalNotes}
            initialRecommendedActionItems={recordRecommendedActionItems}
          />
        );
      case 'upload':
        return (
          <AudioUploader
            meetingId={id!}
            onTranscriptChange={(transcript) =>
              updateMeeting(id!, { transcription: transcript, source: 'upload' })}
            onAudioUrlUpdate={(url) =>
              updateMeeting(id!, { audioUrl: url, source: 'upload' })}
            onSummaryChange={(summary, type, actionItems) =>
              updateMeeting(id!, { summary  , meetingType: type, source: 'upload', recommendedActionItems: actionItems })}
            onSpeakersChange={(speakers) =>
              updateMeeting(id!, { speakers, source: 'upload' })}
            youtubeLink={youtubeLink}
            onYoutubeLinkChange={(link) => {
              setYoutubeLink(link);
              updateMeeting(id!, { youtubeLink: link });
            }}
            initialTranscript={uploadTranscript}
            initialAudioUrl={uploadAudioUrl}
            initialSummary={uploadSummary}
            initialMeetingType={uploadMeetingType}
            initialSpeakers={uploadSpeakers}
            initialRecommendedActionItems={uploadRecommendedActionItems}
          />
        );
      case 'files':
        return (
          <ResourceManager
            meetingId={id!}
            userId={user?.uid!}
          />
        );
      case 'actions':
        return (
          <ActionItemList
            meetingId={id!}
          />
        );
      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-medium text-gray-900">Please sign in to view this meeting</h2>
          <button
            onClick={() => navigate('/auth')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Meeting Title and Category */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between">
            {isEditingTitle ? (
              <div className="flex items-center space-x-2 flex-1 max-w-2xl">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="flex-1 rounded-md border-gray-300 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xl font-bold bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Enter meeting title"
                  autoFocus
                />
                <button
                  onClick={handleTitleSave}
                  className="p-2 text-green-600 hover:text-green-700"
                  disabled={!editedTitle.trim()}
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setIsEditingTitle(false);
                    setEditedTitle(currentMeeting?.title || '');
                  }}
                  className="p-2 text-gray-400 hover:text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {currentMeeting?.title || 'Untitled Meeting'}
                </h1>
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Edit title"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {isEditingCategory ? (
              <div className="flex items-center space-x-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">No category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleCategorySave}
                  className="p-2 text-green-600 hover:text-green-700"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setIsEditingCategory(false);
                    setSelectedCategory(currentMeeting?.categoryId || '');
                  }}
                  className="p-2 text-gray-400 hover:text-gray-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                {selectedCategory ? (
                  <div
                    className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium"
                    style={{
                      backgroundColor: `${getCategoryColor(selectedCategory)}20`,
                      color: getCategoryColor(selectedCategory)
                    }}
                  >
                    <Tag className="w-4 h-4 mr-1" />
                    {categories.find(cat => cat.id === selectedCategory)?.name || 'Uncategorized'}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No category</div>
                )}
                <button
                  onClick={() => setIsEditingCategory(true)}
                  className="p-1 text-gray-400 hover:text-indigo-600 rounded-full hover:bg-gray-100"
                  title="Edit category"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tools Navigation */}
        <div className="mb-8">
          <div className="flex justify-center">
            <div className="inline-flex flex-wrap justify-center gap-2 sm:gap-4 px-2 py-1 bg-gray-100 rounded-lg">
              {meetingTools.map((tool) => {
                const Icon = tool.icon;
                const isDisabled = isRecording && tool.action !== 'record';
                return (
                  <button
                    key={tool.action}
                    onClick={() => handleTabChange(tool.action)}
                    disabled={isDisabled}
                    className={`
                      flex items-center px-3 py-2 rounded-lg transition-colors whitespace-nowrap
                      ${activeTab === tool.action
                        ? 'bg-indigo-100 text-indigo-700'
                        : isDisabled
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-600 hover:bg-gray-200'
                      }
                    `}
                    title={isDisabled ? 'Stop recording to switch tabs' : tool.label}
                  >
                    <Icon className="w-5 h-5 sm:mr-2" />
                    <span className="hidden sm:inline">{tool.label}</span>
                    <span className="inline sm:hidden">{tool.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}