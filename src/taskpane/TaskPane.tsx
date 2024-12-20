import React, { useEffect, useState } from 'react';
import { DefaultButton, Stack, Text, TextField } from '@fluentui/react';

export default function TaskPane() {
  const [meetingTitle, setMeetingTitle] = useState('');
  const [attendees, setAttendees] = useState<Office.EmailAddressDetails[]>([]);

  useEffect(() => {
    // Initialize Office.js
    Office.onReady(() => {
      // Get current meeting details
      if (Office.context.mailbox.item) {
        const item = Office.context.mailbox.item;
        setMeetingTitle(item.subject || '');
        
        // Get attendees
        if (item.requiredAttendees) {
          setAttendees(item.requiredAttendees);
        }
      }
    });
  }, []);

  const syncWithCalendar = async () => {
    try {
      const item = Office.context.mailbox.item;
      if (!item) return;

      // Update meeting title
      await item.subject.setAsync(meetingTitle);
      
      // Sync is successful
      console.log('Calendar synced successfully');
    } catch (error) {
      console.error('Error syncing with calendar:', error);
    }
  };

  return (
    <Stack tokens={{ childrenGap: 15, padding: 15 }}>
      <Text variant="xLarge">Meeting Details</Text>
      
      <TextField
        label="Meeting Title"
        value={meetingTitle}
        onChange={(_, newValue) => setMeetingTitle(newValue || '')}
      />

      <Text variant="large">Attendees</Text>
      {attendees.map((attendee, index) => (
        <Text key={index}>{attendee.displayName} ({attendee.emailAddress})</Text>
      ))}

      <DefaultButton
        text="Sync with Calendar"
        onClick={syncWithCalendar}
      />
    </Stack>
  );
}