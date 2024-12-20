import { create } from 'zustand';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  Timestamp,
  DocumentReference,
  Query,
  query,
  where,
  getDoc
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import { Meeting, MeetingType, ContentSource } from '../types/meeting';
import { Speaker } from '../types/transcription';
import toast from 'react-hot-toast';

interface MeetingStore {
  meetings: Meeting[];
  currentMeeting: Meeting | null;
  setMeetings: (meetings: Meeting[]) => void;
  setCurrentMeeting: (meeting: Meeting | null) => void;
  addMeeting: (meeting: Omit<Meeting, 'id' | 'createDate' | 'updatedAt'>) => Promise<DocumentReference>;
  updateMeeting: (id: string, updates: Partial<Meeting>) => Promise<void>;
  deleteMeeting: (id: string) => Promise<void>;
  getMeetingsQuery: (userId: string) => Query;
  saveSpeakerData: (meetingId: string, speakers: Speaker[]) => Promise<void>;
  getSpeakerData: (meetingId: string) => Promise<Speaker[] | null>;
}

export const useMeetingStore = create<MeetingStore>((set) => ({
  meetings: [],
  currentMeeting: null,
  setMeetings: (meetings) => set({ meetings }),
  setCurrentMeeting: (meeting) => set({ currentMeeting: meeting }),

  addMeeting: async (meeting) => {
    try {
      if (!meeting.userId) {
        throw new Error('User ID is required');
      }

      const docRef = await addDoc(collection(db, COLLECTIONS.MEETINGS), {
        ...meeting,
        createDate: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      toast.success('Meeting created successfully');
      return docRef;
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast.error('Failed to create meeting');
      throw error;
    }
  },

  updateMeeting: async (id, updates) => {
    try {
      if (!id) {
        throw new Error('Meeting ID is required');
      }

      const docRef = doc(db, COLLECTIONS.MEETINGS, id);
      const currentDoc = await getDoc(docRef);
      
      if (!currentDoc.exists()) {
        throw new Error('Meeting not found');
      }

      const currentData = currentDoc.data();
      const source = updates.source || currentData?.source;

      // Handle transcription updates based on source
      let transcriptionUpdates = {};
      if (updates.transcription !== undefined) {
        if (source === 'record') {
          transcriptionUpdates = { recordTranscription: updates.transcription };
        } else if (source === 'upload') {
          transcriptionUpdates = { uploadTranscription: updates.transcription };
        }
      }

      // Handle audio URL updates based on source
      let audioUrlUpdates = {};
      if (updates.audioUrl !== undefined) {
        if (source === 'record') {
          audioUrlUpdates = { recordAudioUrl: updates.audioUrl };
        } else if (source === 'upload') {
          audioUrlUpdates = { uploadAudioUrl: updates.audioUrl };
        }
      }

      //handle speakers
      let speakersUpdates = {};
      if (updates.speakers !== undefined) {
        if (source === 'record') {
          console.log('recordSpeakers', updates.speakers);
          speakersUpdates = { recordSpeakers: updates.speakers };
        } else if (source === 'upload') {
          console.log('uploadSpeakers', updates.speakers);
          speakersUpdates = { uploadSpeakers: updates.speakers };
        }
      }

      // Handle summary updates based on source
      let summaryUpdates = {};
      if (updates.summary !== undefined) {
        if (source === 'record') {
          summaryUpdates = { 
            recordSummary: updates.summary,
            recordMeetingType: updates.meetingType 
          };
        } else if (source === 'upload') {
          summaryUpdates = { 
            uploadSummary: updates.summary,
            uploadMeetingType: updates.meetingType 
          };
        }
      }

      // Remove any undefined values to prevent Firestore errors
      const cleanedUpdates = Object.entries({
        ...updates,
        ...transcriptionUpdates,
        ...audioUrlUpdates,
        ...summaryUpdates,
        ...speakersUpdates,
        source,
        updatedAt: Timestamp.now()
      }).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);

      await updateDoc(docRef, cleanedUpdates);

      // Update current meeting in state if it matches
      set(state => ({
        currentMeeting: state.currentMeeting?.id === id
          ? { ...state.currentMeeting, ...cleanedUpdates }
          : state.currentMeeting
      }));

    } catch (error) {
      console.error('Error updating meeting:', error);
      toast.error('Failed to update meeting');
      throw error;
    }
  },

  deleteMeeting: async (id) => {
    try {
      if (!id) {
        throw new Error('Meeting ID is required');
      }

      const docRef = doc(db, COLLECTIONS.MEETINGS, id);
      await deleteDoc(docRef);
      toast.success('Meeting deleted successfully');
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast.error('Failed to delete meeting');
      throw error;
    }
  },

  getMeetingsQuery: (userId: string) => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    return query(
      collection(db, COLLECTIONS.MEETINGS),
      where('userId', '==', userId)
    );
  },

  saveSpeakerData: async (meetingId, speakers) => {
    try {
      if (!meetingId) {
        throw new Error('Meeting ID is required');
      }

      if (!Array.isArray(speakers)) {
        throw new Error('Invalid speakers data');
      }

      const docRef = doc(collection(db, COLLECTIONS.MEETINGS, meetingId, 'metadata'), 'speakers');
      await updateDoc(docRef, {
        speakers,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error saving speaker data:', error);
      throw error;
    }
  },

  getSpeakerData: async (meetingId) => {
    try {
      if (!meetingId) {
        throw new Error('Meeting ID is required');
      }

      const docRef = doc(collection(db, COLLECTIONS.MEETINGS, meetingId, 'metadata'), 'speakers');
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return docSnap.data()?.speakers || null;
    } catch (error) {
      console.error('Error getting speaker data:', error);
      return null;
    }
  }
}));