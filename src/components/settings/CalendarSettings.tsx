import { useEffect, useState } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { CalendarProvider } from '../../types/calendar';
import { getConnectedCalendars, initGoogleAuth, initMicrosoftAuth, handleOAuthCallback } from '../../utils/calendarAuth';
import toast from 'react-hot-toast';

export default function CalendarSettings() {
  const { user } = useAuthStore();
  const [connectedCalendars, setConnectedCalendars] = useState<CalendarProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadCalendars = async () => {
      try {
        const calendars = await getConnectedCalendars(user.uid);
        console.log('Loaded calendars:', calendars);
        setConnectedCalendars(calendars);
      } catch (error) {
        console.error('Error loading calendars:', error);
        toast.error('Failed to load connected calendars');
      } finally {
        setLoading(false);
      }
    };

    loadCalendars();
  }, [user]);

  const handleGoogleConnect = async () => {
    try {
      await initGoogleAuth();
    } catch (error) {
      console.error('Error connecting Google Calendar:', error);
      toast.error('Failed to connect Google Calendar');
    }
  };

  const handleMicrosoftConnect = async () => {
    try {
      console.log('Initiating Microsoft Calendar connection...');
      await initMicrosoftAuth();
    } catch (error) {
      console.error('Error connecting Microsoft Calendar:', error);
      toast.error('Failed to connect Microsoft Calendar');
    }
  };

  useEffect(() => {
    // Check URL for OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const state = urlParams.get('state');
    console.log('OAuth callback params:', { code, error, state });

    if (error) {
      console.error('OAuth error:', error);
      toast.error('Failed to connect calendar: ' + error);
      return;
    }

    if (code) {
      const handleCallback = async () => {
        try {
          setLoading(true);
          // Determine provider from URL or state
          const provider = state === 'microsoft' ? 'microsoft' : 'google';
          console.log('Processing OAuth callback for provider:', provider);
          
          await handleOAuthCallback(code, provider);
          toast.success('Calendar connected successfully!');
          
          // Force reload calendar data after a short delay to ensure Firestore is updated
          setTimeout(async () => {
            if (user) {
              const calendars = await getConnectedCalendars(user.uid);
              console.log('Updated calendar list:', calendars);
              setConnectedCalendars(calendars);
            }
          }, 1000);
          
          // Clear URL parameters
          window.history.replaceState({}, '', window.location.pathname);
        } catch (error) {
          console.error('Error handling OAuth callback:', error);
          toast.error('Failed to complete calendar connection');
        } finally {
          setLoading(false);
        }
      };

      if (user) {
        handleCallback();
      }
    }
  }, [user, window.location.search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Calendar Integration</h3>
      <p className="text-sm text-gray-500">
        Connect your calendars to automatically sync meeting details
      </p>
      
      {/* Debug info - remove in production */}
      <div className="text-xs text-gray-400 mb-4">
        Connected calendars: {connectedCalendars.length}
        {connectedCalendars.map((cal, i) => (
          <div key={i}>{cal.type}: {cal.email}</div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Google Calendar */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calendar className="w-6 h-6 text-red-500" />
              <div>
                <h4 className="font-medium">Google Calendar</h4>
                {connectedCalendars.find(c => c.type === 'google') ? (
                  <p className="text-sm font-medium text-green-600">
                    Connected to {connectedCalendars.find(c => c.type === 'google')?.email}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">Not connected</p>
                )}
              </div>
            </div>
            <button
              onClick={handleGoogleConnect}
              className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              {connectedCalendars.find(c => c.type === 'google') ? 'Reconnect' : 'Connect'}
            </button>
          </div>
        </div>

        {/* Microsoft Calendar */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calendar className="w-6 h-6 text-blue-500" />
              <div>
                <h4 className="font-medium">Microsoft Calendar</h4>
                {connectedCalendars.find(c => c.type === 'microsoft') ? (
                  <p className="text-sm font-medium text-green-600">
                    Connected to {connectedCalendars.find(c => c.type === 'microsoft')?.email}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">Not connected</p>
                )}
              </div>
            </div>
            <button
              onClick={handleMicrosoftConnect}
              className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              {connectedCalendars.find(c => c.type === 'microsoft') ? 'Reconnect' : 'Connect'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
        </div>
      )}

      {/* Connection status message */}
      {connectedCalendars.length > 0 && (
        <div className="mt-4 p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-green-700">
            ✓ Calendar integration active. Your calendar events will now sync automatically.
          </p>
        </div>
      )}
    </div>
  );
}