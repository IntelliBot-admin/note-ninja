import { create } from 'zustand';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ActionItem } from '../types/actionItem';
import toast from 'react-hot-toast';

export interface KanbanColumn {
  id: string;
  title: string;
  order: number;
  userId: string;
}

interface KanbanStore {
  columns: KanbanColumn[];
  setColumns: (columns: KanbanColumn[]) => void;
  fetchColumns: (userId: string) => Promise<void>;
  addColumn: (column: Omit<KanbanColumn, 'id'>) => Promise<void>;
  removeColumn: (columnId: string) => Promise<void>;
  reorderColumns: (columns: KanbanColumn[]) => Promise<void>;
}

export const useKanbanStore = create<KanbanStore>((set) => ({
  columns: [],
  setColumns: (columns) => set({ columns }),

  fetchColumns: async (userId: string) => {
    try {
      const columnsRef = collection(db, 'kanbanColumns');
      const q = query(columnsRef, where('userId', '==', userId)); 
      const snapshot = await getDocs(q);
      const columns = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as KanbanColumn[];
      
      // Sort columns by order
      columns.sort((a, b) => a.order - b.order);
      set({ columns });
    } catch (error) {
      console.error('Error fetching kanban columns:', error);
      toast.error('Failed to load board configuration');
    }
  },

  addColumn: async (column) => {
    try {
      const columnsRef = collection(db, 'kanbanColumns');
      const docRef = doc(columnsRef);
      await setDoc(docRef, {
        ...column,
        id: docRef.id,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error adding kanban column:', error);
      toast.error('Failed to add new column');
      throw error;
    }
  },

  removeColumn: async (columnId: string) => {
    try {
      const columnsRef = doc(db, 'kanbanColumns', columnId);
      await deleteDoc(columnsRef);
      
      set(state => ({
        columns: state.columns.filter(col => col.id !== columnId)
      }));
    } catch (error) {
      console.error('Error removing kanban column:', error);
      toast.error('Failed to remove column');
      throw error;
    }
  },

  reorderColumns: async (columns: KanbanColumn[]) => {
    try {
      const updates = columns.map((column, index) => 
        setDoc(doc(db, 'kanbanColumns', column.id), 
          { ...column, order: index },
          { merge: true }
        )
      );
      await Promise.all(updates);
    } catch (error) {
      console.error('Error reordering columns:', error);
      toast.error('Failed to save column order');
      throw error;
    }
  }
}));