import React, { useState } from 'react';
import { Contact } from '../../types/actionItem';
import { UserCircle, X, Edit2, Eye } from 'lucide-react';
import ContactDetailsModal from './ContactDetailsModal';

interface ContactListProps {
  contacts: Contact[];
  onRemove: (contactId: string) => void;
  onUpdate?: (contactId: string, updatedContact: Contact) => void;
  readOnly?: boolean;
}

export default function ContactList({ contacts, onRemove, onUpdate, readOnly = false }: ContactListProps) {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleContactClick = (contact: Contact, editing: boolean) => {
    setSelectedContact(contact);
    setIsEditing(editing);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedContact(null);
    setIsModalOpen(false);
    setIsEditing(false);
  };

  const handleUpdate = (updatedContact: Contact) => {
    if (onUpdate) {
      onUpdate(updatedContact.id, updatedContact);
    }
    handleCloseModal();
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className="flex items-center space-x-2 bg-gray-100 rounded-full pl-1 pr-2 py-1"
          >
            {contact.photoUrl ? (
              <img
                src={contact.photoUrl}
                alt={contact.name}
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <UserCircle className="w-6 h-6 text-gray-400" />
            )}
            <span className="text-sm text-gray-700">{contact.name}</span>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleContactClick(contact, false)}
                className="text-gray-400 hover:text-indigo-500"
                title="View contact"
              >
                <Eye className="w-4 h-4" />
              </button>
              {!readOnly && (
                <>
                  <button
                    onClick={() => handleContactClick(contact, true)}
                    className="text-gray-400 hover:text-indigo-500"
                    title="Edit contact"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onRemove(contact.id)}
                    className="text-gray-400 hover:text-red-500"
                    title="Remove contact"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedContact && (
        <ContactDetailsModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          contact={selectedContact}
          isEditing={isEditing}
          onUpdate={handleUpdate}
        />
      )}
    </>
  );
}