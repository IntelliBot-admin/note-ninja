import React, { useState, useEffect } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { useActionItemStore } from '../../store/actionItemStore';
import { useAuthStore } from '../../store/authStore';
import { ActionItem, priorityColors } from '../../types/actionItem';
import { List, Search, Plus, Clock, CheckCircle, XCircle, Edit2 } from 'lucide-react';
import ActionItemForm from './ActionItemForm';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

interface ActionItemListProps {
  meetingId: string;
}

export default function ActionItemList({ meetingId }: ActionItemListProps) {
  const { user } = useAuthStore();
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  // const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ActionItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list'>('list');
  const { getActionItemsQuery, toggleComplete, showForm, setShowForm } = useActionItemStore();

  useEffect(() => {
    if (!user) return;

    const query = getActionItemsQuery(meetingId, user.uid);
    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        const actionItems = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          dueDate: doc.data().dueDate?.toDate() || new Date()
        })) as ActionItem[];
        setItems(actionItems);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching action items:', error);
        toast.error('Failed to load action items');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [meetingId, user, getActionItemsQuery]);

  const handleEdit = (item: ActionItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const getDueDateLabel = (date: Date) => {
    try {
      const formattedDate = format(date, 'MMM d, yyyy');
      const timeToDate = formatDistanceToNow(date, { addSuffix: true });
      return `${formattedDate} (${timeToDate})`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const handleToggleComplete = async (item: ActionItem) => {
    try {
      await toggleComplete(item.id, item.status);
    } catch (error) {
      console.error('Error toggling item status:', error);
      toast.error('Failed to update item status');
    }
  };

  const filteredItems = items.filter(item => {
    const searchString = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(searchString) ||
      item.description?.toLowerCase().includes(searchString) ||
      item.priority.toLowerCase().includes(searchString) ||
      (item.contacts?.some(contact => 
        contact.name.toLowerCase().includes(searchString) ||
        contact.email?.toLowerCase().includes(searchString)
      ))
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search action items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Action Item
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
            <ActionItemForm
              meetingId={meetingId}
              onClose={handleFormClose}
              editingItem={editingItem}
            />
          </div>
        </div>
      )}

      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No action items found</p>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${
                item.status === 'completed' ? 'border-green-500' : 'border-indigo-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className={`text-lg font-medium ${
                      item.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'
                    }`}>
                      {item.title}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[item.priority]}`}>
                      {item.priority}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                  {item.contacts?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.contacts.map((contact, index) => (
                        <div key={index} className="text-sm text-gray-500 flex items-center">
                          {contact.photoUrl ? (
                            <img 
                              src={contact.photoUrl} 
                              alt={contact.name}
                              className="w-5 h-5 rounded-full mr-1"
                            />
                          ) : null}
                          {contact.name}
                          {contact.email && ` (${contact.email})`}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-1" />
                    {getDueDateLabel(item.dueDate as Date)}
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleToggleComplete(item)}
                    className={`p-1 rounded-full ${
                      item.status === 'completed'
                        ? 'text-green-600 hover:text-green-700'
                        : 'text-gray-400 hover:text-gray-500'
                    }`}
                    title={item.status === 'completed' ? 'Mark as pending' : 'Mark as completed'}
                  >
                    {item.status === 'completed' ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <XCircle className="w-6 h-6" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-2 text-gray-400 hover:text-indigo-600 rounded-full hover:bg-gray-100"
                    title="Edit action item"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}