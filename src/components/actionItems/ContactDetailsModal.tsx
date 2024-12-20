import React, { useState, useRef } from 'react';
import { Contact } from '../../types/actionItem';
import { X, Upload, Check, Edit2 } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import toast from 'react-hot-toast';

interface ContactDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact;
  isEditing: boolean;
  onUpdate: (updatedContact: Contact) => void;
}

export default function ContactDetailsModal({
  isOpen,
  onClose,
  contact,
  isEditing: initialIsEditing,
  onUpdate
}: ContactDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(initialIsEditing);
  const [editedContact, setEditedContact] = useState(contact);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>(contact.photoUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Photo must be less than 5MB');
        return;
      }

      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!editedContact.name.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      setIsSaving(true);
      let photoUrl = editedContact.photoUrl;

      if (photoFile) {
        const fileName = `contact-photos/${Date.now()}-${photoFile.name}`;
        const photoRef = ref(storage, fileName);
        await uploadBytes(photoRef, photoFile);
        photoUrl = await getDownloadURL(photoRef);
      }

      const updatedContact = {
        ...editedContact,
        photoUrl
      };

      onUpdate(updatedContact);
      setIsEditing(false);
      toast.success('Contact updated successfully');
    } catch (error) {
      console.error('Error updating contact:', error);
      toast.error('Failed to update contact');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              {isEditing ? 'Edit Contact' : 'Contact Details'}
            </h3>
            <div className="flex items-center space-x-2">
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-gray-400 hover:text-indigo-500"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                {isEditing ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200"
                  >
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt={editedContact.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <Upload className="w-8 h-8 text-gray-400" />
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center">
                    {contact.photoUrl ? (
                      <img
                        src={contact.photoUrl}
                        alt={contact.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-medium text-indigo-600">
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedContact.name}
                    onChange={(e) => setEditedContact({ ...editedContact, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{contact.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editedContact.email}
                    onChange={(e) => setEditedContact({ ...editedContact, email: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{contact.email || 'Not provided'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editedContact.phone}
                    onChange={(e) => setEditedContact({ ...editedContact, phone: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{contact.phone || 'Not provided'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedContact.title}
                    onChange={(e) => setEditedContact({ ...editedContact, title: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{contact.title || 'Not provided'}</p>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}