import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

interface ConnectedCalendar {
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
            const connectedProviders: ConnectedCalendar[] = [];

            if (userData?.isGoogleConnected) {
               connectedProviders.push({ type: 'google', email: userData.email || '' });
            }
            if (userData?.isMicrosoftConnected) {
               connectedProviders.push({ type: 'microsoft', email: userData.email || '' });
            }

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