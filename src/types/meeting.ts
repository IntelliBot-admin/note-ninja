import { Timestamp } from 'firebase/firestore';
import { Speaker } from './transcription';

export type MeetingType = 
  | 'general'
  | 'sales'
  | 'product'
  | 'client'
  | 'kickoff'
  | 'standup'
  | 'brainstorm'
  | 'financial'
  | 'performance'
  | 'strategic'
  | '360-summary'
  | 'quiz-generator'
  | 'doctors-visit'
  | 'interview'
  | 'board-meeting'
  | 'investor-earnings-call'
  | 'vehicle-repair'
  | 'crm';

export type ContentSource = 'record' | 'upload';

export interface Meeting {
  id: string;
  title: string;
  date: string;
  participants: Array<{
    email: string;
    role: string;
  }>;
  content: string;
  userId: string;
  createDate: Timestamp;
  updatedAt: Timestamp;
  source?: ContentSource;
  personalNotes?: string;
  externalEventId?: string;
  startTime?: Date;
  endTime?: Date;
  
  // Record Meeting content
  recordTranscription?: string;
  recordAudioUrl?: string;
  recordSummary?: string;
  recordMeetingType?: MeetingType;
  recordSpeakers?: Speaker[];
  // MP3 Upload content
  uploadTranscription?: string;
  uploadAudioUrl?: string;
  uploadSummary?: string;
  uploadMeetingType?: MeetingType;
 youtubeLink?: string;
}

export const meetingTypes: Record<MeetingType, string> = {
  general: 'General Meeting',
  sales: 'Sales Meeting',
  product: 'Product Meeting',
  client: 'Client Meeting',
  kickoff: 'Project Kickoff',
  standup: 'Daily Standup',
  brainstorm: 'Brainstorming Session',
  financial: 'Financial Review',
  performance: 'Performance Review',
  strategic: 'Strategic Planning',
  '360-summary': '360° Content Summary',
  'quiz-generator': 'Interactive Quiz Generator',
  'doctors-visit': 'Doctor\'s Visit',
  'interview': 'Interview',
  'board-meeting': 'Board Meeting',
  'investor-earnings-call': 'Investor/Earnings Call',
  'vehicle-repair': 'Vehicle Repair',
  'crm': 'CRM Summary',
};