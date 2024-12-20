export interface Category {
  id: string;
  name: string;
  color: string;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'general', name: 'General', color: '#6366F1' },
  { id: 'planning', name: 'Planning', color: '#10B981' },
  { id: 'review', name: 'Review', color: '#F59E0B' },
  { id: 'client', name: 'Client', color: '#EC4899' }
];