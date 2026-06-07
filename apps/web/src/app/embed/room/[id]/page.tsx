'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Play, Pause, MessageSquare, Users, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSocket } from '@/lib/socket';

export default function EmbedRoomPage() {
  const params = useParams();
  const roomId = params.id as string;
  const [connected, setConnected] = useState(false);
  const [memberCount, setMemberCount] = useState(1);

  useEffect(() => {
    const socket = getSocket();
    socket.emit('room:join' as any, { roomId });
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onJoined = () => setMemberCount(p => p + 1);
    const onLeft = () => setMemberCount(p => Math.max(1, p - 1));
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room:user_joined', onJoined);
    socket.on('room:user_left', onLeft);
    return () => { socket.emit('room:leave' as any, { roomId }); socket.off('connect', onConnect); };
  }, [roomId]);

  return (
    <div className="h-full bg-background text-text-primary flex flex-col">
      <div className="flex items-center justify-between p-2 border-b border-border">
        <div className="flex items-center gap-2 text-xs">
          <div className={cn('w-1.5 h-1.5 rounded-full', connected ? 'bg-accent-green' : 'bg-red-500')} />
          <span className="font-medium">SyncSaga</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-text-muted">
          <Users className="w-3 h-3" /> {memberCount}
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <Play className="w-6 h-6 text-primary" />
          </div>
          <p className="text-xs text-text-secondary">Room connected</p>
          <p className="text-[10px] text-text-muted mt-1">{connected ? 'Synced' : 'Connecting...'}</p>
        </div>
      </div>
      <div className="flex items-center justify-around p-2 border-t border-border">
        <Play className="w-4 h-4 text-text-muted" />
        <Mic className="w-4 h-4 text-text-muted" />
        <MessageSquare className="w-4 h-4 text-primary" />
        <Users className="w-4 h-4 text-text-muted" />
      </div>
    </div>
  );
}
