import { create } from 'zustand';

interface RecordingState {
  isRecording: boolean;
  setIsRecording: (isRecording: boolean) => void;
}

export const useRecordingStore = create<RecordingState>((set) => ({
  isRecording: false,
  setIsRecording: (isRecording) => set({ isRecording }),
}));