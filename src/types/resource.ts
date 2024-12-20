import { Timestamp } from 'firebase/firestore';

export type ResourceType = 'url' | 'file';

export interface Resource {
  id: string;
  meetingId: string;
  userId: string;
  type: ResourceType;
  name: string;
  url?: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  description?: string;
  createdAt: Timestamp;
}

export interface NewResource {
  meetingId: string;
  userId: string;
  type: ResourceType;
  name: string;
  url?: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  description?: string;
}