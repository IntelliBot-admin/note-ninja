import { X } from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';

export default function NotificationBanner() {
   const { activeNotification, setNotifications } = useNotificationStore();

   if (!activeNotification) return null;

   const handleClose = () => {
      setNotifications([]); // Clear notifications
   };

   return (
      <div className="relative z-50">
         <div className="bg-indigo-600 dark:bg-indigo-500">
            <div className="max-w-7xl mx-auto py-2 px-3 sm:px-6 lg:px-8">
               <div className="flex items-center justify-between flex-wrap">
                  <div className="w-0 flex-1 flex items-center">
                     <p className="font-medium text-sm text-white truncate">
                        {activeNotification.message}
                     </p>
                  </div>
                  <div className="flex-shrink-0">
                     <button
                        type="button"
                        onClick={handleClose}
                        className="ml-3 p-1 rounded-md hover:bg-indigo-500 dark:hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-white"
                     >
                        <X className="h-4 w-4 text-white" aria-hidden="true" />
                     </button>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}