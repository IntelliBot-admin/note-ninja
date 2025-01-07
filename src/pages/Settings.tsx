import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Lock, Mail, User, Shield, ChevronUp, ChevronDown, CreditCard, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import CalendarSettings from '../components/settings/CalendarSettings';
import { listProducts, createCheckoutSession, getPriceWithProduct, createAndRedirectToPortalSession, downgradeToFreePlan } from '../lib/stripe';
import { FormattedProduct } from '../lib/stripe';
import { db } from '../lib/firebase';
import { deleteDoc, doc } from 'firebase/firestore';
import { auth } from '../lib/firebase';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useSubscription } from '../hooks/useSubscription';
import { serverPost } from '../utils/api';
import Plans from '../components/Plans';

export default function Settings() {
   const { user, updatePassword } = useAuthStore();
   const [currentPassword, setCurrentPassword] = useState('');
   const [newPassword, setNewPassword] = useState('');
   const [confirmPassword, setConfirmPassword] = useState('');
   const [loading, setLoading] = useState(false);
   const [showPasswordSection, setShowPasswordSection] = useState(false);
   const [showPlanSection, setShowPlanSection] = useState(false);
   const [showDeleteSection, setShowDeleteSection] = useState(false);
   const [deleteConfirmation, setDeleteConfirmation] = useState('');
   const [deletePassword, setDeletePassword] = useState('');
   const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
   const [isRedirecting, setIsRedirecting] = useState(false);
   const [showDowngradeModal, setShowDowngradeModal] = useState(false);
   const [isDowngrading, setIsDowngrading] = useState(false);

   const [products, setProducts] = useState<FormattedProduct[]>([]);
   const [currentPlanDetails, setCurrentPlanDetails] = useState<any>(null);
   const { subscription: currentSubscription } = useSubscription();


   useEffect(() => {
      const fetchProducts = async () => {
         try {
            const products = await listProducts()
            setProducts(products);
         } catch (error) {
            console.error('Error loading products:', error);
            toast.error('Failed to load subscription plans');
         }
      };

      fetchProducts();
   }, []);

   useEffect(() => {
      const fetchCurrentPlan = async () => {
         console.log(currentSubscription, 'currentSubscription');

         if (currentSubscription?.planId) {
            try {
               const details = await getPriceWithProduct(currentSubscription.planId);
               setCurrentPlanDetails(details);
            } catch (error) {
               console.error('Error fetching plan details:', error);
            }
         }
      };

      fetchCurrentPlan();
   }, [currentSubscription?.planId]);

   const handlePasswordChange = async (e: React.FormEvent) => {
      e.preventDefault();

      if (newPassword !== confirmPassword) {
         toast.error('New passwords do not match');
         return;
      }

      if (newPassword.length < 6) {
         toast.error('Password must be at least 6 characters');
         return;
      }

      setLoading(true);
      try {
         await updatePassword(currentPassword, newPassword);
         toast.success('Password updated successfully');
         setCurrentPassword('');
         setNewPassword('');
         setConfirmPassword('');
      } catch (error: any) {
         toast.error(error.message || 'Failed to update password');
      } finally {
         setLoading(false);
      }
   };

   const handleSubscribe = async (priceId: string) => {
      if (!user?.uid) {
         toast.error('Please sign in to subscribe');
         return;
      }

      try {
         setProcessingPlanId(priceId);
         await createCheckoutSession(
            user.uid,
            priceId,
         );

         // Redirect to Stripe Checkout

      } catch (error) {
         console.error('Error starting checkout:', error);
         toast.error('Failed to start checkout process');
      } finally {
         setProcessingPlanId(null);
      }
   };

   

   const handleDeleteAccount = async () => {
      if (deleteConfirmation !== user?.email) {
         toast.error('Please enter your email correctly to confirm deletion');
         return;
      }

      if (!deletePassword) {
         toast.error('Please enter your password to confirm deletion');
         return;
      }

      setLoading(true);
      try {
         // 1. Re-authenticate the user first (required by Firebase for sensitive operations)
         const credential = EmailAuthProvider.credential(
            user.email!,
            deletePassword
         );
         await reauthenticateWithCredential(auth.currentUser!, credential);

         // 2. Cancel any active subscriptions
         if (currentSubscription) {
            await serverPost('/cancel-subscription', {
               userId: user.uid
            });
         }

         // 3. Delete Firestore data
         await deleteDoc(doc(db, 'users', user.uid));

         // 4. Delete the Firebase auth account
         await auth.currentUser?.delete();

         toast.success('Account deleted successfully');
         window.location.href = '/';
      } catch (error: any) {
         console.error('Error deleting account:', error);
         if (error.code === 'auth/requires-recent-login') {
            toast.error('Please sign out and sign in again before deleting your account');
         } else {
            toast.error(error.message || 'Failed to delete account');
         }
      } finally {
         setLoading(false);
      }
   };

   const DowngradeModal = () => (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
         <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Cancel Free Trial</h3>
            <p className="text-sm text-gray-500 mb-4">
               Are you sure you want to cancel your free trial? Please note:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-500 mb-6">
               <li>Your access to premium features will end immediately</li>
               <li>You can upgrade again at any time</li>
            </ul>
            <div className="flex justify-end space-x-4">
               <button
                  onClick={() => setShowDowngradeModal(false)}
                  disabled={isDowngrading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
               >
                  Keep Trial
               </button>
               <button
                  onClick={async () => {
                     if (user?.uid) {
                        try {
                           setIsDowngrading(true);
                           await downgradeToFreePlan(user.uid);
                           toast.success('Trial cancelled successfully');
                           setShowDowngradeModal(false);
                        } catch (error) {
                           console.error('Error cancelling trial:', error);
                           toast.error('Failed to cancel trial');
                        } finally {
                           setIsDowngrading(false);
                        }
                     }
                  }}
                  disabled={isDowngrading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 flex items-center"
               >
                  {isDowngrading ? (
                     <>
                        <svg 
                           className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
                           xmlns="http://www.w3.org/2000/svg" 
                           fill="none" 
                           viewBox="0 0 24 24"
                        >
                           <circle 
                              className="opacity-25" 
                              cx="12" 
                              cy="12" 
                              r="10" 
                              stroke="currentColor" 
                              strokeWidth="4"
                           />
                           <path 
                              className="opacity-75" 
                              fill="currentColor" 
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                           />
                        </svg>
                        Cancelling...
                     </>
                  ) : (
                     'Cancel Trial'
                  )}
               </button>
            </div>
         </div>
      </div>
   );

   return (
      <div className="min-h-screen bg-gray-50">
         <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
               <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
               <p className="mt-2 text-sm text-gray-600">
                  Manage your account settings and security preferences
               </p>
            </div>

            <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
               {/* Profile Section */}
               <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                     <h2 className="text-lg font-medium text-gray-900 flex items-center">
                        <User className="w-5 h-5 mr-2 text-gray-400" />
                        Profile Information
                     </h2>
                  </div>
                  <div className="flex items-center space-x-4">
                     <div className="bg-indigo-100 rounded-full p-3">
                        <User className="w-6 h-6 text-indigo-600" />
                     </div>
                     <div>
                        <div className="flex items-center text-sm text-gray-500">
                           <Mail className="w-4 h-4 mr-2" />
                           {user?.email}
                        </div>
                     </div>
                  </div>
               </div>

               {/* Plan Section */}
               <Plans />

               {/* Security Section */}
               <div className="p-6">
                  <div
                     className="flex items-center justify-between mb-4 cursor-pointer"
                     onClick={() => setShowPasswordSection(!showPasswordSection)}
                  >
                     <h2 className="text-lg font-medium text-gray-900 flex items-center">
                        <Shield className="w-5 h-5 mr-2 text-gray-400" />
                        Security
                     </h2>
                     <button
                        type="button"
                        className="text-gray-400 hover:text-gray-600"
                        aria-expanded={showPasswordSection}
                     >
                        {showPasswordSection ? (
                           <ChevronUp className="w-5 h-5" />
                        ) : (
                           <ChevronDown className="w-5 h-5" />
                        )}
                     </button>
                  </div>

                  {showPasswordSection && (
                     <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
                        <div className="border-b border-gray-200 pb-4">
                           <h3 className="text-base font-medium text-gray-900 flex items-center">
                              <Lock className="w-4 h-4 mr-2 text-gray-400" />
                              Reset Password
                           </h3>
                           <p className="mt-1 text-sm text-gray-500">
                              Update your password to keep your account secure
                           </p>
                        </div>

                        <div>
                           <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                              Current Password
                           </label>
                           <div className="mt-1">
                              <input
                                 type="password"
                                 id="currentPassword"
                                 value={currentPassword}
                                 onChange={(e) => setCurrentPassword(e.target.value)}
                                 required
                                 className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              />
                           </div>
                        </div>

                        <div>
                           <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                              New Password
                           </label>
                           <div className="mt-1">
                              <input
                                 type="password"
                                 id="newPassword"
                                 value={newPassword}
                                 onChange={(e) => setNewPassword(e.target.value)}
                                 required
                                 className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              />
                           </div>
                        </div>

                        <div>
                           <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                              Confirm New Password
                           </label>
                           <div className="mt-1">
                              <input
                                 type="password"
                                 id="confirmPassword"
                                 value={confirmPassword}
                                 onChange={(e) => setConfirmPassword(e.target.value)}
                                 required
                                 className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              />
                           </div>
                        </div>

                        <div>
                           <button
                              type="submit"
                              disabled={loading}
                              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                           >
                              <Lock className="w-4 h-4 mr-2" />
                              {loading ? 'Updating...' : 'Update Password'}
                           </button>
                        </div>
                     </form>
                  )}
               </div>

               {/* Calendar Settings Section */}
               <div className="p-6">
                 <CalendarSettings />
               </div>

               {/* Delete Account Section */}
               <div className="p-6">
                  <div
                     className="flex items-center justify-between mb-4 cursor-pointer"
                     onClick={() => setShowDeleteSection(!showDeleteSection)}
                  >
                     <h2 className="text-lg font-medium text-gray-900 flex items-center">
                        <Trash2 className="w-5 h-5 mr-2 text-red-400" />
                        Delete Account
                     </h2>
                     <button
                        type="button"
                        className="text-gray-400 hover:text-gray-600"
                        aria-expanded={showDeleteSection}
                     >
                        {showDeleteSection ? (
                           <ChevronUp className="w-5 h-5" />
                        ) : (
                           <ChevronDown className="w-5 h-5" />
                        )}
                     </button>
                  </div>

                  {showDeleteSection && (
                     <div className="space-y-4">
                        <div className="border-b border-gray-200 pb-4">
                           <p className="text-sm text-gray-500">
                              This action cannot be undone. This will permanently delete your account and remove all associated data.
                           </p>
                        </div>

                        <div>
                           <label htmlFor="deleteConfirmation" className="block text-sm font-medium text-gray-700">
                              Type your email to confirm: {user?.email}
                           </label>
                           <div className="mt-1">
                              <input
                                 type="email"
                                 id="deleteConfirmation"
                                 value={deleteConfirmation}
                                 onChange={(e) => setDeleteConfirmation(e.target.value)}
                                 className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                              />
                           </div>
                        </div>

                        <div>
                           <label htmlFor="deletePassword" className="block text-sm font-medium text-gray-700">
                              Enter your password to confirm
                           </label>
                           <div className="mt-1">
                              <input
                                 type="password"
                                 id="deletePassword"
                                 value={deletePassword}
                                 onChange={(e) => setDeletePassword(e.target.value)}
                                 className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                                 placeholder="Enter your password"
                                 required
                              />
                           </div>
                        </div>

                        <button
                           onClick={handleDeleteAccount}
                           disabled={loading || deleteConfirmation !== user?.email || !deletePassword}
                           className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                        >
                           <Trash2 className="w-4 h-4 mr-2" />
                           {loading ? 'Deleting...' : 'Delete Account'}
                        </button>
                     </div>
                  )}
               </div>
            </div>
         </div>
         {showDowngradeModal && <DowngradeModal />}
      </div>
   );
}
