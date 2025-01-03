import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, X, Edit2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { ActionItem } from '../../types/actionItem';
import { useKanbanStore, KanbanColumn } from '../../store/kanbanStore';
import { useActionItemStore } from '../../store/actionItemStore';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface Column {
  id: string;
  title: string;
  items: ActionItem[];
}

interface KanbanBoardProps {
  items: ActionItem[];
  onStatusChange: (itemId: string, newStatus: string) => Promise<void>;
  onEdit: (item: ActionItem) => void;
}

export default function KanbanBoard({ items, onStatusChange, onEdit }: KanbanBoardProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { columns: savedColumns, fetchColumns, addColumn, removeColumn } = useKanbanStore();
  const [columns, setColumns] = useState<Column[]>([
    { id: 'kanban-col-pending', title: 'Pending', items: items.filter(item => item.status === 'pending') },
    { id: 'kanban-col-completed', title: 'Completed', items: items.filter(item => item.status === 'completed') },
    { id: 'kanban-col-cancelled', title: 'Cancelled', items: items.filter(item => item.status === 'cancelled') }
  ]);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [showNewColumnForm, setShowNewColumnForm] = useState(false);
  const { setShowForm, setFormData } = useActionItemStore();

  useEffect(() => {
    if (user) {
      fetchColumns(user.uid);
    }
    // Cleanup not needed since we're not using onSnapshot anymore
  }, [user, fetchColumns]);

  // Update columns when savedColumns or items change
  useEffect(() => {
    const defaultColumns = [
      { id: 'kanban-col-pending', title: 'Pending', items: items.filter(item => item.status === 'pending') },
      { id: 'kanban-col-completed', title: 'Completed', items: items.filter(item => item.status === 'completed') },
      { id: 'kanban-col-cancelled', title: 'Cancelled', items: items.filter(item => item.status === 'cancelled') }
    ];

    // Combine default columns with saved custom columns
    const customColumns = savedColumns.map(col => ({
      id: col.id,
      title: col.title,
      items: items.filter(item => item.status === col.id.replace('kanban-col-', ''))
    }));

    setColumns([...defaultColumns, ...customColumns]);
  }, [savedColumns, items]);
  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    // Save current columns state for rollback
    const previousColumns = [...columns];

    const sourceCol = columns.find(col => col.id === source.droppableId);
    const destCol = columns.find(col => col.id === destination.droppableId);

    if (!sourceCol || !destCol) return;

    // Create copies of the arrays
    const sourceItems = Array.from(sourceCol.items);
    const destItems = source.droppableId === destination.droppableId 
      ? sourceItems 
      : Array.from(destCol.items);

    // Get the moved item
    const [removed] = sourceItems.splice(source.index, 1);
    destItems.splice(destination.index, 0, removed);

    // Update columns state optimistically
    const newColumns = columns.map(col => {
      if (col.id === source.droppableId) {
        return { ...col, items: sourceItems };
      }
      if (col.id === destination.droppableId) {
        return { ...col, items: destItems };
      }
      return col;
    });

    // Map column IDs to status values
    const statusMap: Record<string, string> = {
      'kanban-col-pending': 'pending',
      'kanban-col-completed': 'completed',
      'kanban-col-cancelled': 'cancelled'
    };

    // Update UI immediately
    setColumns(newColumns);

    try {
      // Extract new status from destination column ID
      const newStatus = statusMap[destination.droppableId] || destination.droppableId.replace('kanban-col-', '');
      
      // Update item status in Firebase
      await onStatusChange(removed.id, newStatus);
    } catch (error) {
      // Rollback on error
      setColumns(previousColumns);
      toast.error('Failed to update item status');
    }
  };

  const handleAddColumn = async () => {
    if (!newColumnTitle.trim()) return;
    
    try {
      const columnId = `kanban-col-${newColumnTitle.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
      await addColumn({
        title: newColumnTitle.trim(),
        order: columns.length,
        userId: user!.uid
      });

      setNewColumnTitle('');
      setShowNewColumnForm(false);
    } catch (error) {
      console.error('Error adding column:', error);
      toast.error('Failed to add new column');
    }
  };

  const handleRemoveColumn = async (columnId: string) => {
    const defaultColumns = ['kanban-col-pending', 'kanban-col-completed', 'kanban-col-cancelled'];
    
    if (defaultColumns.includes(columnId)) {
      toast.error('Cannot remove default columns');
      return;
    }

    const column = columns.find(col => col.id === columnId);
    if (!column) {
      toast.error('Column not found');
      return;
    }

    if (column.items.length > 0) {
      toast.error('Cannot remove column with items');
      return;
    }

    try {
      await removeColumn(columnId);
      toast.success('Column removed successfully');
      
      // Update local state
      setColumns(prevColumns => prevColumns.filter(col => col.id !== columnId));
    } catch (error) {
      console.error('Error removing column:', error);
      toast.error('Failed to remove column');
    }
  };
const handleEditClick = (item: ActionItem) => {
  setShowForm(true);
  setFormData({
    meetingId: item.meetingId, // Added meetingId
    title: item.title,
    description: item.description || '',
    priority: item.priority,
    dueDate: format(
      item.dueDate instanceof Date ? item.dueDate : new Date(item.dueDate), 
      "yyyy-MM-dd'T'HH:mm"
    ),
    status: item.status,
    contacts: item.contacts || []
  });
};


  return (
    <div className="h-full overflow-x-auto">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 p-4 min-h-[calc(100vh-12rem)]">
          {columns.map(column => (
            <div
              key={`column-${column.id}`}
              className="flex-shrink-0 w-80 bg-gray-100 rounded-lg p-4"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-gray-900">{column.title}</h3>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-2">
                    {column.items.length}
                  </span>
                  {!column.id.startsWith('kanban-col-') && (
                    <button
                      onClick={() => handleRemoveColumn(column.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <Droppable droppableId={column.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-2 min-h-[200px]"
                  >
                    {column.items.map((item, index) => (
                      <Draggable
                        key={`item-${item.id}`}
                        draggableId={item.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-white p-3 rounded-lg shadow-sm ${
                              snapshot.isDragging ? 'shadow-lg' : ''
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <h4 
                                onClick={() => navigate(`/meeting/${item.meetingId}`)}
                                className="text-sm font-medium text-gray-900 hover:text-indigo-600 cursor-pointer"
                              >
                                {item.title}
                              </h4>
                              <button
                                onClick={() => handleEditClick(item)}
                                className="text-gray-400 hover:text-indigo-600"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                            {item.description && (
                              <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                                {item.description}
                              </p>
                            )}
                            <div className="mt-2 flex items-center text-xs text-gray-500">
                              <span>
                                Due: {new Date(item.dueDate).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}

          <div className="flex-shrink-0 w-80">
            {showNewColumnForm ? (
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <input
                  type="text"
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  placeholder="Enter column title"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
                <div className="mt-2 flex justify-end space-x-2">
                  <button
                    onClick={() => setShowNewColumnForm(false)}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddColumn}
                    disabled={!newColumnTitle.trim()}
                    className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Add Column
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewColumnForm(true)}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-500 hover:text-indigo-500 transition-colors"
              >
                <Plus className="w-5 h-5 mx-auto" />
                <span className="mt-1 block text-sm">Add Column</span>
              </button>
            )}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}