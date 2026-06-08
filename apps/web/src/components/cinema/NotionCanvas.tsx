'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { useYjsRoom } from '@/hooks/useYjsRoom';
import { useAppStore } from '@/store/useAppStore';

export function NotionCanvas({ roomId }: { roomId: string }) {
  const { doc, provider } = useYjsRoom(roomId) as any;
  const { user } = useAppStore();

  const editor = useEditor({
    extensions: doc ? [
      StarterKit.configure({
        history: false,
      } as any),
      Collaboration.configure({
        document: doc,
        field: 'notion-canvas',
      }),
      CollaborationCursor.configure({
        provider: provider,
        user: {
          name: user?.username || 'Anonymous',
          color: '#' + Math.floor(Math.random()*16777215).toString(16),
        },
      }),
    ] : [],
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] text-text-primary prose-headings:text-text-primary prose-a:text-accent-cyan prose-strong:text-text-primary',
      },
    },
  }, [doc]);

  if (!doc) {
    return <div className="animate-pulse h-64 bg-surface-light rounded-xl w-full" />;
  }

  return (
    <div className="w-full glass-panel p-6 overflow-y-auto">
      <div className="mb-4 pb-4 border-b border-border-default flex items-center justify-between">
        <h2 className="text-xl font-bold text-accent-cyan drop-shadow-glow-sm">Room Notes</h2>
        <span className="text-xs text-text-muted">Live Sync Active</span>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
