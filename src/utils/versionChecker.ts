import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

declare const __APP_VERSION__: string; // Add this for TypeScript

export const checkBuildVersion = async () => {
  try {
    const localVersion = localStorage.getItem('buildVersion');
    const currentVersion = __APP_VERSION__;

    // Get server version from Firestore
    const versionDoc = await getDoc(doc(db, 'config', 'buildVersion'));
    const serverVersion = versionDoc.data()?.version;

    if (!localVersion) {
      localStorage.setItem('buildVersion', serverVersion);
    } else if (localVersion !== serverVersion) {
      localStorage.setItem('buildVersion', serverVersion);
      window.location.reload();
    }
  } catch (error) {
    console.error('Error checking version:', error);
  }
};