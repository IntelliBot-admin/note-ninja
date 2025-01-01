import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ActionItem, Priority, Contact } from '../../types/actionItem';
import { useActionItemStore } from '../../store/actionItemStore';
import { useAuthStore } from '../../store/authStore';
import { X, Plus } from 'lucide-react';
import ContactList from './ContactList';
import ContactForm from './ContactForm';
import toast from 'react-hot-toast';

interface ActionItemFormProps {
  meetingId: string;
  onClose: () => void;
  editingItem?: ActionItem | null;
}

export default function ActionItemForm({ meetingId, onClose, editingItem }: ActionItemFormProps) {
  const { user } = useAuthStore();
  const { addActionItem, updateActionItem } = useActionItemStore();
  const [loading, setLoading] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);

  // Initialize with current date formatted for datetime-local input
  const initialDate = format(new Date(), "yyyy-MM-dd'T'HH:mm");

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as Priority,
    dueDate: initialDate,
    status: 'pending',
    contacts: [] as Contact[]
  });

  useEffect(() => {
    if (editingItem) {
      const dueDate = editingItem.dueDate instanceof Date 
        ? editingItem.dueDate 
        : new Date(editingItem.dueDate);

      setFormData({
        title: editingItem.title,
        description: editingItem.description || '',
        priority: editingItem.priority,
        dueDate: format(dueDate, "yyyy-MM-dd'T'HH:mm"),
        status: editingItem.status,
        contacts: editingItem.contacts || []
      });
    }
  }, [editingItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to create action items');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    setLoading(true);
    try {
      const actionItemData = {
        title: formData.title.trim(),
        description: formData.description,
        priority: formData.priority,
        dueDate: new Date(formData.dueDate),
        status: formData.status,
        meetingId,
        userId: user.uid,
        contacts: formData.contacts
      };

      if (editingItem) {
        await updateActionItem(editingItem.id, actionItemData);
        toast.success('Action item updated successfully');
      } else {
        await addActionItem(actionItemData);
        toast.success('Action item created successfully');
      }
      onClose();
    } catch (error: any) {
      console.error('Error saving action item:', error);
      toast.error(error.message || 'Failed to save action item');
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = (contact: Contact) => {
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, contact]
    }));
    setShowContactForm(false);
  };

  const handleUpdateContact = (contactId: string, updatedContact: Contact) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.map(c => 
        c.id === contactId ? updatedContact : c
      )
    }));
  };

  const handleRemoveContact = (contactId: string) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.filter(c => c.id !== contactId)
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          {editingItem ? 'Edit Action Item' : 'Create Action Item'}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Due Date</label>
            <input
              type="datetime-local"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>
        </div>

        {editingItem && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        )}

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Contacts
            </label>
            <button
              type="button"
              onClick={() => setShowContactForm(true)}
              className="inline-flex items-center px-2 py-1 text-sm text-indigo-600 hover:text-indigo-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Contact
            </button>
          </div>

          {showContactForm ? (
            <ContactForm
              onAdd={handleAddContact}
              onCancel={() => setShowContactForm(false)}
            />
          ) : (
            <ContactList
              contacts={formData.contacts}
              onRemove={handleRemoveContact}
              onUpdate={handleUpdateContact}
            />
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Saving...' : editingItem ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}