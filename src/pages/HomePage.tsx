import { useEffect, useState } from 'react';
import { getDocs } from 'firebase/firestore';
import { getMeetingsQuery } from '../lib/firebase';
import { useAuth } from '../components/auth/AuthProvider';
import { Link } from 'react-router-dom';
import { PlusCircle, Calendar } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';

interface Meeting {
  id: string;
  title: string;
  date: string;
  participants: string[];
}

export default function HomePage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    async function fetchMeetings() {
      if (!user) return;
      
      try {
        const meetingsQuery = getMeetingsQuery(user.uid);
        const querySnapshot = await getDocs(meetingsQuery);
        const meetingsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Meeting[];
        
        setMeetings(meetingsData);
      } catch (err: any) {
        console.error('Error fetching meetings:', err);
        setError('Failed to load meetings. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchMeetings();
  }, [user]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Meetings</h1>
        <Link
          to="/meeting/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          New Meeting
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {meetings.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No meetings yet</h3>
          <p className="text-gray-500">
            Create your first meeting by clicking the "New Meeting" button above.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {meetings.map((meeting) => (
            <Link
              key={meeting.id}
              to={`/meeting/${meeting.id}`}
              className="block p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {meeting.title}
              </h3>
              <p className="text-gray-600 mb-4">
                {new Date(meeting.date).toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              {meeting.participants.length > 0 && (
                <div className="text-sm text-gray-500">
                  {meeting.participants.length} participant{meeting.participants.length !== 1 ? 's' : ''}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}