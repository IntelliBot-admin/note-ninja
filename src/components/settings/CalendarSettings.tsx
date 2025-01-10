import { Calendar, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import {  handleGoogle, handleMicrosoft, disconnectGoogle, disconnectMicrosoft } from '../../utils/calendarAuth';

import { useConnectedCalendars } from '../../hooks/useCalender';

export default function CalendarSettings() {
  const { user } = useAuthStore();
  const { connectedCalendars, loading } = useConnectedCalendars(user?.uid);


  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  const handleDisconnectGoogle = async () => {
    try {
      await disconnectGoogle();
      // The useConnectedCalendars hook should automatically refresh
    } catch (error) {
      console.error('Failed to disconnect Google calendar:', error);
    }
  };

  const handleDisconnectMicrosoft = async () => {
    try {
      await disconnectMicrosoft();
      // The useConnectedCalendars hook should automatically refresh
    } catch (error) {
      console.error('Failed to disconnect Microsoft calendar:', error);
    }
  };

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
            <div className="flex items-center space-x-2">
              {connectedCalendars.find(c => c.type === 'google') ? (
                <button
                  onClick={handleDisconnectGoogle}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-600 rounded-md hover:bg-red-50"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={handleGoogle}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  Connect
                </button>
              )}
            </div>
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
            <div className="flex items-center space-x-2">
              {connectedCalendars.find(c => c.type === 'microsoft') ? (
                <button
                  onClick={handleDisconnectMicrosoft}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-600 rounded-md hover:bg-red-50"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={handleMicrosoft}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  Connect
                </button>
              )}
            </div>
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