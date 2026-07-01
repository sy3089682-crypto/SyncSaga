'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, Mic, Heart, Flame, Sparkles, Laugh, Siren as Fire } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSocket } from '@/lib/socket';

const REACTION_TYPES = [
  { type: 'laugh', icon: Laugh, label: 'LOL', color: 'text-yellow-500' },
  { type: 'cry', icon: Heart, label: 'Sad', color: 'text-blue-500' },
  { type: 'shock', icon: Sparkles, label: 'Wow', color: 'text-purple-500' },
  { type: 'fire', icon: Flame, label: 'Fire', color: 'text-orange-500' },
  { type: 'heart', icon: Heart, label: 'Love', color: 'text-red-500' },
  { type: 'gg', icon: Fire, label: 'GG', color: 'text-green-500' },
];

interface TimelineReaction {
  id: string;
  user_id: string;
  username: string;
  timestamp_sec: number;
  type: string;
  content?: string;
}

export function TimelineReactions({
  roomId,
  currentTime,
  reactions,
  onReactionAdd,
}: {
  roomId: string;
  currentTime: number;
  reactions: TimelineReaction[];
  onReactionAdd: (reaction: TimelineReaction) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string; x: number }[]>([]);

  const addReaction = useCallback((type: string) => {
    const socket = getSocket();
    socket.emit('reaction:add', {
      roomId,
      timestampSec: currentTime,
      type,
    });

    // Show floating reaction
    const id = Math.random().toString(36).slice(2);
    const emoji = REACTION_TYPES.find(r => r.type === type)?.label || '🔥';
    setFloatingReactions(prev => [...prev, { id, emoji, x: Math.random() * 60 + 20 }]);
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== id));
    }, 2000);
  }, [roomId, currentTime]);

  // Removed unused grouped reactions variable

  return (
    <div className="relative">
      {/* Floating reactions overlay */}
      <AnimatePresence>
        {floatingReactions.map(r => (
          <motion.div
            key={r.id}
            initial={{ opacity: 1, y: 0, x: `${r.x}%` }}
            animate={{ opacity: 0, y: -80, x: `${r.x}%` }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            className="absolute bottom-16 text-2xl pointer-events-none z-20"
          >
            {r.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Reaction button */}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="p-2 rounded-lg hover:bg-surface-light text-text-secondary transition-colors"
          title="React to this moment"
        >
          <Smile className="w-5 h-5" />
        </button>

        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 p-2 rounded-xl bg-surface border border-border shadow-xl flex gap-1"
            >
              {REACTION_TYPES.map(r => (
                <button
                  key={r.type}
                  onClick={() => { addReaction(r.type); setShowPicker(false); }}
                  className={cn(
                    'p-2 rounded-lg hover:bg-surface-light transition-colors',
                    r.color
                  )}
                  title={r.label}
                >
                  <r.icon className="w-5 h-5" />
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Timeline reaction indicators
export const ReactionBar = React.memo(function ReactionBar({ reactions, duration }: { reactions: TimelineReaction[]; duration: number }) {
  // Memoize grouped reactions to avoid O(N) recalculation on every render
  const grouped = useMemo(() => reactions.reduce((acc, r) => {
    const bucket = Math.floor(r.timestamp_sec / 30) * 30;
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {} as Record<number, number>), [reactions]);

  return (
    <div className="flex items-center gap-0.5 h-4">
      {[...Array(Math.ceil(duration / 30))].map((_, i) => {
        const sec = i * 30;
        const count = grouped[sec] || 0;
        return (
          <div
            key={i}
            className="flex-1 rounded-sm transition-all"
            style={{
              height: count > 0 ? `${Math.min(4 + count * 2, 16)}px` : '2px',
              background: count > 0
                ? `rgba(139, 92, 246, ${Math.min(0.2 + count * 0.1, 1)})`
                : 'rgba(255,255,255,0.05)',
            }}
          />
        );
      })}
    </div>
  );
});
