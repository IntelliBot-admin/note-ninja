import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { Resource, NewResource } from '../../types/resource';
import { Link2, File, Trash2, Upload, Plus, X, Download, Share2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

interface ResourceManagerProps {
  meetingId: string;
  userId: string;
}

export default function ResourceManager({ meetingId, userId }: ResourceManagerProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<Resource | null>(null);
  const [previewResource, setPreviewResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [newResource, setNewResource] = useState<Partial<NewResource>>({
    meetingId,
    userId,
    type: 'url'
  });

  useEffect(() => {
    // Use the nested collection path
    const resourcesRef = collection(db, 'meetings', meetingId, 'resources');
    const resourcesQuery = query(resourcesRef);

    const unsubscribe = onSnapshot(resourcesQuery, (snapshot) => {
      const resourcesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Resource[];
      setResources(resourcesData);
    });

    return () => unsubscribe();
  }, [meetingId]);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    try {
      const fileRef = ref(storage, `meetings/${meetingId}/${file.name}`);
      await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(fileRef);

      return {
        fileUrl: downloadUrl,
        fileType: file.type,
        fileSize: file.size,
        name: file.name
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let resourceData = { ...newResource } as NewResource;

      if (newResource.type === 'file' && (e.target as any).file.files[0]) {
        const fileData = await handleFileUpload((e.target as any).file.files[0]);
        resourceData = { ...resourceData, ...fileData };
      }

      // Use the nested collection path for adding documents
      const resourcesRef = collection(db, 'meetings', meetingId, 'resources');
      await addDoc(resourcesRef, {
        ...resourceData,
        createdAt: new Date()
      });

      setShowAddModal(false);
      setNewResource({ meetingId, userId, type: 'url' });
      toast.success('Resource added successfully');
    } catch (error) {
      console.error('Error adding resource:', error);
      toast.error('Failed to add resource');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (resource: Resource) => {
    setResourceToDelete(resource);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!resourceToDelete) return;

    setDeleteLoading(true);
    try {
      // Delete file from storage if it's a file resource
      if (resourceToDelete.type === 'file' && resourceToDelete.fileUrl) {
        const fileRef = ref(storage, resourceToDelete.fileUrl);
        await deleteObject(fileRef);
      }

      // Use the nested collection path for deleting documents
      const resourceRef = doc(db, 'meetings', meetingId, 'resources', resourceToDelete.id);
      await deleteDoc(resourceRef);
      
      toast.success('Resource deleted successfully');
      setShowDeleteModal(false);
      setResourceToDelete(null);
    } catch (error) {
      console.error('Error deleting resource:', error);
      toast.error('Failed to delete resource');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Rest of the component remains the same
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Resources</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Resource
        </button>
      </div>

      {/* Resources List */}
      <div className="space-y-2">
        {resources.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No resources added yet</p>
        ) : (
          resources.map((resource) => (
            <div
              key={resource.id}
              className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm"
            >
              <div className="flex items-center space-x-3 flex-1">
                {resource.type === 'url' ? (
                  <Link2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                ) : (
                  <File className="w-5 h-5 text-green-500 flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <a
                    href={resource.type === 'url' ? resource.url : resource.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-gray-900 hover:text-indigo-600 block truncate"
                  >
                    {resource.name}
                  </a>
                  {resource.description && (
                    <p className="text-xs text-gray-500 truncate">{resource.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                {resource.type === 'file' && (
                  <a
                    href={resource.fileUrl}
                    download={resource.name}
                    className="p-1 text-gray-400 hover:text-indigo-500"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={() => handleDeleteClick(resource)}
                  className="p-1 text-gray-400 hover:text-red-500"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Resource Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add Resource</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Resource Type
                </label>
                <select
                  value={newResource.type}
                  onChange={(e) => setNewResource({ ...newResource, type: e.target.value as 'url' | 'file' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="url">URL</option>
                  <option value="file">File</option>
                </select>
              </div>

              {newResource.type === 'url' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      URL
                    </label>
                    <input
                      type="url"
                      required
                      value={newResource.url || ''}
                      onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="https://example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newResource.name || ''}
                      onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="Resource name"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    File
                  </label>
                  <input
                    type="file"
                    name="file"
                    required
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setNewResource({ 
                          ...newResource, 
                          name: file.name
                        });
                      }
                    }}
                    className="mt-1 block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-medium
                      file:bg-indigo-50 file:text-indigo-700
                      hover:file:bg-indigo-100"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={newResource.description || ''}
                  onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Brief description"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? (
                    'Adding...'
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Add Resource
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && resourceToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">Delete Resource</h3>
              <p className="mt-2 text-sm text-gray-500">
                Are you sure you want to delete "{resourceToDelete.name}"? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setResourceToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}