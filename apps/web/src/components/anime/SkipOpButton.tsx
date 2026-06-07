'use client';

import { FastForward } from 'lucide-react';
import { getSocket } from '@/lib/socket';
import { useRoom } from '@/hooks/useRoom';

export function SkipOpButton({ roomId, currentTime, isHost }: { roomId: string; currentTime: number; isHost: boolean }) {
  if (!isHost) return null;

  const handleSkip = () => {
    const socket = getSocket();
    // Assuming standard OP is 1:30 (90 seconds)
    const targetTime = currentTime + 90;
    socket.emit('sync:event' as any, {
      room_id: roomId,
      type: 'seek',
      timestamp: targetTime,
      server_time: Date.now()
    });
  };

  return (
    <button 
      onClick={handleSkip}
      className="btn-secondary py-1 px-3 text-xs bg-bg-surface hover:bg-bg-elevated flex items-center gap-1.5"
    >
      <FastForward className="w-3.5 h-3.5" /> Skip OP
    </button>
  );
}
