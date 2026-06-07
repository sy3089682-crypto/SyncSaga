'use client';

import { Languages } from 'lucide-react';
import { getSocket } from '@/lib/socket';

export function SubDubToggle({ roomId, isHost, currentTrack, onToggle }: { roomId: string; isHost: boolean; currentTrack: 'sub' | 'dub'; onToggle: (t: 'sub'|'dub') => void }) {
  if (!isHost) return (
    <span className="text-xs bg-bg-surface px-2 py-1 rounded-md text-text-secondary uppercase font-bold tracking-wider">
      {currentTrack}
    </span>
  );

  const toggle = () => {
    const next = currentTrack === 'sub' ? 'dub' : 'sub';
    onToggle(next);
    const socket = getSocket();
    socket.emit('room:update' as any, { roomId, settings: { track: next } });
  };

  return (
    <button 
      onClick={toggle}
      className="btn-secondary py-1 px-3 text-xs bg-bg-surface hover:bg-bg-elevated flex items-center gap-1.5 uppercase font-bold tracking-wider"
    >
      <Languages className="w-3.5 h-3.5" /> {currentTrack}
    </button>
  );
}
