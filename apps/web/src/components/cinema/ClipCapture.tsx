'use client';

import { useState, useRef, useCallback, MouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, Film, Download, Share2, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';

export function ClipCapture({
  roomId,
  currentTime,
  episode,
}: {
  roomId: string;
  currentTime: number;
  episode?: string;
}) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [clipTitle, setClipTitle] = useState('');
  const { token } = useAppStore();
  const previewRef = useRef<HTMLDivElement>(null);

  const startCapture = useCallback(() => {
    setClipStart(currentTime);
    setIsCapturing(true);
    setSaved(false);
  }, [currentTime]);

  const endCapture = useCallback(() => {
    setClipEnd(currentTime);
    setIsCapturing(false);
    setShowPreview(true);
  }, [currentTime]);

  const cancelCapture = useCallback(() => {
    setIsCapturing(false);
    setShowPreview(false);
  }, []);

  const saveClip = useCallback(async () => {
    if (!token) return;
    setSaving(true);
    try {
      await api.post('/api/clips', {
        roomId,
        animeTitle: episode || 'Unknown',
        episodeNumber: parseInt(episode?.replace(/\D/g, '') || '1'),
        startTime: Math.min(clipStart, clipEnd),
        endTime: Math.max(clipStart, clipEnd),
        title: clipTitle || `Clip from ${episode || 'room'}`,
      }, token);

      setSaved(true);
      setTimeout(() => { setShowPreview(false); setSaved(false); }, 2000);
    } catch (err) {
      console.error('Failed to save clip:', err);
    } finally {
      setSaving(false);
    }
  }, [token, roomId, clipStart, clipEnd, clipTitle, episode]);

  const duration = Math.abs(clipEnd - clipStart);
  const formattedDuration = `${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}`;

  return (
    <>
      {/* Capture button */}
      <button
        onClick={isCapturing ? endCapture : startCapture}
        className={cn(
          'p-2 rounded-lg transition-all flex items-center gap-1.5',
          isCapturing
            ? 'bg-red-500/20 text-red-500 animate-pulse'
            : 'hover:bg-surface-light text-text-secondary'
        )}
        title={isCapturing ? 'Stop capture' : 'Capture clip'}
      >
        <Scissors className="w-4 h-4" />
        {isCapturing && <span className="text-xs font-medium">REC</span>}
      </button>

      {/* Preview modal */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => !saving && setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-surface rounded-2xl border border-border p-6 w-full max-w-md mx-4"
              onClick={(e: MouseEvent) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Film className="w-5 h-5 text-primary" />
                  Clip Preview
                </h3>
                <button onClick={cancelCapture} className="p-1 rounded-lg hover:bg-surface-light text-text-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Clip preview area */}
              <div ref={previewRef} className="aspect-video rounded-xl bg-surface-light flex items-center justify-center mb-4 border border-border">
                <div className="text-center">
                  <Film className="w-10 h-10 text-text-muted mx-auto mb-2" />
                  <p className="text-sm text-text-secondary">{formattedDuration} clip</p>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={clipTitle}
                  onChange={e => setClipTitle(e.target.value)}
                  placeholder="Name your clip..."
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-light border border-border text-text-primary placeholder:text-text-muted focus:border-primary outline-none text-sm"
                />

                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <span className="px-2 py-1 rounded bg-surface-light">{episode || 'Unknown'}</span>
                  <span>{formatTime(Math.min(clipStart, clipEnd))} – {formatTime(Math.max(clipStart, clipEnd))}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={saveClip}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                    {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Clip'}
                  </button>
                  <button className="p-2.5 rounded-xl bg-surface-light border border-border text-text-secondary hover:border-primary/50 transition-colors">
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
