import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { useCategories } from '../../hooks/useCategories';
import { Category } from '../../types/category';
import toast from 'react-hot-toast';

interface CategoryManagerProps {
  onClose: () => void;
}

export default function CategoryManager({ onClose }: CategoryManagerProps) {
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', color: '#6366F1' });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name.trim()) return;

    addCategory(newCategory);
    setNewCategory({ name: '', color: '#6366F1' });
    setShowAddForm(false);
    toast.success('Category added successfully');
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setEditingCategory({ ...category });
  };

  const handleUpdate = (id: string) => {
    if (!editingCategory || !editingCategory.name.trim()) return;

    updateCategory(id, editingCategory);
    setEditingId(null);
    setEditingCategory(null);
    toast.success('Category updated successfully');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      deleteCategory(id);
      toast.success('Category deleted successfully');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-gray-900">Manage Categories</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex justify-end">
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Category
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={newCategory.name}
            onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
            placeholder="Category name"
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <input
            type="color"
            value={newCategory.color}
            onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
            className="w-12 h-8 rounded cursor-pointer"
          />
          <button
            type="submit"
            className="p-2 text-green-600 hover:text-green-700"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowAddForm(false)}
            className="p-2 text-gray-400 hover:text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </form>
      )}

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm"
          >
            {editingId === category.id ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={editingCategory?.name || ''}
                  onChange={(e) => setEditingCategory({ 
                    ...editingCategory!, 
                    name: e.target.value 
                  })}
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                <input
                  type="color"
                  value={editingCategory?.color || ''}
                  onChange={(e) => setEditingCategory({ 
                    ...editingCategory!, 
                    color: e.target.value 
                  })}
                  className="w-12 h-8 rounded cursor-pointer"
                />
                <button
                  onClick={() => handleUpdate(category.id)}
                  className="p-2 text-green-600 hover:text-green-700"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="p-2 text-gray-400 hover:text-gray-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-sm font-medium text-gray-900">
                    {category.name}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(category)}
                    className="p-1 text-gray-400 hover:text-indigo-500"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}