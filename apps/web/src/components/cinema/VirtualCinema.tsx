'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2, Monitor, Theater, Volume2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

type CinemaMode = 'flat' | 'cinema' | 'immersive';

interface VirtualCinemaProps {
  isActive: boolean;
  mode: CinemaMode;
  onModeChange: (mode: CinemaMode) => void;
  participantCount: number;
}

const modes: { key: CinemaMode; icon: any; label: string; desc: string }[] = [
  { key: 'flat', icon: Monitor, label: 'Flat', desc: 'Standard 2D view' },
  { key: 'cinema', icon: Theater, label: 'Cinema', desc: 'Curved screen + dim lights' },
  { key: 'immersive', icon: Maximize2, label: 'Immersive', desc: 'Full-screen + spatial audio' },
];

export function VirtualCinema({ isActive, mode, onModeChange, participantCount }: VirtualCinemaProps) {
  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-light border border-border"
    >
      <div className="flex items-center gap-1">
        {modes.map(m => (
          <button
            key={m.key}
            onClick={() => onModeChange(m.key)}
            className={cn(
              'p-1.5 rounded-lg transition-all',
              mode === m.key
                ? 'bg-primary/20 text-primary'
                : 'text-text-muted hover:text-text-secondary hover:bg-surface'
            )}
            title={m.desc}
          >
            <m.icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      {mode === 'cinema' && (
        <div className="flex items-center gap-1 ml-2 pl-2 border-l border-border">
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={cn(
                'w-1 rounded-full transition-all',
                i < Math.ceil(participantCount * 0.14)
                  ? 'bg-accent-green'
                  : 'bg-surface'
              )} style={{ height: `${6 + Math.random() * 10}px` }} />
            ))}
          </div>
          <Volume2 className="w-3.5 h-3.5 text-text-muted ml-1" />
        </div>
      )}

      {mode === 'immersive' && (
        <span className="text-[10px] text-accent-cyan font-medium ml-1 px-1.5 py-0.5 rounded bg-accent-cyan/10">
          3D
        </span>
      )}
    </motion.div>
  );
}

// Cinema mode overlay effect
export function CinemaOverlay({ mode, children }: { mode: CinemaMode; children: React.ReactNode }) {
  return (
    <div className={cn(
      'relative transition-all duration-500',
      mode === 'cinema' && 'scale-[0.97] rounded-2xl overflow-hidden shadow-2xl shadow-primary/20',
      mode === 'immersive' && 'scale-100 rounded-none'
    )}>
      {/* Cinema ambient glow */}
      {mode === 'cinema' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 pointer-events-none z-10 rounded-2xl" />
          <div className="absolute -inset-4 bg-gradient-to-r from-primary/5 via-transparent to-accent-cyan/5 rounded-3xl blur-3xl pointer-events-none" />
        </>
      )}
      {children}
    </div>
  );
}
