'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, X, Star, Quote, TrendingUp, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';

interface RecapData {
  title: string;
  epicMoments: { description: string; reactionCount: number; timestamp: string }[];
  partyVibe: string;
  topReactions: { emoji: string; count: number; description: string }[];
  memorableQuotes: { user: string; quote: string; context: string }[];
  funStats: { totalMessages: number; mostActiveUser: string; hypeMoments: number };
}

interface AiRecapProps {
  roomId: string;
  animeTitle?: string;
  episodeNumber?: number;
}

export function AiRecap({ roomId, animeTitle, episodeNumber }: AiRecapProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recap, setRecap] = useState<RecapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAppStore();

  const generateRecap = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<{ recap: RecapData }>('/api/ai/recap', {
        roomId,
        animeTitle: animeTitle || undefined,
        episodeNumber: episodeNumber || undefined,
      }, token);
      setRecap(data.recap);
      setOpen(true);
    } catch (err) {
      setError('Failed to generate recap. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (!open && !loading) {
    return (
      <button
        onClick={generateRecap}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary/20 to-accent-pink/20 border border-primary/20 text-sm font-medium hover:from-primary/30 hover:to-accent-pink/30 transition-all"
      >
        <Sparkles className="w-4 h-4 text-primary" />
        Generate Recap
      </button>
    );
  }

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface border border-border"
        >
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-sm text-text-secondary">AI is crafting your recap...</span>
        </motion.div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {open && recap && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="relative max-w-lg w-full max-h-[80vh] overflow-y-auto rounded-2xl bg-surface-dark border border-border p-6"
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-surface transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold">AI Recap</h3>
            </div>
            <h4 className="text-sm text-text-secondary mb-6">{recap.title}</h4>

            <div className="flex flex-wrap gap-2 mb-6">
              <div className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-medium flex items-center gap-1">
                <Zap className="w-3 h-3" /> {recap.partyVibe} Vibe
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-surface border border-border text-xs flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> {recap.funStats.totalMessages} msgs
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-surface border border-border text-xs flex items-center gap-1">
                <Star className="w-3 h-3" /> {recap.funStats.hypeMoments} hype moments
              </div>
            </div>

            {recap.epicMoments.length > 0 && (
              <div className="mb-6">
                <h5 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> Epic Moments
                </h5>
                <div className="space-y-2">
                  {recap.epicMoments.map((m, i) => (
                    <div key={i} className="p-3 rounded-xl bg-surface border border-border text-sm">
                      <p className="text-text-primary">{m.description}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                        <span>{m.timestamp}</span>
                        <span>·</span>
                        <span>{m.reactionCount} reactions</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recap.memorableQuotes.length > 0 && (
              <div className="mb-6">
                <h5 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Quote className="w-4 h-4 text-accent-cyan" /> Memorable Quotes
                </h5>
                <div className="space-y-2">
                  {recap.memorableQuotes.map((q, i) => (
                    <div key={i} className="p-3 rounded-xl bg-surface border border-border">
                      <p className="text-sm italic text-text-secondary">&ldquo;{q.quote}&rdquo;</p>
                      <p className="text-xs text-text-muted mt-1">— {q.user}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recap.topReactions.length > 0 && (
              <div>
                <h5 className="text-sm font-semibold mb-3">Top Reactions</h5>
                <div className="flex flex-wrap gap-2">
                  {recap.topReactions.map((r, i) => (
                    <div key={i} className="px-3 py-1.5 rounded-lg bg-surface border border-border text-xs flex items-center gap-1">
                      <span>{r.emoji}</span>
                      <span className="text-text-muted">×{r.count}</span>
                      <span className="text-text-secondary ml-1">{r.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MessageSquare(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
