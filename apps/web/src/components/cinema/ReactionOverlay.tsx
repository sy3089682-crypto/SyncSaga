'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ReactionEvent, ReactionType } from '@/hooks/useReactions';
import { REACTION_CONFIGS } from '@/hooks/useReactions';

interface ReactionOverlayProps {
  reactions: ReactionEvent[];
  onDismiss?: () => void;
  maxVisible?: number;
  showTimestamps?: boolean;
}

// Floating reaction component
function FloatingReaction({
  reaction,
  onComplete,
}: {
  reaction: ReactionEvent;
  onComplete: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const animRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const duration = 2000;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(elapsed / duration, 1);
      setProgress(newProgress);
      
      if (newProgress < 1) {
        requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };
    
    requestAnimationFrame(animate);
  }, [onComplete]);

  const config = REACTION_CONFIGS[reaction.type];
  const opacity = 1 - progress;
  const translateY = -50 * progress;

  return (
    <motion.div
      ref={animRef}
      initial={{ opacity: 1, y: 0, scale: 0.5 }}
      animate={{
        opacity,
        y: translateY,
        scale: 0.5 + (1 - progress) * 0.5,
      }}
      exit={{ opacity: 0, y: -100 }}
      style={{
        position: 'absolute',
        left: `${20 + Math.random() * 60}%`,
        bottom: '40%',
        zIndex: 100,
        pointerEvents: 'none',
      }}
      className="text-4xl sm:text-5xl drop-shadow-lg"
    >
      <span 
        style={{ 
          color: config?.color || '#fff',
          filter: `drop-shadow(0 0 10px ${config?.color}40)` 
        }}
      >
        {config?.emoji || '💥'}
      </span>
    </motion.div>
  );
}

// Fullscreen reaction overlay
function FullscreenReaction({
  reaction,
  onDismiss,
}: {
  reaction: ReactionEvent;
  onDismiss: () => void;
}) {
  const config = REACTION_CONFIGS[reaction.type];

  useEffect(() => {
    const handleClick = () => onDismiss();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      onClick={onDismiss}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `radial-gradient(circle, ${config?.color}20 0%, transparent 70%)`,
        cursor: 'pointer',
      }}
    >
      <motion.div
        initial={{ scale: 0.5, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        style={{
          fontSize: '8rem',
          filter: `drop-shadow(0 0 30px ${config?.color}80)`,
        }}
      >
        {config?.emoji}
      </motion.div>

      {reaction.username && (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'absolute',
            bottom: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#fff',
            fontSize: '1.2rem',
            fontWeight: 600,
            background: 'rgba(0,0,0,0.5)',
            padding: '0.5rem 1rem',
            borderRadius: '999px',
          }}
        >
          {reaction.username}
        </motion.p>
      )}
    </motion.div>
  );
}

// Reaction bar (bottom of video)
function ReactionBar({
  reactions,
  maxVisible = 5,
  showTimestamps = false,
}: {
  reactions: ReactionEvent[];
  maxVisible?: number;
  showTimestamps?: boolean;
}) {
  const visibleReactions = reactions.slice(-maxVisible);

  if (visibleReactions.length === 0) return null;

  return (
    <div className="absolute bottom-20 left-4 right-4 flex justify-center gap-2">
      {visibleReactions.map((reaction) => {
        const config = REACTION_CONFIGS[reaction.type];
        return (
          <div
            key={reaction.id}
            className="flex flex-col items-center gap-1 animate-bounce"
            style={{ animationDuration: '2s' }}
          >
            <span
              className="text-xl hover:scale-110 transition-transform cursor-pointer"
              style={{ color: config?.color }}
              title={reaction.username}
            >
              {config?.emoji}
            </span>
            {showTimestamps && reaction.episodeTimestamp && (
              <span className="text-[10px] text-white/60">
                {Math.floor(reaction.episodeTimestamp / 60)}:{(reaction.episodeTimestamp % 60).toString().padStart(2, '0')}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Floating reactions container
function FloatingReactionsContainer({
  reactions,
  onReactionComplete,
}: {
  reactions: ReactionEvent[];
  onReactionComplete: (id: string) => void;
}) {
  const activeReactions = reactions.filter(r => !r.isFullscreen).slice(-10);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <AnimatePresence>
        {activeReactions.map((reaction) => (
          <FloatingReaction
            key={reaction.id}
            reaction={reaction}
            onComplete={() => onReactionComplete(reaction.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export function ReactionOverlay({
  reactions,
  onDismiss,
  maxVisible = 5,
  showTimestamps = false,
}: ReactionOverlayProps) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const handleReactionComplete = (id: string) => {
    setCompletedIds(prev => new Set(prev).add(id));
  };

  const activeReactions = reactions.filter(r => !completedIds.has(r.id) && !r.isFullscreen);

  return (
    <>
      {/* Floating reactions animation */}
      <FloatingReactionsContainer
        reactions={activeReactions}
        onReactionComplete={handleReactionComplete}
      />

      {/* Bottom reaction bar */}
      <ReactionBar
        reactions={reactions}
        maxVisible={maxVisible}
        showTimestamps={showTimestamps}
      />

      {/* Fullscreen reaction */}
      <AnimatePresence>
        {reactions.find(r => r.isFullscreen) && (
          <FullscreenReaction
            reaction={reactions.find(r => r.isFullscreen)!}
            onDismiss={onDismiss || (() => {})}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// Specialized reaction types for different occasions
export const REACTION_PRESETS = {
  // Quick reaction for timestamps
  quick: ['laugh', 'fire', 'heart', 'gg', 'shock'] as ReactionType[],
  
  // Intense moment reactions
  intense: ['fire', 'shock', 'wow', 'clap'] as ReactionType[],
  
  // Sad/emotional moments
  emotional: ['cry', 'sad', 'love'] as ReactionType[],
  
  // Celebration moments
  celebration: ['fire', 'gg', 'clap', 'heart', 'wow'] as ReactionType[],
  
  // Negative reactions
  negative: ['angry', 'sad'] as ReactionType[],
};

// Get reactions grouped by type for analytics
export function groupReactionsByType(reactions: ReactionEvent[]): Record<ReactionType, number> {
  const grouped: Record<string, number> = {};
  
  reactions.forEach(r => {
    grouped[r.type] = (grouped[r.type] || 0) + 1;
  });
  
  // Return with all types initialized
  const result: Record<ReactionType, number> = {} as any;
  (Object.keys(REACTION_CONFIGS) as ReactionType[]).forEach(type => {
    result[type] = grouped[type] || 0;
  });
  
  return result;
}

// Get reaction timeline (reactions over time)
export function getReactionTimeline(
  reactions: ReactionEvent[],
  episodeDuration: number,
  intervalSeconds = 30
): { time: number; count: number; reactions: ReactionEvent[] }[] {
  const timeline: { time: number; count: number; reactions: ReactionEvent[] }[] = [];
  
  for (let t = 0; t < episodeDuration; t += intervalSeconds) {
    const windowReactions = reactions.filter(r => {
      if (r.episodeTimestamp === undefined) return false;
      return r.episodeTimestamp >= t && r.episodeTimestamp < t + intervalSeconds;
    });
    
    timeline.push({
      time: t,
      count: windowReactions.length,
      reactions: windowReactions.slice(0, 5), // Top 5 reactions in window
    });
  }
  
  return timeline;
}
