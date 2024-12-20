import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2,
  Quote,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Strikethrough,
  UnderlineIcon,
  Minus,
  WrapText,
  Undo,
  Redo,
  Link as LinkIcon,
  Unlink,
  Image
} from 'lucide-react';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import CodeBlock from '@tiptap/extension-code-block';
import { ResizableImage } from '../../extensions/resizableImage';
import { useState } from 'react';
import LinkDialog from './LinkDialog';
import ImageDialog from './ImageDialog';

const MenuBar = ({ editor }: { editor: any }) => {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);

  if (!editor) return null;

  const addImage = (url: string, alt: string) => {
    editor.chain().focus().setImage({ src: url, alt, width: 300 }).run();
  };

  const addLink = (url: string) => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
    }
    editor.chain().focus().setLink({ href: url }).run();
  };

  return (
    <div className="border-b border-gray-200 p-2 flex flex-wrap gap-1">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-2 rounded hover:bg-gray-100 ${
          editor.isActive('bold') ? 'bg-gray-100 text-indigo-600' : ''
        }`}
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-2 rounded hover:bg-gray-100 ${
          editor.isActive('italic') ? 'bg-gray-100 text-indigo-600' : ''
        }`}
      >
        <Italic className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`p-2 rounded hover:bg-gray-100 ${
          editor.isActive('underline') ? 'bg-gray-100 text-indigo-600' : ''
        }`}
      >
        <UnderlineIcon className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`p-2 rounded hover:bg-gray-100 ${
          editor.isActive('strike') ? 'bg-gray-100 text-indigo-600' : ''
        }`}
      >
        <Strikethrough className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-gray-200 mx-1 self-center" />

      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`p-2 rounded hover:bg-gray-100 ${
          editor.isActive('heading', { level: 1 }) ? 'bg-gray-100 text-indigo-600' : ''
        }`}
      >
        <Heading1 className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-2 rounded hover:bg-gray-100 ${
          editor.isActive('heading', { level: 2 }) ? 'bg-gray-100 text-indigo-600' : ''
        }`}
      >
        <Heading2 className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-gray-200 mx-1 self-center" />

      <button
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={`p-2 rounded hover:bg-gray-100 ${
          editor.isActive({ textAlign: 'left' }) ? 'bg-gray-100 text-indigo-600' : ''
        }`}
      >
        <AlignLeft className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={`p-2 rounded hover:bg-gray-100 ${
          editor.isActive({ textAlign: 'center' }) ? 'bg-gray-100 text-indigo-600' : ''
        }`}
      >
        <AlignCenter className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={`p-2 rounded hover:bg-gray-100 ${
          editor.isActive({ textAlign: 'right' }) ? 'bg-gray-100 text-indigo-600' : ''
        }`}
      >
        <AlignRight className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-gray-200 mx-1 self-center" />

      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded hover:bg-gray-100 ${
          editor.isActive('bulletList') ? 'bg-gray-100 text-indigo-600' : ''
        }`}
      >
        <List className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded hover:bg-gray-100 ${
          editor.isActive('orderedList') ? 'bg-gray-100 text-indigo-600' : ''
        }`}
      >
        <ListOrdered className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-gray-200 mx-1 self-center" />

      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-2 rounded hover:bg-gray-100 ${
          editor.isActive('blockquote') ? 'bg-gray-100 text-indigo-600' : ''
        }`}
      >
        <Quote className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={`p-2 rounded hover:bg-gray-100 ${
          editor.isActive('codeBlock') ? 'bg-gray-100 text-indigo-600' : ''
        }`}
      >
        <Code className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-gray-200 mx-1 self-center" />

      <button
        onClick={() => setShowLinkDialog(true)}
        className={`p-2 rounded hover:bg-gray-100 ${
          editor.isActive('link') ? 'bg-gray-100 text-indigo-600' : ''
        }`}
      >
        {editor.isActive('link') ? (
          <Unlink className="w-4 h-4" />
        ) : (
          <LinkIcon className="w-4 h-4" />
        )}
      </button>
      <button
        onClick={() => setShowImageDialog(true)}
        className="p-2 rounded hover:bg-gray-100"
      >
        <Image className="w-4 h-4" />
      </button>

      <div className="w-px h-6 bg-gray-200 mx-1 self-center" />

      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
      >
        <Undo className="w-4 h-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
      >
        <Redo className="w-4 h-4" />
      </button>

      <LinkDialog
        isOpen={showLinkDialog}
        onClose={() => setShowLinkDialog(false)}
        onSubmit={addLink}
      />
      <ImageDialog
        isOpen={showImageDialog}
        onClose={() => setShowImageDialog(false)}
        onSubmit={addImage}
      />
    </div>
  );
};

interface NoteEditorProps {
  content: string;
  onChange: (content: string) => void;
  autoFocus?: boolean;
}

export default function NoteEditor({ content, onChange, autoFocus = false }: NoteEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start typing your meeting notes...',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: 'text-indigo-600 hover:text-indigo-800 underline',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      CodeBlock.configure({
        HTMLAttributes: {
          class: 'bg-gray-100 rounded-md p-4 font-mono text-sm',
        },
      }),
      ResizableImage.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto',
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
  });

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
      <style>{`
        .ProseMirror {
          position: relative;
        }
        
        .ProseMirror img {
          display: inline-block;
          position: relative;
          cursor: default;
          
          &.ProseMirror-selectednode {
            outline: 2px solid #6366f1;
          }
        }
      `}</style>
    </div>
  );
}