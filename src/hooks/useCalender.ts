import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

interface CalendarConnection {
   provider: 'google' | 'microsoft';
   email: string;
   isConnected: boolean;
   lastSynced: number;
   tokenExpiry?: number;
}

export interface ConnectedCalendar {
   id: string;
   type: 'google' | 'microsoft';
   email: string;
}

export function useConnectedCalendars(userId: string | undefined) {
   const [connectedCalendars, setConnectedCalendars] = useState<ConnectedCalendar[]>([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      if (!userId) {
         setLoading(false);
         return;
      }

      const unsubscribe = onSnapshot(doc(db, 'users', userId), (userDoc) => {
         try {
            const userData = userDoc.data();
            const connections = userData?.calendarConnections || {};

            const connectedProviders: ConnectedCalendar[] = Object.entries(connections)
               .filter((entry): entry is [string, CalendarConnection] => {
                  const [_, connection] = entry as [string, CalendarConnection];
                  return connection && connection.isConnected;
               })
               .map(([id, connection]) => ({
                  id,
                  type: connection.provider,
                  email: connection.email
               }));

            setConnectedCalendars(connectedProviders);
         } catch (error) {
            console.error('Error processing calendar data:', error);
            toast.error('Failed to load connected calendars');
         } finally {
            setLoading(false);
         }
      }, (error) => {
         console.error('Realtime subscription error:', error);
         toast.error('Failed to subscribe to calendar updates');
         setLoading(false);
      });

      return () => unsubscribe();
   }, [userId]);

   return { connectedCalendars, loading };
}