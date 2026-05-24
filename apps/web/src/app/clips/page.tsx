'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Clock, Film, Trash2, Earth } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { api } from '@/lib/api';
import Link from 'next/link';
import { formatTime } from '@/lib/utils';

export default function ClipsPage() {
  const { token, user } = useAppStore();
  const [clips, setClips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api.get<{ clips: any[] }>('/api/clips', token)
      .then(({ clips }) => setClips(clips))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen bg-background text-text-primary px-4 sm:px-6 lg:px-8 py-6 pb-20 lg:pb-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Film className="w-7 h-7 text-primary" />
            My Clips
          </h1>
          <p className="text-text-secondary">Your saved anime moments. Click to watch from the exact timestamp.</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-text-muted">Loading clips...</div>
        ) : clips.length === 0 ? (
          <div className="text-center py-16">
            <Film className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-50" />
            <p className="text-text-muted text-lg mb-2">No clips yet</p>
            <p className="text-text-secondary text-sm">Press the clip button while watching to save moments.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clips.map((clip, i) => (
              <motion.div
                key={clip.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-5 rounded-2xl bg-surface border border-border hover:border-primary/30 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate group-hover:text-primary transition-colors">{clip.anime_title}</h3>
                    {clip.episode_number && (
                      <p className="text-xs text-text-muted mt-0.5">Episode {clip.episode_number}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-text-secondary mb-4">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(clip.start_time)} – {formatTime(clip.end_time)}
                  </span>
                  {clip.is_public && (
                    <span className="flex items-center gap-1 text-accent-cyan">
                      <Earth className="w-3 h-3" /> Public
                    </span>
                  )}
                </div>

                {clip.description && (
                  <p className="text-xs text-text-secondary mb-4 line-clamp-2">{clip.description}</p>
                )}

                <Link href={`/room/create?animeId=0&title=${encodeURIComponent(clip.anime_title)}&episode=${clip.episode_number}&timestamp=${clip.start_time}`}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
                  <Play className="w-4 h-4" /> Watch from here
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
