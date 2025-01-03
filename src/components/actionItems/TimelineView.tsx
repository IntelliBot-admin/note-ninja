import { useState } from 'react';
import { format } from 'date-fns';
import { ActionItem } from '../../types/actionItem';
import { CheckCircle, Clock, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TimelineViewProps {
  items: ActionItem[];
  onToggleComplete: (item: ActionItem) => void;
  onEdit: (item: ActionItem) => void;
}

export default function TimelineView({ items, onToggleComplete, onEdit }: TimelineViewProps) {
  const navigate = useNavigate();
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ActionItem>>({});

  const sortedItems = [...items].sort((a, b) => {
    const dateA = a.dueDate instanceof Date ? a.dueDate : new Date(a.dueDate);
    const dateB = b.dueDate instanceof Date ? b.dueDate : new Date(b.dueDate);
    return dateA.getTime() - dateB.getTime();
  });

  const handleEditClick = (item: ActionItem) => {
    setEditingItemId(item.id);
    setEditForm(item);
  };

  const handleSaveEdit = () => {
    if (editForm) {
      onEdit(editForm as ActionItem);
      setEditingItemId(null);
      setEditForm({});
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No action items found
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm border p-6">
      <div className="relative">
        {/* Vertical Timeline Line */}
        <div className="absolute left-2.5 top-0 h-full w-0.5 bg-blue-200" />

        {/* Timeline Items */}
        <div className="space-y-8">
          {sortedItems.map((item) => (
            <div key={item.id} className="relative pl-10">
              {/* Timeline Dot */}
              <div className="absolute left-0 w-5 h-5 rounded-full bg-blue-500 border-4 border-white shadow" />

              {/* Content */}
              <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                {editingItemId === item.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editForm.title || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-2 py-1 text-sm border rounded"
                    />
                    <textarea
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-2 py-1 text-sm border rounded"
                    />
                    <input
                      type="datetime-local"
                      value={format(
                        editForm.dueDate instanceof Date ? editForm.dueDate : new Date(editForm.dueDate || ''),
                        "yyyy-MM-dd'T'HH:mm"
                      )}
                      onChange={(e) => setEditForm(prev => ({ ...prev, dueDate: new Date(e.target.value) }))}
                      className="w-full px-2 py-1 text-sm border rounded"
                    />
                    <div className="flex justify-end space-x-2 mt-2">
                      <button
                        onClick={() => {
                          setEditingItemId(null);
                          setEditForm({});
                        }}
                        className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 border rounded"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 
                        onClick={() => navigate(`/meeting/${item.meetingId}`)}
                        className={`font-medium cursor-pointer hover:text-indigo-600 ${
                          item.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'
                        }`}
                      >
                        {item.title}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onToggleComplete(item)}
                          className={`p-1 rounded-full ${
                            item.status === 'completed'
                              ? 'text-green-600 hover:text-green-700'
                              : 'text-gray-400 hover:text-gray-500'
                          }`}
                          title={item.status === 'completed' ? 'Mark as pending' : 'Mark as completed'}
                        >
                          {item.status === 'completed' ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            <Clock className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEditClick(item)}
                          className="p-1 text-gray-400 hover:text-indigo-600 rounded-full"
                          title="Edit action item"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-sm text-gray-500">
                      Due {format(
                        item.dueDate instanceof Date ? item.dueDate : new Date(item.dueDate),
                        'MMM d, yyyy'
                      )}
                    </div>

                    {item.description && (
                      <p className="mt-2 text-sm text-gray-600">{item.description}</p>
                    )}

                    {item.contacts && item.contacts.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.contacts.map((contact, index) => (
                          <div
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-xs text-gray-600"
                          >
                            {contact.photoUrl && (
                              <img
                                src={contact.photoUrl}
                                alt={contact.name}
                                className="w-4 h-4 rounded-full mr-1"
                              />
                            )}
                            {contact.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}