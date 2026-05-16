'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Film, Star, UserPlus, MessageCircle, Clock, Activity, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';

interface Activity {
  id: string;
  user_id: string;
  type: string;
  data: any;
  created_at: string;
  profiles?: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

const activityIcons: Record<string, any> = {
  watching: Film,
  completed: Star,
  clip_created: Film,
  rated: Star,
  joined_room: UserPlus,
  friend_added: UserPlus,
  reaction: MessageCircle,
};

const activityColors: Record<string, string> = {
  watching: 'text-primary',
  completed: 'text-yellow-500',
  clip_created: 'text-accent-cyan',
  rated: 'text-yellow-500',
  joined_room: 'text-accent-green',
  friend_added: 'text-accent-green',
  reaction: 'text-accent-pink',
};

const activityLabels: Record<string, string> = {
  watching: 'is watching',
  completed: 'completed',
  clip_created: 'shared a clip',
  rated: 'rated',
  joined_room: 'joined',
  friend_added: 'became friends with',
  reaction: 'reacted in',
};

export function FriendsFeed({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAppStore();

  useEffect(() => {
    if (!token) return;
    api.get<{ activities: Activity[] }>('/api/activity', token)
      .then(data => setActivities(data.activities.slice(0, 15)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const getLabel = (a: Activity) => {
    const label = activityLabels[a.type] || 'did something';
    if (a.type === 'watching') return `${label} ${a.data?.animeTitle || ''}`;
    if (a.type === 'clip_created') return `${label}: ${a.data?.animeTitle || ''} ep.${a.data?.episodeNumber || ''}`;
    if (a.type === 'rated') return `${label} ${a.data?.animeTitle || ''}`;
    if (a.type === 'joined_room') return `${label} ${a.data?.roomName || 'a room'}`;
    return label;
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (collapsed) {
    return (
      <button onClick={onToggle} className="relative p-2 rounded-lg hover:bg-surface-light text-text-secondary transition-colors">
        <Bell className="w-5 h-5" />
        {activities.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-[9px] font-bold flex items-center justify-center">
            {activities.length > 9 ? '9+' : activities.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 280, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      className="border-l border-border bg-surface flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Activity
        </h3>
        <button onClick={onToggle} className="p-1 rounded hover:bg-surface-light text-text-muted">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-surface-light" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-surface-light rounded w-3/4" />
                  <div className="h-2 bg-surface-light rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-8 h-8 text-text-muted mx-auto mb-2" />
            <p className="text-sm text-text-muted">No activity yet</p>
            <p className="text-xs text-text-muted mt-1">Start watching with friends!</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {activities.map(a => {
              const Icon = activityIcons[a.type] || Activity;
              const color = activityColors[a.type] || 'text-text-muted';
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-2.5 group"
                >
                  <div className={cn('w-8 h-8 rounded-full bg-surface-light flex items-center justify-center shrink-0', color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs">
                      <span className="font-medium text-text-primary">
                        {a.profiles?.display_name || a.profiles?.username || 'User'}
                      </span>
                      {' '}
                      <span className="text-text-muted">{getLabel(a)}</span>
                    </p>
                    <p className="text-[10px] text-text-muted mt-0.5">{timeAgo(a.created_at)}</p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
