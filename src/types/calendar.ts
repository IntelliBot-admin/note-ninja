export interface CalendarProvider {
  id: string;
  type: 'google' | 'microsoft';
  name: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  attendees?: string[];
}