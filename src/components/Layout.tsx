import React from 'react';
import { Mic, FileText, Link2, CheckSquare, LayoutDashboard } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const navItems = [
  { icon: LayoutDashboard, label: 'Lobby', path: '/' }
];

// These icons are used in the meeting detail view
export const meetingTools = [
  { icon: Mic, label: 'Record Audio', action: 'record' },
  { icon: FileText, label: 'Meeting Notes', action: 'notes' },
  { icon: Link2, label: 'Files & URLs', action: 'files' },
  { icon: CheckSquare, label: 'Action Items', action: 'actions' }
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-16 bg-white shadow-lg flex flex-col items-center py-4 space-y-6">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className={`p-3 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-indigo-100 text-indigo-600' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={item.label}
            >
              <Icon className="w-6 h-6" />
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </div>
    </div>
  );
}