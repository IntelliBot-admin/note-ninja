import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LogOut, User, Home, ListTodo, Moon, Sun, Settings, Quote, FileText, CheckSquare } from 'lucide-react';
import { useRecordingStore } from '../store/recordingStore';
import DarkModeToggle from './common/DarkModeToggle';
import toast from 'react-hot-toast';
import { useQuoteStore } from '../hooks/useQuoteVisibility';
import UserStats from './stats/UserStats';
import { useLayoutStore } from '../store/layoutStore';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuthStore();
  const { isRecording } = useRecordingStore();
  const { isSidebarLayout } = useLayoutStore();
  const { isQuoteVisible, toggleQuoteVisibility } = useQuoteStore();

  const handleNavigation = (path: string) => {
    if (isRecording) {
      toast.error('Please stop recording before navigating');
      return;
    }
    // When navigating to calendar view from Tasks icon, add the kanban parameter
    if (path === '/calendar') {
      navigate('/calendar?view=kanban');
    } else {
      navigate(path);
    }
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
      <div className={`${
        isSidebarLayout
          ? 'h-full'
          : 'max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-4'
      }`}>
        <div className={`${
          isSidebarLayout
            ? 'flex flex-col h-full'
            : 'flex justify-between items-center'
        }`}>
          <div className={`flex items-center ${
            isSidebarLayout ? 'justify-center p-4' : 'space-x-2 sm:space-x-4 min-w-0'
          }`}>
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
          {!isSidebarLayout && <UserStats userId={user.uid} />}
          
          {isSidebarLayout && (
            <div className="px-4">
              <UserStats userId={user.uid} isSidebarLayout={true} />
            </div>
          )}
          
          <div className={`flex ${
            isSidebarLayout 
              ? 'flex-col space-y-2 flex-1 px-4 py-2 min-h-0' 
              : 'items-center space-x-2 sm:space-x-4'
          }`}>
            {isSidebarLayout ? (
              <>
                <button
                  onClick={() => handleNavigation('/calendar')}
                  disabled={isRecording}
                  className={`flex items-center w-full p-3 rounded-lg transition-colors ${
                    isRecording 
                      ? 'opacity-50 cursor-not-allowed text-gray-300'
                      : isCalendar 
                        ? 'text-indigo-600 bg-indigo-50' 
                        : 'text-gray-600 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <ListTodo className="w-5 h-5 mr-3" />
                  <span className="text-sm dark:text-gray-300">Action Items</span>
                </button>
                <button
                  onClick={() => handleNavigation('/settings')}
                  disabled={isRecording}
                  className={`flex items-center w-full p-3 rounded-lg transition-colors ${
                    isRecording 
                      ? 'opacity-50 cursor-not-allowed text-gray-300'
                      : isSettings
                        ? 'text-indigo-600 bg-indigo-50' 
                        : 'text-gray-600 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Settings className="w-5 h-5 mr-3" />
                  <span className="text-sm dark:text-gray-300">Settings</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleNavigation('/calendar')}
                  disabled={isRecording}
                  className={`p-2 rounded-full transition-colors ${
                    isRecording 
                      ? 'opacity-50 cursor-not-allowed text-gray-300'
                      : isCalendar 
                        ? 'text-indigo-600 bg-indigo-50' 
                        : 'text-gray-600 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <ListTodo className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleNavigation('/settings')}
                  disabled={isRecording}
                  className={`p-2 rounded-full transition-colors ${
                    isRecording 
                      ? 'opacity-50 cursor-not-allowed text-gray-300'
                      : isSettings
                        ? 'text-indigo-600 bg-indigo-50' 
                        : 'text-gray-600 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Settings className="w-5 h-5" />
                </button>
              </>
            )}
            
            <div className={`${
              isSidebarLayout 
                ? 'flex items-center p-3 text-sm text-gray-700 dark:text-gray-300 bg-white/50 dark:bg-gray-700/50 rounded-lg mt-auto mb-2' 
                : 'hidden sm:flex items-center text-sm text-gray-700 dark:text-gray-300'
            }`}>
              <User className="w-4 h-4 mr-1" />
              {user.email}
            </div>
            
            <div className={`flex items-center ${
              isSidebarLayout 
                ? 'justify-around w-full p-3 bg-white/50 dark:bg-gray-700/50 rounded-lg' 
                : 'space-x-2'
            }`}>
              <DarkModeToggle />
              <button
                onClick={toggleQuoteVisibility}
                className={`p-2 rounded-full transition-colors ${
                  isQuoteVisible 
                    ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' 
                    : 'text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title={isQuoteVisible ? 'Hide daily inspiration' : 'Show daily inspiration'}
              >
                <Quote className="w-5 h-5" />
              </button>
            </div>
            
            <button
              onClick={handleSignOut}
              disabled={isRecording}
              className={`inline-flex items-center mt-2 ${
                isSidebarLayout 
                  ? 'w-full justify-center p-3 rounded-lg bg-white/50 dark:bg-gray-700/50'
                  : 'px-2 sm:px-3 py-1.5 rounded-md'
              } border border-transparent text-sm font-medium ${
                isRecording
                  ? 'opacity-50 cursor-not-allowed text-gray-300 bg-gray-100'
                  : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <LogOut className="w-4 h-4 sm:mr-1" />
              <span className={isSidebarLayout ? 'ml-2' : 'hidden sm:inline'}>Sign out</span>
            </button>
           </div>
        </div>
      </div>
    </header>
  );
}