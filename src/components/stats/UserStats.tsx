import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { FileText, CheckSquare, Calendar } from 'lucide-react';

interface UserStatsProps {
  userId: string;
  isSidebarLayout?: boolean;
}

export default function UserStats({ userId, isSidebarLayout = false }: UserStatsProps) {
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
        <div className="flex items-center justify-between p-3 rounded-lg bg-white/50">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            <span className="text-sm text-gray-600">{stats.totalMeetings} Meetings</span>
            {stats.totalMinutes > 0 && (
              <span className="text-xs text-gray-400">({Math.round(stats.totalMinutes)} mins)</span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-white/50">
          <div className="flex items-center space-x-2">
            <CheckSquare className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-600">{stats.completedActionItems}/{stats.totalActionItems} Tasks</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hidden lg:flex items-center space-x-6 px-4 py-1.5 bg-gray-50/50 rounded-full border border-gray-200/50">
      <div className="flex items-center space-x-1.5 text-xs text-gray-600">
        <FileText className="w-3.5 h-3.5 text-indigo-500" />
        <span>{stats.totalMeetings} Meetings</span>
        {stats.totalMinutes > 0 && (
          <span className="text-gray-400">({Math.round(stats.totalMinutes)} mins)</span>
        )}
      </div>
      <div className="flex items-center space-x-1.5 text-xs text-gray-600">
        <CheckSquare className="w-3.5 h-3.5 text-green-500" />
        <span>{stats.completedActionItems}/{stats.totalActionItems} Tasks</span>
      </div>
    </div>
  );
}