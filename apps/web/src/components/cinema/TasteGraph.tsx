'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Play } from 'lucide-react';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';

interface Recommendation {
  anime_id: string;
  anime_title: string;
  episode_number: number;
  count: number;
}

export function TasteGraph({ onSelect }: { onSelect?: (title: string) => void }) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [reason, setReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const { token } = useAppStore();

  useEffect(() => {
    if (!token) return;
    api.get<{ recommendations: Recommendation[]; reason?: string }>('/api/activity/recommendations', token)
      .then(data => {
        setRecommendations(data.recommendations || []);
        setReason(data.reason || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return null;

  if (!recommendations.length) {
    if (reason) return null; // Not enough data yet
    return null;
  }

  const top5 = expanded ? recommendations : recommendations.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card-gradient border border-border p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-accent-cyan flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-sm font-semibold">Recommended for you</h3>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">AI</span>
      </div>

      <div className="space-y-2">
        {top5.map((rec, i) => (
          <motion.div
            key={rec.anime_id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSelect?.(rec.anime_title)}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-light transition-colors cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-surface-light flex items-center justify-center text-xs font-bold text-primary shrink-0">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{rec.anime_title}</p>
              <p className="text-xs text-text-muted">Up to episode {rec.episode_number}</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-text-muted">
              <Users className="w-3 h-3" />
              {rec.count}
            </div>
            <Play className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.div>
        ))}
      </div>

      {recommendations.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs text-primary hover:underline w-full text-center"
        >
          {expanded ? 'Show less' : `Show ${recommendations.length - 5} more`}
        </button>
      )}
    </motion.div>
  );
}
