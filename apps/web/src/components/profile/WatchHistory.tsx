'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Clock } from 'lucide-react';
import { formatTime } from '@/lib/utils';

export function WatchHistory({ userId, token }: { userId: string; token: string }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a full implementation, this would fetch from a /api/users/:id/history endpoint
    // For now we simulate the structured display of "What we watched together"
    setLoading(false);
  }, [userId, token]);

  if (loading) return <div className="animate-pulse h-24 bg-surface-light rounded-xl" />;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
        <Clock className="w-4 h-4" /> Watch History
      </h3>
      {history.length === 0 ? (
        <p className="text-sm text-text-muted">No watch history available yet.</p>
      ) : (
        <div className="grid gap-3">
          {history.map((item, i) => (
            <div key={i} className="flex gap-3 p-3 glass-panel-interactive">
              <div className="w-10 h-14 bg-surface-light rounded object-cover overflow-hidden">
                {item.cover_url && <img src={item.cover_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div>
                <h4 className="font-medium text-sm text-text-primary">{item.anime_title}</h4>
                <p className="text-xs text-accent-cyan">{item.episode_title}</p>
                <p className="text-[10px] text-text-muted mt-1">Watched {formatTime(item.watched_at)} ago</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
