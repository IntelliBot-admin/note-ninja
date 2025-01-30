import { useState, useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface SummaryEditorProps {
   content: string;
   onSave: (newContent: string) => Promise<void>;
   className?: string;
   disabled?: boolean;
   isEditing?: boolean;
   setIsEditing: (value: boolean) => void;
}

export function SummaryEditor({
   content,
   onSave,
   className = '',
   disabled = false,
   isEditing = false,
   setIsEditing
}: SummaryEditorProps) {
   const [isSaving, setIsSaving] = useState(false);

   const editor = useEditor({
      extensions: [
         StarterKit.configure({
            heading: {
               levels: [1, 2, 3]
            }
         })
      ],
      editorProps: {
         attributes: {
            class: 'prose prose-sm focus:outline-none',
         },
      },
      content: content,
      editable: false, // Start as non-editable
   });

   // Update editor content when prop changes
   useEffect(() => {
      if (editor) {
         editor.commands.setContent(content);
      }
   }, [content, editor]);

   // Update editor editable state when isEditing changes
   useEffect(() => {
      if (editor) {
         editor.setEditable(isEditing && !disabled);
      }
   }, [editor, isEditing, disabled]);

   const handleSave = async () => {
      if (!editor) return;

      setIsSaving(true);
      try {
         const newContent = editor.getHTML();
         await onSave(newContent);
         setIsEditing(false);
         toast.success('Summary saved successfully');
      } catch (error) {
         console.error('Error saving summary:', error);
         toast.error('Failed to save summary');
      } finally {
         setIsSaving(false);
      }
   };

   return (
      <div className={`relative flex flex-col ${className}`}>
         <div className="flex-1 overflow-y-auto">
            <div className={`prose prose-sm max-w-none ${isEditing ? 'pb-16' : ''}`}>
               <EditorContent 
                  editor={editor} 
                  className={isEditing ? 'border rounded-md p-2 min-h-[300px] focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500' : ''} 
               />
            </div>
         </div>

         {isEditing && !disabled && (
            <div className="sticky bottom-0 bg-white py-4 px-4 border-t">
               <div className="flex justify-end space-x-2">
                  <button
                     onClick={() => {
                        editor?.commands.setContent(content);
                        setIsEditing(false);
                     }}
                     className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-300 text-xs sm:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                     Cancel
                  </button>
                  <button
                     onClick={handleSave}
                     disabled={isSaving}
                     className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                     <Save className="w-4 h-4 mr-1" />
                     {isSaving ? 'Saving...' : 'Save'}
                  </button>
               </div>
            </div>
         )}
      </div>
   );
}