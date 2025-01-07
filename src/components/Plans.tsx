import React, { useState, useEffect } from 'react';
import { CreditCard, ChevronUp, ChevronDown, CheckCircle2 } from 'lucide-react';
import { FormattedProduct, StripePrice } from '../lib/stripe';
import { createCheckoutSession, createAndRedirectToPortalSession, downgradeToFreePlan, listProducts, getPriceWithProduct } from '../lib/stripe';
import toast from 'react-hot-toast';
import { useSubscription } from '../hooks/useSubscription';
import { useAuthStore } from '../store/authStore';

interface PlanToggleProps {
   isAnnual: boolean;
   onChange: (isAnnual: boolean) => void;
}

const PlanToggle: React.FC<PlanToggleProps> = ({ isAnnual, onChange }) => (
   <div className="flex items-center justify-center space-x-4 mb-6">
      <span className={`text-sm ${!isAnnual ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>Monthly</span>
      <button
         onClick={() => onChange(!isAnnual)}
         className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${isAnnual ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
      >
         <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAnnual ? 'translate-x-6' : 'translate-x-1'
            }`} />
      </button>
      <span className={`text-sm ${isAnnual ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
         Annual <span className="text-green-500 text-xs">Save 20%</span>
      </span>
   </div>
);


export default function BillingSettings() {
   const [showPlanSection, setShowPlanSection] = useState(false);
   const [isAnnual, setIsAnnual] = useState(false);
   const [products, setProducts] = useState<FormattedProduct[]>([]);
   const [currentPlanDetails, setCurrentPlanDetails] = useState<any>(null);
   const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
   const [isRedirecting, setIsRedirecting] = useState(false);
   const [showDowngradeModal, setShowDowngradeModal] = useState(false);
   const [isDowngrading, setIsDowngrading] = useState(false);
   const { subscription: currentSubscription } = useSubscription();
   const { user } = useAuthStore();


   useEffect(() => {
      const fetchProducts = async () => {
         try {
            const products = await listProducts()
            console.log(products,'products')
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

   const handleSubscribe = async (priceId: string) => {
      if (!user?.uid) {
         toast.error('Please sign in to subscribe');
         return;
      }

      try {
         setProcessingPlanId(priceId);
         await createCheckoutSession(user.uid, priceId);
      } catch (error) {
         console.error('Error starting checkout:', error);
         toast.error('Failed to start checkout process');
      } finally {
         setProcessingPlanId(null);
      }
   };

   

   const DowngradeModal = () => (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
         <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Downgrade to Free Plan</h3>
            <p className="text-sm text-gray-500 mb-4">
               Are you sure you want to downgrade to the free plan? Please note:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-500 mb-6">
               <li>Your access to premium features will end at the end of your billing period</li>
               <li>You can upgrade again at any time</li>
               <li>No refunds will be issued for partial months</li>
            </ul>
            <div className="flex justify-end space-x-4">
               <button
                  onClick={() => setShowDowngradeModal(false)}
                  disabled={isDowngrading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
               >
                  Cancel
               </button>
               <button
                  onClick={async () => {
                     if (user?.uid) {
                        try {
                           setIsDowngrading(true);
                           await downgradeToFreePlan(user.uid);
                           toast.success('Successfully downgraded to free plan');
                           setShowDowngradeModal(false);
                        } catch (error) {
                           console.error('Error downgrading plan:', error);
                           toast.error('Failed to downgrade plan');
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
                        Downgrading...
                     </>
                  ) : (
                     'Downgrade to Free'
                  )}
               </button>
            </div>
         </div>
      </div>
   );

   const CurrentPlanDisplay = ({ currentPlanDetails, currentSubscription, user, isRedirecting, setIsRedirecting }: { currentPlanDetails: any, currentSubscription: any, user: any, isRedirecting: boolean, setIsRedirecting: (isRedirecting: boolean) => void }) => (
      <div className="border-b border-gray-200 pb-4">
         <div className="mt-6 flex items-center justify-between">
            <div>
               {currentSubscription && currentPlanDetails ? (
                  <>
                     <p className="text-sm font-medium text-gray-900">
                        You are on the {currentPlanDetails.product.name} Plan
                     </p>
                     <p className="text-sm text-gray-500">
                        ${(currentPlanDetails.unit_amount / 100).toFixed(2)} per {currentPlanDetails.recurring.interval}
                     </p>
                     <p className="text-xs text-gray-400 mt-1">
                        Next billing date: {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}
                     </p>
                  </>
               ) : (
                  <>
                     <p className="text-sm font-medium text-gray-900">Free Plan</p>
                     <p className="text-sm text-gray-500">Basic features for personal use</p>
                  </>
               )}
            </div>
            {currentSubscription && user?.uid && (
               <button
                  onClick={async () => {
                     try {
                        setIsRedirecting(true);
                        await createAndRedirectToPortalSession(user.uid);
                     } catch (error) {
                        setIsRedirecting(false);
                     }
                  }}
                  disabled={isRedirecting}
                  className="inline-flex items-center px-3 py-1.5 border border-indigo-600 rounded-md text-sm font-medium text-indigo-600 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
               >
                  {isRedirecting ? 'Redirecting...' : 'Manage Billing'}
               </button>
            )}
         </div>
      </div>
   );

      const getPlanButtonProps = (product: FormattedProduct, price: StripePrice, isCurrentPlan: boolean, currentSubscription: any, processingPlanId: string | null) => {
      const isProcessing = processingPlanId === price.id;
      
      if (isProcessing) {
         return {
            text: 'Processing...',
            action: () => {},
            className: 'bg-indigo-600 text-white',
            disabled: true
         };
      }

      if (isCurrentPlan) {
         return {
            text: 'Current Plan',
            action: () => {},
            className: 'bg-gray-100 text-gray-800 border-gray-300',
            disabled: true
         };
      }

      if (currentSubscription) {
         if (price.unit_amount < currentPlanDetails.unit_amount) {
            return {
               text: 'Downgrade to Free',
               action: () => setShowDowngradeModal(true),
               className: 'bg-red-600 text-white hover:bg-red-700',
               disabled: false
            };
         }
         return {
            text: `Switch to ${product.name}`,
            action: () => handleSubscribe(price.id),
            className: 'bg-indigo-600 text-white hover:bg-indigo-700',
            disabled: false
         };
      }

      return {
         text: `Subscribe to ${product.name}`,
         action: () => handleSubscribe(price.id),
         className: 'bg-indigo-600 text-white hover:bg-indigo-700',
         disabled: false
      };
   };

   return (
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
               <CurrentPlanDisplay
                  currentPlanDetails={currentPlanDetails}
                  currentSubscription={currentSubscription}
                  user={user}
                  isRedirecting={isRedirecting}
                  setIsRedirecting={setIsRedirecting}
               />

               <div>
                  <h3 className="text-base font-medium text-gray-900 mb-4">Available Plans</h3>

                  <PlanToggle
                     isAnnual={isAnnual}
                     onChange={setIsAnnual}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                     {products?.map((product) => {
                        const price = isAnnual ? product.prices.annual : product.prices.monthly;
                        if (!price) return null;

                        const isCurrentPlan = currentSubscription?.planId === price.id;
                        const buttonProps = getPlanButtonProps(product, price, isCurrentPlan, currentSubscription, processingPlanId);

                        return (
                           <div key={product.id} className="border rounded-lg p-4 hover:border-indigo-500 transition-colors">
                              <div className="flex justify-between items-start">
                                 <div>
                                    <h4 className="text-lg font-medium text-gray-900">{product.name}</h4>
                                    <p className="text-sm text-gray-500 mt-1">{product.description}</p>
                                 </div>
                                 <div className="text-right">
                                    <p className="text-lg font-medium text-gray-900">
                                       ${(price.unit_amount / 100).toFixed(2)}
                                       <span className="text-sm text-gray-500">/{price.recurring.interval}</span>
                                    </p>
                                 </div>
                              </div>

                              {product.marketing_features && (
                                 <ul className="mt-4 space-y-2">
                                    {product.marketing_features.map((feature:{name:string}, index:number) => (
                                       <li key={index} className="flex items-center text-sm text-gray-600">
                                          <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                                          {feature.name}
                                       </li>
                                    ))}
                                 </ul>
                              )}

                              <button
                                 type="button"
                                 onClick={buttonProps.action}
                                 disabled={buttonProps.disabled}
                                 className={`mt-4 w-full inline-flex items-center justify-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium ${buttonProps.className} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                              >
                                 {buttonProps.text}
                              </button>
                           </div>
                        );
                     })}
                  </div>
               </div>
            </div>
         )}
         {showDowngradeModal && <DowngradeModal />}
      </div>
   );
}