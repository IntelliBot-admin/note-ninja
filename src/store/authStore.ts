import { create } from 'zustand';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from 'firebase/auth';
import { doc, setDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { DEFAULT_CATEGORIES } from '../types/category';
import { SignupFormData } from '../types/auth';
import toast from 'react-hot-toast';
import { serverPost } from '../utils/api';
import { createCheckoutSession, planMap } from '../lib/stripe';

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, additionalData?: Partial<SignupFormData>) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

async function initializeUserCategories(userId: string) {
  const categoriesRef = collection(db, 'users', userId, 'categories');
  const snapshot = await getDocs(categoriesRef);
  
  if (snapshot.empty) {
    // Create default categories in batch
    const promises = DEFAULT_CATEGORIES.map(category => 
      setDoc(doc(categoriesRef), {
        name: category.name,
        color: category.color,
        createdAt: serverTimestamp()
      })
    );
    
    await Promise.all(promises);
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  signIn: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await initializeUserCategories(userCredential.user.uid);
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error.code));
    }
  },

  signUp: async (email, password, additionalData) => {
    try {
      // Create Firebase user first
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create Stripe customer before user document
      let customerId = null;
      try {
        const response = await serverPost('/create-customer', {
          email: user.email,
          uid: user.uid
        });
        customerId = response?.customerId;
      } catch (error) {
        console.error('Failed to create Stripe customer:', error);
        toast.error('Account created, but some features may be limited. Please try again later.');
      }

      // Create user document with Stripe customer ID
      const userData = {
        email: user.email,
        customerId, // Include Stripe customer ID from the start
        plan: 'free',
        subscriptionId: null,
        firstName: additionalData?.firstName || '',
        lastName: additionalData?.lastName || '',
        role: additionalData?.role || '',
        referralSource: additionalData?.referralSource || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'users', user.uid), userData);

      // Initialize categories
      await initializeUserCategories(user.uid);

      // await createCheckoutSession(user.uid, import.meta.env.VITE_STRIPE_ENTRY_PRICE_ID);
    } catch (error: any) {
      console.error('Signup error:', error);
      throw new Error(getAuthErrorMessage(error.code));
    }
  },

  signOut: async () => {
    try {
      await firebaseSignOut(auth);
      set({ user: null });
      toast.success('Signed out successfully');
    } catch (error: any) {
      throw new Error('Failed to sign out');
    }
  },

  resetPassword: async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error.code));
    }
  },

  updatePassword: async (currentPassword: string, newPassword: string) => {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error('No user logged in');
      
      // Reauthenticate user before changing password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
    } catch (error: any) {
      throw new Error(error.message);
    }
  },
}));

// Initialize auth state listener
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await initializeUserCategories(user.uid);
  }
  useAuthStore.setState({ user, loading: false });
});

// Helper function to get user-friendly error messages
function getAuthErrorMessage(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered';
    case 'auth/invalid-email':
      return 'Invalid email address';
    case 'auth/operation-not-allowed':
      return 'Operation not allowed';
    case 'auth/weak-password':
      return 'Password is too weak';
    case 'auth/user-disabled':
      return 'This account has been disabled';
    case 'auth/user-not-found':
      return 'No account found with this email';
    case 'auth/wrong-password':
      return 'Incorrect password';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later';
    default:
      return 'An error occurred. Please try again';
  }
}