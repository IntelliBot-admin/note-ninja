import { create } from 'zustand';



interface NavigationStore {
   activeTab: string;
   setActiveTab: (tab: string) => void;
}

export const useNavigationStore = create<NavigationStore>((set) => ({
   activeTab: 'record',
   setActiveTab: (tab) => set({ activeTab: tab }),
}));