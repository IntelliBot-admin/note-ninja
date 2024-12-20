import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LogOut, User, Home, Calendar, Moon, Sun,Settings } from 'lucide-react';
import { useRecordingStore } from '../store/recordingStore';
import DarkModeToggle from './common/DarkModeToggle';
import toast from 'react-hot-toast';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuthStore();
  const { isRecording } = useRecordingStore();

  const handleNavigation = (path: string) => {
    if (isRecording) {
      toast.error('Please stop recording before navigating');
      return;
    }
    navigate(path);
  };

  const handleSignOut = () => {
    if (isRecording) {
      toast.error('Please stop recording before signing out');
      return;
    }
    signOut();
  };

  const isHome = location.pathname === '/';
  const isCalendar = location.pathname === '/calendar';
  const isSettings = location.pathname === '/settings';

  console.log('isRecording', user);

  // Add a class to indicate the header is disabled
  const headerClass = isRecording ? 'opacity-50 pointer-events-none' : '';

  if (!user) return null;

  return (
    <header className={`bg-white dark:bg-gray-800 shadow ${headerClass}`}>
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
            {!isHome && (
              <button
                onClick={() => handleNavigation('/')}
                disabled={isRecording}
                className={`p-2 rounded-full transition-colors ${
                  isRecording 
                    ? 'opacity-50 cursor-not-allowed text-gray-300'
                    : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-100'
                }`}
                title={isRecording ? 'Stop recording to navigate' : 'Go to Home'}
              >
                <Home className="w-5 h-5" />
              </button>
            )}
            <div 
              onClick={() => !isRecording && handleNavigation('/')}
              className={`flex items-center space-x-2 text-gray-900 dark:text-white ${
                isRecording ? 'text-gray-400 cursor-not-allowed' : 'text-gray-900 cursor-pointer'
              }`}
            >
              <img 
                src="https://res.cloudinary.com/dinqjfyij/image/upload/v1732575370/DALL_E_2024-11-25_16.56.02_-_A_simplified_and_modern_logo_for_a_business_named_Note_Ninja_designed_for_a_black_background_website._The_design_features_a_minimalistic_ninja_mask_yfmton.webp"
                alt="Ninja Notes Logo"
                className="w-14 h-14 object-contain"
              />
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                Ninja Notes
              </h1>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={() => handleNavigation('/calendar')}
              disabled={isRecording}
              className={`p-2 rounded-full transition-colors ${
                isRecording 
                  ? 'opacity-50 cursor-not-allowed text-gray-300'
                  : isCalendar 
                    ? 'text-indigo-600 bg-indigo-50' 
                    : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-100'
              }`}
              title={isRecording ? 'Stop recording to navigate' : 'View Calendar'}
            >
              <Calendar className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleNavigation('/settings')}
              disabled={isRecording}
              className={`p-2 rounded-full transition-colors ${
                isRecording 
                  ? 'opacity-50 cursor-not-allowed text-gray-300'
                  : isSettings
                    ? 'text-indigo-600 bg-indigo-50' 
                    : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-100'
              }`}
              title={isRecording ? 'Stop recording to navigate' : 'Account Settings'}
            >
              <Settings className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center text-sm text-gray-700">
              <User className="w-4 h-4 mr-1" />
              {user.email}
            </div>
            <DarkModeToggle />
            <button
              onClick={handleSignOut}
              disabled={isRecording}
              className={`inline-flex items-center px-2 sm:px-3 py-1.5 border border-transparent text-sm font-medium rounded-md ${
                isRecording
                  ? 'opacity-50 cursor-not-allowed text-gray-300 bg-gray-100'
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
              }`}
              title={isRecording ? 'Stop recording to sign out' : 'Sign out'}
            >
              <LogOut className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}