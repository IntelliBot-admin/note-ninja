import React, { useState } from 'react';
import { format } from 'date-fns';
import Editor from './Editor';
import { Users } from 'lucide-react';

interface Participant {
  email: string;
  role: string;
}

export default function MeetingForm({ onSubmit, initialData = null }: any) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [date, setDate] = useState(
    initialData?.date || format(new Date(), 'yyyy-MM-dd')
  );
  const [participants, setParticipants] = useState<Participant[]>(
    initialData?.participants || []
  );
  const [content, setContent] = useState(initialData?.content || '');
  const [newParticipant, setNewParticipant] = useState({ email: '', role: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ title, date, participants, content });
  };

  const addParticipant = () => {
    // Allow adding participant even if fields are empty
    setParticipants([...participants, newParticipant]);
    setNewParticipant({ email: '', role: '' });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Title</label>
        <input
          type="text"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Date</label>
        <input
          type="date"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Participants (Optional)
        </label>
        <div className="mt-1 flex gap-2">
          <input
            type="email"
            placeholder="Email (optional)"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            value={newParticipant.email}
            onChange={(e) =>
              setNewParticipant({ ...newParticipant, email: e.target.value })
            }
          />
          <input
            type="text"
            placeholder="Role (optional)"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            value={newParticipant.role}
            onChange={(e) =>
              setNewParticipant({ ...newParticipant, role: e.target.value })
            }
          />
          <button
            type="button"
            onClick={addParticipant}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Users className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-2">
          {participants.map((p, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md mt-1"
            >
              <span className="text-sm text-gray-600">
                {p.email || 'No email'} {p.role && `(${p.role})`}
              </span>
              <button
                type="button"
                onClick={() =>
                  setParticipants(participants.filter((_, i) => i !== index))
                }
                className="text-red-600 hover:text-red-800"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <div className="mt-1">
          <Editor content={content} onChange={setContent} />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Save Meeting Notes
        </button>
      </div>
    </form>
  );
}