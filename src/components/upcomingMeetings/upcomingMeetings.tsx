import { useEffect, useState } from 'react';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { getCalendarEvents, initializeMsal } from '../../utils/calendarAuth';
import { useConnectedCalendars } from '../../hooks/useCalender';
import { useAuthStore } from '../../store/authStore';
import { Calendar, Loader2, MapPin, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMsalStore } from '../../store/msalStore';
import { BsMicrosoftTeams } from 'react-icons/bs';
import { SiGooglemeet } from 'react-icons/si';
import { useMeetingStore } from '../../store/meetingStore';

interface CalendarEvent {
   id: string;
   title: string;
   startTime: string;
   endTime: string;
   location?: string;
   participants: Array<{
      name: string;
      email: string;
      status: string;
      type: string;
   }>;
   source: 'google' | 'microsoft';
}

export default function UpcomingMeetings() {
   const [events, setEvents] = useState<CalendarEvent[]>([]);
   const [loading, setLoading] = useState(true);
   const { user } = useAuthStore();
   const { connectedCalendars } = useConnectedCalendars(user?.uid);
   const { isInitialized } = useMsalStore.getState();
   const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
   const { addMeeting } = useMeetingStore();

   const handleAddToCalendar = async (event: CalendarEvent) => {
      if (!user?.uid) {
         toast.error('You must be logged in to add events');
         return;
      }

      try {
         const formattedMeeting = {
            userId: user.uid,
            title: event.title,
            date: format(new Date(event.startTime), 'yyyy-MM-dd'),
            startTime: new Date(event.startTime),
            endTime: new Date(event.endTime),
            location: event.location || '',
            participants: event.participants.map(p => ({
               email: p.email,
               role: p.type.toLowerCase() === 'organizer' ? 'organizer' : 'attendee'
            })),
            content: '',
            externalEventId: event.id
         };

         await addMeeting(formattedMeeting);
         toast.success('Meeting added to calendar');
      } catch (error) {
         console.error('Error adding event to calendar:', error);
         toast.error('Failed to add event to calendar');
      }
   };

   useEffect(() => {
      async function fetchEvents() {
         try {
            const hasGoogle = connectedCalendars.some(cal => cal.type === 'google');
            const hasMicrosoft = connectedCalendars.some(cal => cal.type === 'microsoft');

            const response = await getCalendarEvents({
               google: hasGoogle,
               microsoft: hasMicrosoft
            });

            // Sort events by start time
            const sortedEvents = response.events.sort((a: any, b: any) =>
               new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            );

            setEvents(sortedEvents);
            console.log('events', sortedEvents);
         } catch (error) {
            console.error('Error fetching calendar events:', error);
            toast.error('Failed to load calendar events');
         } finally {
            setLoading(false);
         }
      }

      if (!isInitialized) {
         initializeMsal();
      }

      if (connectedCalendars.length > 0) {
         console.log('fetching events');

         fetchEvents();
      } else {
         setLoading(false);
      }
   }, [connectedCalendars, isInitialized]);

   const formatEventDate = (dateStr: string) => {
      const date = parseISO(dateStr);
      if (isToday(date)) {
         return `Today, ${format(date, 'h:mm a')}`;
      } else if (isTomorrow(date)) {
         return `Tomorrow, ${format(date, 'h:mm a')}`;
      }
      return format(date, 'MMM d, h:mm a');
   };

   const toggleEventExpansion = (eventId: string) => {
      setExpandedEvents(prev => {
         const newSet = new Set(prev);
         if (newSet.has(eventId)) {
            newSet.delete(eventId);
         } else {
            newSet.add(eventId);
         }
         return newSet;
      });
   };

   if (loading) {
      return (
         <div className="flex items-center justify-center p-4">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
         </div>
      );
   }

   if (events.length === 0) {
      return (
         <div className="text-center p-4 text-gray-500">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>No upcoming meetings</p>
         </div>
      );
   }

   return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
         <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
               <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Upcoming Meetings
               </h2>
            </div>
         </div>
         <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {events.slice(0, 5).map((event) => (
               <div key={event.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="flex items-start space-x-3">
                     <div className="flex-shrink-0">
                        {event.source === 'google' ? (
                           <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                              <SiGooglemeet className="w-4 h-4 text-red-600 dark:text-red-400" />
                           </div>
                        ) : (
                           <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                              <BsMicrosoftTeams className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                           </div>
                        )}
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                           <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {event.title}
                           </p>
                           <Plus onClick={() => handleAddToCalendar(event)} className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer ml-2 flex-shrink-0" />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                           {formatEventDate(event.startTime)}
                        </p>
                        {event.location && (
                           <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
                              <MapPin className="w-3 h-3 mr-1" />
                              <span className="truncate">{event.location}</span>
                           </div>
                        )}
                        <div className="mt-1 flex items-center justify-between">
                           <p className="text-xs text-gray-500 dark:text-gray-400">
                              {event.participants.length} participant{event.participants.length !== 1 ? 's' : ''}
                           </p>
                           <button
                              onClick={() => toggleEventExpansion(event.id)}
                              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center"
                           >
                              {expandedEvents.has(event.id) ? (
                                 <ChevronUp className="w-4 h-4" />
                              ) : (
                                 <ChevronDown className="w-4 h-4" />
                              )}
                           </button>
                        </div>

                        {expandedEvents.has(event.id) && (
                           <div className="mt-2 space-y-1 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-md">
                              {event.participants.map((participant, index) => (
                                 <div
                                    key={index}
                                    className="text-xs flex items-center justify-between py-1"
                                 >
                                    <div className="flex-1 min-w-0 mr-2">
                                       <span className="text-gray-900 dark:text-gray-100">
                                          {participant.name || participant.email}
                                       </span>
                                       {participant.name && (
                                          <span className="text-gray-500 dark:text-gray-400 ml-2">
                                             ({participant.email})
                                          </span>
                                       )}
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${participant.status.toLowerCase() === 'accepted'
                                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                          : participant.status.toLowerCase() === 'declined'
                                             ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                             : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                       }`}>
                                       {participant.status}
                                    </span>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            ))}
         </div>
      </div>
   );
}