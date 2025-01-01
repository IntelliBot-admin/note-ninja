export interface SignupFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  referralSource: string;
  role?: string;
}

export const REFERRAL_SOURCES = [
  { id: 'search', label: 'Search Engine (Google, Bing, etc.)' },
  { id: 'social', label: 'Social Media' },
  { id: 'friend', label: 'Friend or Colleague' },
  { id: 'blog', label: 'Blog or Article' },
  { id: 'podcast', label: 'Podcast' },
  { id: 'other', label: 'Other' }
] as const;