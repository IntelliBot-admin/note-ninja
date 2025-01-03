import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import { planMap } from '../lib/stripe';

export interface Subscription {
   userId: string;
   stripeSubscriptionId: string;
   status: 'incomplete' | 'active' | 'canceled' | 'trialing';
   planId: string;
   currentPeriodStart: Date;
   currentPeriodEnd: Date;
   cancelAtPeriodEnd: boolean;
   createdAt: Date;
   updatedAt: Date;
}

export function useSubscription() {
   const { user } = useAuthStore();
   const [subscription, setSubscription] = useState<Subscription | null>(null);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      if (!user?.uid) {
         setSubscription(null);
         setLoading(false);
         return;
      }

      // Query the top-level subscriptions collection
      const subscriptionsRef = collection(db, 'subscriptions');
      const q = query(
         subscriptionsRef,
         where('userId', '==', user.uid),
         where('status', 'in', ['active', 'trialing'])
      );

      const unsubscribe = onSnapshot(q,
         (snapshot) => {
            const doc = snapshot.docs[0];
            // Convert Firestore Timestamp to Date
            if (doc) {
               const data = doc.data();
               console.log(data, 'data');
               
               setSubscription({
                  ...data,
                  currentPeriodStart: data.currentPeriodStart.toDate(),
                  currentPeriodEnd: data.currentPeriodEnd.toDate(),
                  createdAt: data.createdAt.toDate(),
                  updatedAt: data.updatedAt.toDate(),
               } as Subscription);
            } else {
               setSubscription(null);
            }
            setLoading(false);
         },
         (error) => {
            console.error('Error fetching subscription:', error);
            setSubscription(null);
            setLoading(false);
         }
      );

      return () => unsubscribe();
   }, [user?.uid]);

   return {
      subscription,
      loading,
      isActive: subscription?.status === 'active' || subscription?.status === 'trialing',
      isTrialing: subscription?.status === 'trialing',
      trialEndsAt: subscription?.status === 'trialing' ? subscription?.currentPeriodEnd : null,
      planName: subscription ? 
         (Object.entries(planMap).find(([_, id]) => id === subscription.planId)?.[0] || 'Unknown') : 
         'Free',
   };
}