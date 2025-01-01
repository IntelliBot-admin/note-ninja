import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
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
    async function fetchStats() {
      try {
        // Get meetings count
        const meetingsQuery = query(
          collection(db, 'meetings'),
          where('userId', '==', userId)
        );
        const meetingsSnapshot = await getDocs(meetingsQuery);
        
        // Calculate total minutes from all meetings
        let totalMinutes = 0;
        meetingsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.duration) {
            totalMinutes += data.duration;
          }
        });
        
        // Get action items stats
        const actionItemsQuery = query(
          collection(db, 'actionItems'),
          where('userId', '==', userId)
        );
        const actionItemsSnapshot = await getDocs(actionItemsQuery);
        const completedItems = actionItemsSnapshot.docs.filter(
          doc => doc.data().status === 'completed'
        ).length;

        setStats({
          totalMeetings: meetingsSnapshot.size,
          totalActionItems: actionItemsSnapshot.size,
          completedActionItems: completedItems,
          totalMinutes: totalMinutes
        });
      } catch (error) {
        console.error('Error fetching user stats:', error);
      }
    }

    fetchStats();
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
            <span className="text-sm text-gray-600">{stats.completedActionItems}/{stats.totalActionItems} Tasks</span>
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
        <span className="text-sm text-gray-600">{stats.completedActionItems}/{stats.totalActionItems} Tasks</span>
      </button>
    </div>
  );
}