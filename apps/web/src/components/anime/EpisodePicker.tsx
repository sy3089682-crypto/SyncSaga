'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Film, Loader2 } from 'lucide-react';
import { anilist } from '@/lib/anime/anilist';
import { jikan } from '@/lib/anime/jikan';
import { cn } from '@/lib/utils';

interface EpisodePickerProps {
  mediaId: number;
  currentEpisode: number | null;
  onSelect: (mediaId: number, episode: number) => void;
  disabled?: boolean;
}

export function EpisodePicker({ mediaId, currentEpisode, onSelect, disabled }: EpisodePickerProps) {
  const [open, setOpen] = useState(false);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mediaTitle, setMediaTitle] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      try {
        const { Media } = await anilist.detail(mediaId);
        setMediaTitle(Media.title?.english || Media.title?.romaji || '');
        if (Media.idMal) {
          const eps = await jikan.episodes(Media.idMal).catch(() => []);
          setEpisodes(Array.isArray(eps) ? eps : []);
        }
      } catch {}
      setLoading(false);
    })();
  }, [mediaId, open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={pickerRef} className="relative">
      <button onClick={() => setOpen(!open)} disabled={disabled}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-light hover:bg-surface text-xs text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50">
        <Film className="w-3.5 h-3.5" />
        {currentEpisode ? `Ep ${currentEpisode}` : 'Episode'}
        <ChevronDown className="w-3 h-3" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute bottom-full mb-2 left-0 w-72 max-h-80 overflow-y-auto rounded-xl bg-surface border border-border shadow-2xl z-50"
          >
            <div className="sticky top-0 bg-surface border-b border-border px-3 py-2">
              <p className="text-xs font-medium truncate">{mediaTitle || 'Episodes'}</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            ) : episodes.length === 0 ? (
              <div className="text-center py-4 text-xs text-text-muted">
                <p>No episode data available</p>
                <p className="text-[10px] mt-1">Try selecting from the search page</p>
              </div>
            ) : (
              <div className="p-1">
                {episodes.map((ep: any) => (
                  <button key={ep.mal_id} onClick={() => { onSelect(mediaId, ep.mal_id); setOpen(false); }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                      ep.mal_id === currentEpisode ? 'bg-primary/15 text-primary' : 'hover:bg-surface-light text-text-secondary'
                    )}>
                    <span className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0',
                      ep.mal_id === currentEpisode ? 'bg-primary/20 text-primary' : 'bg-surface-light text-text-muted'
                    )}>
                      {ep.mal_id}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs truncate">{ep.title || `Episode ${ep.mal_id}`}</p>
                      {ep.air_date && (
                        <p className="text-[10px] text-text-muted">{new Date(ep.air_date).toLocaleDateString()}</p>
                      )}
                    </div>
                    {ep.thumbnail && (
                      <img src={ep.thumbnail} alt="" className="w-10 h-6 rounded object-cover shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
