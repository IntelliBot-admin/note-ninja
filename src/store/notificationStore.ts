import { create } from 'zustand';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Timestamp } from 'firebase/firestore';

interface Notification {
  id: string;
  message: string;
  type: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface NotificationStore {
  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;
  activeNotification: Notification | null;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  activeNotification: null,
  setNotifications: (notifications) => {
    const activeNotification = notifications.find(n => n.isActive) || null;
    set({ notifications, activeNotification });
  },
}));