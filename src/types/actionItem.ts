import { Timestamp } from 'firebase/firestore';

export type Priority = 'low' | 'medium' | 'high';
export type Status = 'pending' | 'completed' | 'cancelled';

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  title: string;
  photoUrl?: string;
}

export interface ActionItem {
  id: string;
  meetingId: string;
  userId: string;
  title: string;
  description: string;
  priority: Priority;
  dueDate: Date | Timestamp;
  status: Status;
  contacts: Contact[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const priorityColors = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800'
};