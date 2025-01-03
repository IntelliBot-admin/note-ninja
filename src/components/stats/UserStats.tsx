import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { FileText, CheckSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UserStatsProps {
  userId: string;
  isSidebarLayout?: boolean;
}

export default function UserStats({ userId, isSidebarLayout = false }: UserStatsProps) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalMeetings: 0,
    totalActionItems: 0,
    completedActionItems: 0,
    totalMinutes: 0
  });

  useEffect(() => {
    if (!userId) return;

    // Query for all action items for this user
    const actionItemsQuery = query(
      collection(db, 'actionItems'),
      where('userId', '==', userId)
    );

    // Listen for action items changes
    const unsubscribeActionItems = onSnapshot(actionItemsQuery, (snapshot) => {
      const completedItems = snapshot.docs.filter(
        doc => doc.data().status === 'completed'
      ).length;

      setStats(prev => ({
        ...prev,
        totalActionItems: snapshot.size,
        completedActionItems: completedItems
      }));
    });

    // Set up meetings listener
    const meetingsQuery = query(
      collection(db, 'meetings'),
      where('userId', '==', userId)
    );

    const unsubscribeMeetings = onSnapshot(meetingsQuery, (snapshot) => {
      let totalMinutes = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.duration) {
          totalMinutes += data.duration;
        }
      });

      setStats(prev => ({
        ...prev,
        totalMeetings: snapshot.size,
        totalMinutes
      }));
    });

    // Cleanup listeners
    return () => {
      unsubscribeMeetings();
      unsubscribeActionItems();
    };
  }, [userId]);

  if (isSidebarLayout) {
    return (
      <div className="flex-1 space-y-2 mb-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center justify-between w-full p-3 rounded-lg bg-white/50 hover:bg-indigo-50 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            <span className="text-sm text-gray-600">{stats.totalMeetings} Meetings</span>
          </div>
          {stats.totalMinutes > 0 && (
            <span className="text-xs text-gray-400">({Math.round(stats.totalMinutes)} mins)</span>
          )}
        </button>
        <button
          onClick={() => navigate('/calendar?view=kanban')}
          className="flex items-center justify-between w-full p-3 rounded-lg bg-white/50 hover:bg-indigo-50 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <CheckSquare className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-600">{stats.completedActionItems}/{stats.totalActionItems} Action Items</span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      <button
        onClick={() => navigate('/')}
        className="flex items-center space-x-2 px-3 py-1.5 bg-white rounded-full border border-gray-200 hover:bg-indigo-50 transition-colors"
      >
        <FileText className="w-4 h-4 text-indigo-500" />
        <span className="text-sm text-gray-600">{stats.totalMeetings} Meetings</span>
        {stats.totalMinutes > 0 && (
          <span className="text-xs text-gray-400">({Math.round(stats.totalMinutes)} mins)</span>
        )}
      </button>
      <button
        onClick={() => navigate('/calendar?view=kanban')}
        className="flex items-center space-x-2 px-3 py-1.5 bg-white rounded-full border border-gray-200 hover:bg-indigo-50 transition-colors"
      >
        <CheckSquare className="w-4 h-4 text-green-500" />
        <span className="text-sm text-gray-600">{stats.completedActionItems}/{stats.totalActionItems} Action Items</span>
      </button>
    </div>
  );
}