import { Calendar, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import {  handleGoogle, handleMicrosoft, disconnectGoogle, disconnectMicrosoft } from '../../utils/calendarAuth';

import { useConnectedCalendars } from '../../hooks/useCalender';
import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';


export default function CalendarSettings() {
  const { user } = useAuthStore();
  const { connectedCalendars, loading } = useConnectedCalendars(user?.uid);
  const [searchParams] = useSearchParams();
  const [disconnectingIds, setDisconnectingIds] = useState<string[]>([]);

  useEffect(() => {
    const error = searchParams.get('error');
    const success = searchParams.get('success');

    if (error) {
      const errorMessages: { [key: string]: string } = {
        'token_exchange_failed': 'Failed to connect to Microsoft calendar. Please try again.',
        'no_code_or_state': 'Authentication failed. Missing required parameters.',
        'invalid_state': 'Invalid authentication state. Please try again.',
        'no_user_id': 'User ID not found. Please try again.',
        'server_error': 'Server error occurred. Please try again later.',
        'default': 'An error occurred while connecting your calendar.'
      };

      toast.error(errorMessages[error] || errorMessages.default);
    }

    if (success) {
      toast.success('Calendar connected successfully!');
    }
  }, [searchParams, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  const handleDisconnectGoogle = async (calendarId: string) => {
    try {
      setDisconnectingIds(prev => [...prev, calendarId]);
      await disconnectGoogle(calendarId);
      // The useConnectedCalendars hook should automatically refresh
    } catch (error) {
      console.error('Failed to disconnect Google calendar:', error);
    } finally {
      setDisconnectingIds(prev => prev.filter(id => id !== calendarId));
    }
  };

  const handleDisconnectMicrosoft = async (calendarId: string) => {
    try {
      setDisconnectingIds(prev => [...prev, calendarId]);
      await disconnectMicrosoft(calendarId);
      // The useConnectedCalendars hook should automatically refresh
    } catch (error) {
      console.error('Failed to disconnect Microsoft calendar:', error);
    } finally {
      setDisconnectingIds(prev => prev.filter(id => id !== calendarId));
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Calendar Integration</h3>
      <p className="text-sm text-gray-500">
        Connect your calendars to automatically sync meeting details
      </p>
      

      <div className="grid gap-4">
        {/* Google Calendar Section */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Calendar className="w-6 h-6 text-red-500" />
              <h4 className="font-medium">Google Calendars</h4>
            </div>
            <button
              onClick={handleGoogle}
              className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              {connectedCalendars.some(calendar => calendar.type === 'google') 
                ? 'Connect Another' 
                : 'Connect'}
            </button>
          </div>
          
          <div className="space-y-3">
            {connectedCalendars
              .filter(calendar => calendar.type === 'google')
              .map(calendar => (
                <div key={calendar.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                  <p className="text-sm font-medium text-gray-900">{calendar.email}</p>
                  <button
                    onClick={() => handleDisconnectGoogle(calendar.id)}
                    disabled={disconnectingIds.includes(calendar.id)}
                    className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-600 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {disconnectingIds.includes(calendar.id) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Disconnect'
                    )}
                  </button>
                </div>
              ))}
          </div>
        </div>

        {/* Microsoft Calendar Section */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Calendar className="w-6 h-6 text-blue-500" />
              <h4 className="font-medium">Microsoft Calendars</h4>
            </div>
            <button
              onClick={handleMicrosoft}
              className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              {connectedCalendars.some(calendar => calendar.type === 'microsoft') 
                ? 'Connect Another' 
                : 'Connect'}
            </button>
          </div>

          <div className="space-y-3">
            {connectedCalendars
              .filter(calendar => calendar.type === 'microsoft')
              .map(calendar => (
                <div key={calendar.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                  <p className="text-sm font-medium text-gray-900">{calendar.email}</p>
                  <button
                    onClick={() => handleDisconnectMicrosoft(calendar.id)}
                    disabled={disconnectingIds.includes(calendar.id)}
                    className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-600 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {disconnectingIds.includes(calendar.id) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Disconnect'
                    )}
                  </button>
                </div>
              ))}
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