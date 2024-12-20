import { db } from './firebase';
import { collection, getDocs, addDoc, onSnapshot, query, where, orderBy, updateDoc, serverTimestamp } from 'firebase/firestore';

// Type definitions
export interface StripeProduct {
   id: string;
   active: boolean;
   name: string;
   description: string;
   metadata: {
      firebaseRole: string;
      features?: string; // Comma-separated list of features
   };
   role: string;
   prices?: Array<{
      id: string;
      unit_amount: number;
      currency: string;
      interval: string;
   }>;
   features?: string[]; // Array of feature strings
}

// Function to list all active products
export const listProducts = async (): Promise<StripeProduct[]> => {
   try {
      const productsRef = collection(db, 'products');
      const productsSnapshot = await getDocs(productsRef);

      const products: StripeProduct[] = [];
      
      for (const doc of productsSnapshot.docs) {
         const productData = doc.data();
         if (productData.active) {
            // Get prices for this product
            const pricesRef = collection(db, 'products', doc.id, 'prices');
            const pricesSnapshot = await getDocs(pricesRef);
            const prices = pricesSnapshot.docs.map(priceDoc => ({
               id: priceDoc.id,
               ...priceDoc.data()
            }));

            // Convert metadata features string to array if it exists
            const features = productData.metadata?.features?.split(',').map((f: string) => f.trim());

            products.push({
               ...productData,
               id: doc.id,
               prices,
               features
            } as StripeProduct);
         }
      }

      return products;
   } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
   }
};

// Function to create a checkout session
export const createCheckoutSession = async (
   userId: string,
   priceId: string,
   successUrl: string,
   cancelUrl: string
) => {
   try {
      // First, check if user has any active subscriptions
      const subscriptionsRef = collection(db, 'customers', userId, 'subscriptions');
      const activeSubscriptionsQuery = query(
         subscriptionsRef, 
         where('status', 'in', ['trialing', 'active'])
      );
      const activeSubscriptions = await getDocs(activeSubscriptionsQuery);

      const checkoutSessionRef = collection(db, 'customers', userId, 'checkout_sessions');
      
      let sessionData = {
         price: priceId,
         success_url: successUrl,
         cancel_url: cancelUrl,
         mode: 'subscription',
      };

      if (!activeSubscriptions.empty) {
         const currentSubscription = activeSubscriptions.docs[0];
         const subscriptionData = currentSubscription.data();
         const currentItemId = subscriptionData.items?.[0]?.id;

         // Important: We need to specify the item ID to replace the price
         // rather than add a new one
         Object.assign(sessionData, {
            subscription: currentSubscription.id,
            subscription_items: [{
               id: currentItemId,
               price: priceId, // This replaces the old price
            }]
         });
      }

      const docRef = await addDoc(checkoutSessionRef, sessionData);

      return new Promise((resolve, reject) => {
         const unsubscribe = onSnapshot(docRef, (snap) => {
            const { error, url } = snap.data() || {};
            if (error) {
               unsubscribe();
               reject(new Error(`An error occurred: ${error.message}`));
            }
            if (url) {
               unsubscribe();
               resolve(url);
            }
         });
      });
   } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
   }
};

export const cleanupSubscriptions = async (userId: string) => {
   try {
      const subscriptionsRef = collection(db, 'customers', userId, 'subscriptions');
      const activeSubscriptionsQuery = query(
         subscriptionsRef, 
         where('status', 'in', ['trialing', 'active']),
         orderBy('created', 'desc') // Most recent first
      );
      
      const subscriptions = await getDocs(activeSubscriptionsQuery);
      
      // Keep the first (most recent) subscription and cancel others
      let isFirst = true;
      for (const doc of subscriptions.docs) {
         if (isFirst) {
            isFirst = false;
            continue;
         }
         
         // Cancel older subscriptions
         await updateDoc(doc.ref, {
            status: 'canceled',
            canceled_at: serverTimestamp()
         });
      }
   } catch (error) {
      console.error('Error cleaning up subscriptions:', error);
      throw error;
   }
};