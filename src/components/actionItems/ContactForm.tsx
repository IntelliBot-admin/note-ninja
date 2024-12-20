import React, { useState, useRef } from 'react';
import { Contact } from '../../types/actionItem';
import { Upload, Plus, X } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import toast from 'react-hot-toast';

interface ContactFormProps {
  onAdd: (contact: Contact) => void;
  onCancel: () => void;
}

export default function ContactForm({ onAdd, onCancel }: ContactFormProps) {
  const [contact, setContact] = useState<Omit<Contact, 'id'>>({
    name: '',
    email: '',
    phone: '',
    title: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
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

  const handleSubmit = async () => {
    if (!contact.name.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      setUploading(true);
      let photoUrl = '';

      if (photoFile) {
        const fileName = `contact-photos/${Date.now()}-${photoFile.name}`;
        const photoRef = ref(storage, fileName);
        await uploadBytes(photoRef, photoFile);
        photoUrl = await getDownloadURL(photoRef);
      }

      onAdd({
        id: Date.now().toString(),
        ...contact,
        ...(photoUrl && { photoUrl })
      });

      setContact({ name: '', email: '', phone: '', title: '' });
      setPhotoFile(null);
      setPhotoPreview('');
    } catch (error) {
      console.error('Error adding contact:', error);
      toast.error('Failed to add contact');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <div className="relative">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200"
          >
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Contact preview"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <Upload className="w-6 h-6 text-gray-400" />
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
        </div>

        <div className="flex-1 grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Name *"
            value={contact.name}
            onChange={(e) => setContact({ ...contact, name: e.target.value })}
            className="col-span-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={contact.email}
            onChange={(e) => setContact({ ...contact, email: e.target.value })}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <input
            type="tel"
            placeholder="Phone"
            value={contact.phone}
            onChange={(e) => setContact({ ...contact, phone: e.target.value })}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <input
            type="text"
            placeholder="Title"
            value={contact.title}
            onChange={(e) => setContact({ ...contact, title: e.target.value })}
            className="col-span-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={uploading}
          className="flex items-center px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          <Plus className="w-4 h-4 mr-1" />
          {uploading ? 'Adding...' : 'Add Contact'}
        </button>
      </div>
    </div>
  );
}