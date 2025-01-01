import React, { useState } from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, isToday } from 'date-fns';
import { ActionItem } from '../../types/actionItem';
import { CheckCircle, Clock, Edit2 } from 'lucide-react';
import { priorityColors } from '../../types/actionItem';
import ActionItemForm from './ActionItemForm';

interface ActionItemCalendarViewProps {
  items: ActionItem[];
  onToggleComplete: (item: ActionItem) => void;
  onEdit: (item: ActionItem) => void;
}

export default function ActionItemCalendarView({ items, onToggleComplete, onEdit }: ActionItemCalendarViewProps) {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const [editingItem, setEditingItem] = useState<ActionItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const getDayItems = (date: Date) => {
    return items.filter(item => {
      const itemDate = item.dueDate instanceof Date ? item.dueDate : new Date(item.dueDate);
      return isSameDay(itemDate, date);
    });
  };

  const handleEditClick = (item: ActionItem) => {
    setEditingItem(item);
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditingItem(null);
  };

  const getWeeks = () => {
    const weeks = [];
    let currentWeek = [];

    // Add empty days for the first week
    const firstDay = days[0].getDay();
    for (let i = 0; i < firstDay; i++) {
      currentWeek.push(null);
    }

    // Add all days of the month
    days.forEach(day => {
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(day);
    });

    // Add empty days for the last week
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);

    return weeks;
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {format(today, 'MMMM yyyy')}
          </h2>
        </div>
        <div className="border-b grid grid-cols-7 gap-px bg-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="bg-white p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {getWeeks().map((week, weekIndex) => (
            week.map((day, dayIndex) => (
              <div
                key={`${weekIndex}-${dayIndex}`}
                className={`bg-white min-h-[120px] p-2 ${
                  day && isToday(day) ? 'bg-blue-50' : ''
                }`}
              >
                {day && (
                  <>
                    <p className={`text-sm font-medium ${
                      isToday(day) ? 'text-blue-600' : 'text-gray-900'
                    }`}>
                      {format(day, 'd')}
                    </p>
                    <div className="mt-1 space-y-1">
                      {getDayItems(day).map(item => (
                        <div
                          key={item.id}
                          className={`group p-1 rounded text-xs ${
                            item.status === 'completed' ? 'bg-gray-100' : priorityColors[item.priority]
                          } hover:ring-2 hover:ring-indigo-500 hover:ring-opacity-50 cursor-pointer transition-all`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(item);
                          }}
                        >
                          <div className="flex items-center justify-between space-x-1">
                            <div className="flex items-center min-w-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleComplete(item);
                                }}
                                className={`flex-shrink-0 mr-1 ${
                                  item.status === 'completed' 
                                    ? 'text-green-600' 
                                    : 'text-gray-400 hover:text-green-600'
                                }`}
                              >
                                {item.status === 'completed' ? (
                                  <CheckCircle className="w-4 h-4" />
                                ) : (
                                  <Clock className="w-4 h-4" />
                                )}
                              </button>
                              <span 
                                className={`truncate ${
                                  item.status === 'completed' ? 'line-through text-gray-500' : ''
                                }`}
                                title={item.title}
                              >
                                {item.title}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(item);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-indigo-600"
                              title="Edit action item"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
            <ActionItemForm
              meetingId={editingItem.meetingId}
              onClose={handleCloseModal}
              editingItem={editingItem}
            />
          </div>
        </div>
      )}
    </>
  );
}