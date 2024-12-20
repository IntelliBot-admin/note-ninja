import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { Meeting } from '../../types/meeting';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarViewProps {
  meetings: Meeting[];
}

export default function CalendarView({ meetings }: CalendarViewProps) {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getMeetingsForDay = (date: Date) => {
    return meetings.filter(meeting => {
      const meetingDate = new Date(meeting.createDate.toDate());
      return isSameDay(meetingDate, date);
    });
  };

  const nextMonth = () => {
    setCurrentDate(current => addMonths(current, 1));
  };

  const previousMonth = () => {
    setCurrentDate(current => subMonths(current, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex-1 text-center">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={previousMonth}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-white dark:bg-gray-800 p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700">
        {days.map(day => {
          const dayMeetings = getMeetingsForDay(day);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={`bg-white dark:bg-gray-800 min-h-[120px] p-2 ${
                isCurrentDay ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
            >
              <p className={`text-sm font-medium ${
                isCurrentDay 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-900 dark:text-gray-100'
              }`}>
                {format(day, 'd')}
              </p>
              
              <div className="mt-1 space-y-1">
                {dayMeetings.map(meeting => (
                  <button
                    key={meeting.id}
                    onClick={() => navigate(`/meeting/${meeting.id}`)}
                    className="w-full text-left p-1 rounded text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                  >
                    <div className="truncate font-medium">
                      {meeting.title}
                    </div>
                    <div className="text-indigo-600/70 dark:text-indigo-400/70 text-[10px]">
                      {format(meeting.createDate.toDate(), 'h:mm a')}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}