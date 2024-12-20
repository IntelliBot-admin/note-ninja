import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Category, DEFAULT_CATEGORIES } from '../types/category';
import { useAuthStore } from '../store/authStore';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    const categoriesRef = collection(db, 'users', user.uid, 'categories');
    const q = query(categoriesRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const categoriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Category[];

      if (categoriesData.length === 0) {
        // If no categories exist, add default categories
        DEFAULT_CATEGORIES.forEach(async (category) => {
          await addDoc(categoriesRef, {
            name: category.name,
            color: category.color
          });
        });
        setCategories(DEFAULT_CATEGORIES);
      } else {
        setCategories(categoriesData);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const addCategory = async (category: Omit<Category, 'id'>) => {
    if (!user) return;

    const categoriesRef = collection(db, 'users', user.uid, 'categories');
    await addDoc(categoriesRef, category);
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    if (!user) return;

    const categoryRef = doc(db, 'users', user.uid, 'categories', id);
    await updateDoc(categoryRef, updates);
  };

  const deleteCategory = async (id: string) => {
    if (!user) return;

    const categoryRef = doc(db, 'users', user.uid, 'categories', id);
    await deleteDoc(categoryRef);
  };

  return {
    categories,
    addCategory,
    updateCategory,
    deleteCategory
  };
}