import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  orderBy, 
  Query, 
  DocumentData,
  doc,
  setDoc,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const COLLECTIONS = {
  USERS: 'users',
  MEETINGS: 'meetings',
  RESOURCES: 'resources',
  ACTION_ITEMS: 'action_items'
} as const;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export const createUserDocument = async (userId: string, email: string) => {
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }
};

export const getMeetingsQuery = (userId: string): Query<DocumentData> => {
  return query(
    collection(db, COLLECTIONS.MEETINGS),
    where('userId', '==', userId),
    orderBy('createDate', 'desc')
  );
};

export { auth, db, storage };