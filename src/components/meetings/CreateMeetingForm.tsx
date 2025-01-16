import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useMeetingStore } from '../../store/meetingStore';
import { useCategories } from '../../hooks/useCategories';
import { PlusCircle, FileUp, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Timestamp } from 'firebase/firestore';
import ICAL from 'ical.js';

export default function CreateMeetingForm() {
  const [title, setTitle] = useState('Placeholder Title');
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addMeeting } = useMeetingStore();
  const { categories } = useCategories();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to create a meeting');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a meeting title');
      return;
    }

    setLoading(true);
    try {
      const meetingRef = await addMeeting({
        title: title.trim(),
        userId: user.uid,
        categoryId: categoryId || 'general',
        participants: [],
        content: '',
        createDate: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      
      toast.success('Meeting created successfully');
      navigate(`/meeting/${meetingRef.id}`);
    } catch (error: any) {
      console.error('Error creating meeting:', error);
      toast.error(error.message || 'Failed to create meeting');
    } finally {
      setLoading(false);
    }
  };

  const parseICSFile = (file: File): Promise<{
    title: string;
    startDate: Date;
    endDate: Date;
    description: string;
    location: string;
    attendees: Array<{ email: string; role: 'organizer' | 'attendee' }>;
  }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const icsData = e.target?.result as string;
          const jcalData = ICAL.parse(icsData);
          const comp = new ICAL.Component(jcalData);
          const vevent = comp.getFirstSubcomponent('vevent');

          if (!vevent) {
            throw new Error('No event found in ICS file');
          }

          const event = new ICAL.Event(vevent);
          
          const attendees = vevent.getAllProperties('attendee').map(attendee => {
            const email = attendee.getFirstValue()?.toString().replace('mailto:', '');
            const participationStatus = attendee.getParameter('partstat');
            const role = attendee.getParameter('role');
            const cn = attendee.getParameter('cn');
            
            console.log('Attendee debug:', { email, role, participationStatus, cn });
            
            if (!email) {
              return null;
            }

            return {
              email,
              role: (role?.toLowerCase() === 'chair' || role?.toLowerCase() === 'req-participant') 
                ? 'organizer' 
                : 'attendee'
            } as const;
          }).filter(Boolean) as Array<{ email: string; role: 'organizer' | 'attendee' }>;

          const organizer = vevent.getFirstProperty('organizer');
          if (organizer) {
            const organizerEmail = organizer.getFirstValue()?.toString().replace('mailto:', '');
            const organizerCN = organizer.getParameter('cn');
            
            console.log('Organizer debug:', { organizerEmail, organizerCN });
            
            if (organizerEmail && !attendees.some(a => a.email === organizerEmail)) {
              attendees.push({
                email: organizerEmail,
                role: 'organizer'
              });
            }
          }

          resolve({
            title: event.summary || 'Untitled Event',
            startDate: event.startDate.toJSDate(),
            endDate: event.endDate.toJSDate(),
            description: event.description || '',
            location: event.location || '',
            attendees
          });
        } catch (error) {
          console.error('ICS Parse Error:', error);
          reject(new Error('Failed to parse ICS file'));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const handleICSFile = async (file: File) => {
    if (!user) {
      toast.error('You must be logged in to import meetings');
      return;
    }

    if (file.type !== 'text/calendar' && !file.name.endsWith('.ics')) {
      toast.error('Please upload a valid ICS file');
      return;
    }

    setIsProcessing(true);
    try {
      const parsedEvent = await parseICSFile(file);
      
      console.log(parsedEvent,'parsed ics');
      


      const meetingRef = await addMeeting({
        title: parsedEvent.title,
        userId: user.uid,
        participants: parsedEvent.attendees,
        content: parsedEvent.description,
        startTime: parsedEvent.startDate,
        endTime: parsedEvent.endDate,
        createDate: new Date(),
        updatedAt: new Date()
      });
      
      toast.success('Calendar event imported successfully');
      navigate(`/meeting/${meetingRef.id}`);
    } catch (error: any) {
      console.error('Error importing calendar event:', error);
      toast.error(error.message || 'Failed to import calendar event');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Meeting</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Meeting Name
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Enter meeting name"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or import from calendar</span>
            </div>
          </div>

          <div
            className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
              transition-colors duration-200
              ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}
              ${isProcessing ? 'cursor-not-allowed opacity-75' : ''}
            `}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            onDragEnter={() => setIsDragActive(true)}
            onDragLeave={() => setIsDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragActive(false);
              const file = e.dataTransfer.files[0];
              if (file) handleICSFile(file);
            }}
            onDragOver={(e) => e.preventDefault()}
          >
            {isProcessing ? (
              <div className="space-y-3">
                <Loader2 className="w-8 h-8 mx-auto text-indigo-500 animate-spin" />
                <p className="text-indigo-600 font-medium">Processing calendar file...</p>
              </div>
            ) : (
              <>
                <FileUp className="w-8 h-8 mx-auto text-gray-400 mb-3" />
                {isDragActive ? (
                  <p className="text-indigo-600">Drop the ICS file here...</p>
                ) : (
                  <div className="space-y-1">
                    <p className="text-gray-600">Drag and drop an ICS file here, or click to select</p>
                    <p className="text-sm text-gray-500">Supports .ics calendar files</p>
                  </div>
                )}
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".ics"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleICSFile(file);
              }}
              disabled={isProcessing}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                'Creating...'
              ) : (
                <>
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Create Meeting
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}