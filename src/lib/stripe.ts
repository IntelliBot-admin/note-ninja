import { loadStripe } from '@stripe/stripe-js';
import { serverFetch, serverPost } from '../utils/api';
import { db } from './firebase';
import { getDoc, doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export const planMap = {
   'entry': 'prod_RVls54uz7O7MQO',
   'pro': 'prod_RQVH6FHldRKLAX',
   'enterprise': 'enterprise_plan_id'
}

// Type definitions
export interface StripePrice {
   id: string;
   unit_amount: number;
   product: string;
   nickname?: string;
   recurring: {
      interval: string;
      interval_count: number;
   };
}

export interface StripeProduct {
   id: string;
   object: 'price';
   active: boolean;
   currency: string;
   unit_amount: number;
   recurring: {
      interval: string;
      interval_count: number;
   };
   product: {
      id: string;
      name: string;
      description: string;
      metadata: {
         firebaseRole: string;
      };
   };
}

// Function to list all active products
export const listProducts = async (): Promise<StripeProduct[]> => {
   try {

      const response = await serverFetch('/products');

      return response.prices;
   } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
   }
};

export async function getPriceWithProduct(priceId: string) {
   try {
      const response = await serverFetch(`/price/${priceId}`);
      console.log(response, 'response getPriceWithProduct');

      return response.price;

   } catch (error) {
      console.error('Error fetching price details:', error);
      throw error;
   }
}

export const createAndRedirectToPortalSession = async (userId: string) => {
   try {
      // Get user data from Firestore
      const userDoc = doc(db, 'users', userId);
      const userSnap = await getDoc(userDoc);

      if (!userSnap.exists()) {
         throw new Error('User not found');
      }

      const userData = userSnap.data();
      
      const portalSession = await serverPost('/create-portal-session', {
         customerId: userData.customerId
      });
      
      // Redirect to portal session
      window.location.href = portalSession.session.url;
   } catch (error) {
      console.error('Error creating portal session:', error);
      toast.error('Failed to access billing portal');
      throw error;
   }
}

export const downgradeToFreePlan = async (userId: string) => {
   const result = await serverPost('/cancel-subscription', {
      userId: userId
   });
   return result;
}

// Function to create a checkout session
export const createCheckoutSession = async (
   userId: string,
   priceId: string
) => {
   try {
      const userDoc = doc(db, 'users', userId);
      const userSnap = await getDoc(userDoc);

      if (!userSnap.exists()) {
         throw new Error('User not found');
      }

      const userData = userSnap.data();
      const stripe = await stripePromise;

      if (!userData.customerId) {
         const customer = await serverPost('/create-customer', {
            uid: userId,
            email: userData.email
         });
         userData.customerId = customer.customerId;
         
         // Update Firestore with the new customerId
         await updateDoc(userDoc, {
            customerId: customer.customerId,
            plan: 'free',
            subscriptionId: null
         });
      }

      // Handle existing subscribers
      if (userData.subscriptionId) {
         const result = await serverPost('/update-subscription', {
            customerId: userData.customerId,
            newPriceId: priceId,
            currentSubscriptionId: userData.subscriptionId,
         });
         
         // Show toast message based on upgrade status
         if (result.success) {
            toast.success(result.message);
         } else {
            toast.error('Failed to update subscription');
         }
         return;
      }

      // Handle new subscribers
      const checkoutSession = await serverPost('/create-checkout-session', {
         priceId,
         customerId: userData.customerId,
         userId: userId
      });

      const result = await stripe?.redirectToCheckout({
         sessionId: checkoutSession.id
      });

      if (result?.error) {
         console.error('Error redirecting to checkout:', result.error.message);
         throw new Error(result.error.message);
      }

   } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
   }
};
