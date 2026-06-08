'use client';

import { useLocalParticipant } from '@livekit/components-react';
import { ScreenShare, ScreenShareOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ScreenShareControls() {
  const { localParticipant, isScreenShareEnabled } = useLocalParticipant();

  const toggleScreenShare = async () => {
    if (isScreenShareEnabled) {
      await localParticipant.setScreenShareEnabled(false);
    } else {
      await localParticipant.setScreenShareEnabled(true, {
        audio: true, // Allow sharing system audio
      });
    }
  };

  return (
    <button 
      aria-label={isScreenShareEnabled ? "Stop Sharing" : "Share Screen"} 
      aria-pressed={isScreenShareEnabled} 
      onClick={toggleScreenShare}
      className={cn(
        "p-2.5 sm:p-3 rounded-xl transition-colors", 
        isScreenShareEnabled ? 'bg-accent-cyan/20 text-accent-cyan shadow-glow-sm' : 'bg-surface-light hover:bg-surface text-text-secondary'
      )}
    >
      {isScreenShareEnabled ? <ScreenShareOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <ScreenShare className="w-4 h-4 sm:w-5 sm:h-5" />}
    </button>
  );
}
