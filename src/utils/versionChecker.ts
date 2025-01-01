import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const checkBuildVersion = async () => {
   try {
      const localVersion = localStorage.getItem('buildVersion');

      // Get server version from Firestore
      const versionDoc = await getDoc(doc(db, 'config', 'buildVersion'));
      const serverVersion = versionDoc.data()?.buildNumber;

      if (!localVersion) {
         localStorage.setItem('buildVersion', serverVersion);
      } else if (localVersion !== serverVersion) {
         localStorage.setItem('buildVersion', serverVersion);
         // Clear cache and reload
         if ('caches' in window) {
            const cacheKeys = await caches.keys();
            await Promise.all(cacheKeys.map(key => caches.delete(key)));
         }
         window.location.reload();
      }
   } catch (error) {
      console.error('Error checking version:', error);
   }
};