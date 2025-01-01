import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  noteSize: 'normal' | 'compact';
  defaultView: 'grid' | 'list' | 'calendar';
  setNoteSize: (size: 'normal' | 'compact') => void;
  setDefaultView: (view: 'grid' | 'list' | 'calendar') => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      noteSize: 'normal',
      defaultView: 'grid',
      setNoteSize: (size) => set({ noteSize: size }),
      setDefaultView: (view) => set({ defaultView: view }),
    }),
    {
      name: 'ui-storage',
    }
  )
);