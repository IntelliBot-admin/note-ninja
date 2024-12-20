import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Lock, Mail, User, Shield, ChevronUp, ChevronDown, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { listProducts, createCheckoutSession, cleanupSubscriptions } from '../lib/stripe';
import { StripeProduct } from '../lib/stripe';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';

export default function Settings() {
   const { user, updatePassword } = useAuthStore();
   const [currentPassword, setCurrentPassword] = useState('');
   const [newPassword, setNewPassword] = useState('');
   const [confirmPassword, setConfirmPassword] = useState('');
   const [loading, setLoading] = useState(false);
   const [showPasswordSection, setShowPasswordSection] = useState(false);
   const [showPlanSection, setShowPlanSection] = useState(false);

   const [products, setProducts] = useState<StripeProduct[]>([]);
   const [currentSubscription, setCurrentSubscription] = useState<any>(null);

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

      if (user?.uid) {

         const subscriptionsRef = collection(db, 'customers', user.uid, 'subscriptions');
         const q = query(subscriptionsRef, where('status', 'in', ['trialing', 'active']));
         
         const unsubscribe = onSnapshot(q, async (snapshot) => {
            const doc = snapshot.docs[0];
            if (doc) {
               const subscriptionData = doc.data();
               
               const priceId = subscriptionData.items?.[0]?.price?.id;
               
               if (priceId) {
                  try {
                     const productsRef = collection(db, 'products');
                     const productsSnapshot = await getDocs(productsRef);
                     
                     for (const productDoc of productsSnapshot.docs) {
                        const pricesRef = collection(db, 'products', productDoc.id, 'prices');
                        const pricesSnapshot = await getDocs(pricesRef);
                        
                        const matchingPrice = pricesSnapshot.docs.find(priceDoc => priceDoc.id === priceId);
                        if (matchingPrice) {
                           const productData = productDoc.data();
                           const priceData = matchingPrice.data();
                           
                           setCurrentSubscription({
                              ...subscriptionData,
                              items: [{
                                 ...subscriptionData.items[0],
                                 price: {
                                    ...priceData,
                                    id: matchingPrice.id,
                                    product: {
                                       ...productData,
                                       name: productData.name,
                                       id: productDoc.id
                                    }
                                 }
                              }]
                           });
                           break;
                        }
                     }
                  } catch (error) {
                     console.error('Error fetching product details:', error);
                  }
               }
            } else {
               setCurrentSubscription(null);
            }
         }, (error) => {
            console.error('Error fetching subscription:', error);
            toast.error('Failed to load subscription status');
         });

         return () => unsubscribe();
      }
   }, [user?.uid]);

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
         setLoading(true);
         const url = await createCheckoutSession(
            user.uid,
            priceId,
            `${window.location.origin}/settings?success=true`,
            `${window.location.origin}/settings?canceled=true`
         );
      
         // Redirect to Stripe Checkout
         window.location.assign(url as string);
      } catch (error) {
         console.error('Error starting checkout:', error);
         toast.error('Failed to start checkout process');
      } finally {
         setLoading(false);
      }
   };

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
               <div className="p-6">
                  <div 
                     className="flex items-center justify-between mb-4 cursor-pointer"
                     onClick={() => setShowPlanSection(!showPlanSection)}
                  >
                     <h2 className="text-lg font-medium text-gray-900 flex items-center">
                        <CreditCard className="w-5 h-5 mr-2 text-gray-400" />
                        Plan & Billing
                     </h2>
                     <button
                        type="button"
                        className="text-gray-400 hover:text-gray-600"
                        aria-expanded={showPlanSection}
                     >
                        {showPlanSection ? (
                           <ChevronUp className="w-5 h-5" />
                        ) : (
                           <ChevronDown className="w-5 h-5" />
                        )}
                     </button>
                  </div>

                  {showPlanSection && (
                     <div className="space-y-4">
                        <div className="border-b border-gray-200 pb-4">
                           <div className="mt-6 flex items-center justify-between">
                              <div>
                                 {currentSubscription ? (
                                    <>
                                       <p className="text-sm font-medium text-gray-900">
                                          You are on {currentSubscription.items[0]?.price?.product?.name || 'Unknown'} Plan
                                       </p>
                                       <p className="text-sm text-gray-500">
                                          Paying ${((currentSubscription.items[0]?.price?.unit_amount || 0) / 100).toFixed(2)} per month
                                       </p>
                                       <p className="text-xs text-gray-400 mt-1">
                                          Next billing date: {new Date(currentSubscription.current_period_end.seconds * 1000).toLocaleDateString()}
                                       </p>
                                    </>
                                 ) : (
                                    <>
                                       <p className="text-sm font-medium text-gray-900">Free Plan</p>
                                       <p className="text-sm text-gray-500">Basic features for personal use</p>
                                    </>
                                 )}
                              </div>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                 Active
                              </span>
                           </div>
                        </div>

                        <div>
                           <h3 className="text-base font-medium text-gray-900 mb-4">Available Plans</h3>
                           <div className="grid gap-4 sm:grid-cols-2">
                              {products.map((product) => (
                                 <div key={product.id} className="border rounded-lg p-4 hover:border-indigo-500 transition-colors">
                                    <div className="flex justify-between items-start">
                                       <div>
                                          <h4 className="text-lg font-medium text-gray-900">{product.name}</h4>
                                          <p className="text-sm text-gray-500 mt-1">{product.description}</p>
                                       </div>
                                       <p className="text-lg font-medium text-gray-900">
                                          {product.prices?.[0]?.unit_amount 
                                             ? `$${(product.prices[0].unit_amount / 100).toFixed(2)}/mo`
                                             : 'Custom'}
                                       </p>
                                    </div>
                                    
                                    {/* Show features if they exist in metadata */}
                                    {product.features && (
                                       <ul className="mt-4 space-y-2">
                                          {product.features.map((feature: string, index: number) => (
                                             <li key={index} className="flex items-center text-sm text-gray-600">
                                                <span className="mr-2">✓</span> {feature}
                                             </li>
                                          ))}
                                       </ul>
                                    )}

                                    <button
                                       type="button"
                                       onClick={() => product.prices?.[0]?.id && handleSubscribe(product.prices[0].id)}
                                       className={`mt-4 w-full inline-flex items-center justify-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium ${
                                          product.prices?.[0]?.id
                                             ? 'border-transparent text-white bg-indigo-600 hover:bg-indigo-700'
                                             : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                                       } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                                       disabled={loading || currentSubscription?.price?.id === product.prices?.[0]?.id}
                                    >
                                       {product.prices?.[0]?.id ? (
                                          currentSubscription?.price?.id === product.prices[0].id
                                             ? 'Current Plan'
                                             : currentSubscription
                                                ? (product.prices[0].unit_amount || 0) > (currentSubscription.items[0]?.price?.unit_amount || 0)
                                                   ? `Upgrade to ${product.name}`
                                                   : `Switch to ${product.name}`
                                                : `Subscribe to ${product.name}`
                                       ) : (
                                          'Contact Sales'
                                       )}
                                    </button>
                                 </div>
                              ))}
                           </div>
                        </div>
                     </div>
                  )}
               </div>

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
            </div>
         </div>
      </div>
   );
}
