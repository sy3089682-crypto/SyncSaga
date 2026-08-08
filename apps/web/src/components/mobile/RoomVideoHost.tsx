'use client';

import { useRef, useState } from 'react';
import { Film, Loader2, Upload, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface RoomVideoHostProps {
  roomId: string;
  userId?: string;
  onReady?: (url: string, name: string) => void;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-matroska',
]);

export function RoomVideoHost({ roomId, userId, onReady }: RoomVideoHostProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { user: authUser } = useAuth();
  const effectiveUserId = userId || authUser?.id;
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const selectVideo = async (file: File) => {
    setError(null);

    if (!effectiveUserId) {
      setError('You need to be signed in to host a video.');
      return;
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      setError('Use MP4, WebM, OGG, MOV, or MKV video.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('This video is larger than the 2 GB hosting limit.');
      return;
    }

    setUploading(true);
    setFileName(file.name);

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${effectiveUserId}/${roomId}/${crypto.randomUUID()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('room-videos')
        .upload(path, file, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      await api.patch(`/api/rooms/${roomId}/video`, {
        path,
        name: file.name,
        size: file.size,
        mimeType: file.type,
      });

      const playback = await api.get<{ url: string }>(`/api/rooms/${roomId}/video`);
      onReady?.(playback.url, file.name);
    } catch (err) {
      console.error('Room video upload failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to host this video.');
      setFileName(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-matroska,.mkv,.mp4,.webm,.mov,.ogg"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void selectVideo(file);
          event.currentTarget.value = '';
        }}
      />

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Film className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm">Host a video from your phone</p>
          <p className="text-xs text-text-muted truncate">
            {fileName ? fileName : 'Upload up to 2 GB. The video stays private.'}
          </p>
        </div>
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="shrink-0 px-3 py-2 rounded-lg bg-primary text-white text-xs font-semibold disabled:opacity-60 flex items-center gap-2"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Uploading…' : 'Choose'}
        </button>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-xs text-red-400">
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss error">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <p className="mt-2 text-[11px] text-text-muted">
        Only upload videos you own or are licensed to share. Viewers receive a temporary playback link.
      </p>
    </div>
  );
}
