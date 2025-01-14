import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { serverPost } from '../utils/api';

export default function MicrosoftCallback() {
   const navigate = useNavigate();

   useEffect(() => {
      async function handleCallback() {
         try {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');
            const error = urlParams.get('error');
            const errorDescription = urlParams.get('error_description');

            // Get stored values
            const storedState = sessionStorage.getItem('microsoft_auth_state');
            const codeVerifier = sessionStorage.getItem('microsoft_code_verifier');

            // Clear stored values
            sessionStorage.removeItem('microsoft_auth_state');
            sessionStorage.removeItem('microsoft_code_verifier');

            if (error) {
               throw new Error(`OAuth error: ${error} - ${errorDescription}`);
            }

            if (!code || !codeVerifier) {
               throw new Error('No code or code verifier found');
            }

            if (state !== storedState) {
               throw new Error('State mismatch');
            }

            // Exchange code for tokens
            await serverPost('/oauth/store-tokens', {
               code,
               code_verifier: codeVerifier,
               redirect_uri: import.meta.env.VITE_MICROSOFT_REDIRECT_URI,
               provider: 'microsoft'
            });

            // Redirect to success page
            navigate('/', { replace: true });
         } catch (error) {
            console.error('Microsoft callback error:', error);
            navigate('/settings', { replace: true });
         }
      }

      handleCallback();
   }, [navigate]);

   return (
      <div className="flex items-center justify-center min-h-screen">
         <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">Connecting to Microsoft...</h2>
            {/* Add your loading spinner here */}
         </div>
      </div>
   );
}