import { Node, mergeAttributes } from '@tiptap/core';
import { NodeSelection, Plugin } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface ResizableImageOptions {
  inline: boolean;
  allowBase64: boolean;
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    resizableImage: {
      setImage: (options: { src: string; alt?: string; width?: number; height?: number }) => ReturnType;
    };
  }
}

export const ResizableImage = Node.create<ResizableImageOptions>({
  name: 'resizableImage',

  addOptions() {
    return {
      inline: false,
      allowBase64: false,
      HTMLAttributes: {},
    };
  },

  inline() {
    return this.options.inline;
  },

  group() {
    return this.options.inline ? 'inline' : 'block';
  },

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      width: {
        default: null,
      },
      height: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      style: `cursor: pointer; ${HTMLAttributes.style || ''}`,
      onclick: 'window.open(this.src, "_blank", "noopener,noreferrer")'
    });
    return ['img', attrs];
  },

  addCommands() {
    return {
      setImage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  addProseMirrorPlugins() {
    const resizePlugin = new Plugin({
      props: {
        handleDOMEvents: {
          click: (view, event) => {
            const target = event.target as HTMLElement;
            if (target.tagName === 'IMG') {
              // Prevent default click behavior since we're using onclick attribute
              event.preventDefault();
              return true;
            }
            return false;
          },
        },
        
        decorations: (state) => {
          const { doc, selection } = state;
          const decorations: Decoration[] = [];

          if (!selection || !(selection instanceof NodeSelection)) {
            return DecorationSet.empty;
          }

          const { node, from } = selection;
          
          if (!node || node.type.name !== 'resizableImage') {
            return DecorationSet.empty;
          }

          const { width } = node.attrs;

          const resizeHandle = Decoration.widget(from + 1, () => {
            const handle = document.createElement('div');
            handle.className = 'resize-handle';
            handle.style.cssText = `
              position: absolute;
              right: -4px;
              bottom: -4px;
              width: 8px;
              height: 8px;
              background-color: white;
              border: 1px solid #6366f1;
              border-radius: 50%;
              cursor: se-resize;
              z-index: 50;
            `;

            let startX = 0;
            let startWidth = 0;
            let isDragging = false;

            const onMouseDown = (e: MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              
              isDragging = true;
              startX = e.pageX;
              startWidth = width || node.attrs.width || 300;

              document.addEventListener('mousemove', onMouseMove);
              document.addEventListener('mouseup', onMouseUp);
            };

            const onMouseMove = (e: MouseEvent) => {
              if (!isDragging) return;

              const currentX = e.pageX;
              const diffX = currentX - startX;
              const newWidth = Math.max(100, startWidth + diffX);

              const tr = state.tr.setNodeMarkup(from, null, {
                ...node.attrs,
                width: newWidth,
              });
              view.dispatch(tr);
            };

            const onMouseUp = () => {
              isDragging = false;
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
            };

            handle.addEventListener('mousedown', onMouseDown);

            return handle;
          });

          decorations.push(resizeHandle);
          return DecorationSet.create(doc, decorations);
        },
      },
    });

    return [resizePlugin];
  },
});