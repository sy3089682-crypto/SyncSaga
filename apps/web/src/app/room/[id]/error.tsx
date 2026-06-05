'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function RoomError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    try {
      import('@/lib/analytics').then(({ analytics }) => {
        analytics.capture('room_error', { error: error.message, digest: error.digest });
      });
    } catch {}
  }, [error]);

  const isNotFound = error.message?.includes('not found') || error.message?.includes('404');
  const isBanned = error.message?.includes('banned') || error.message?.includes('BANNED');
  const isFull = error.message?.includes('full') || error.message?.includes('FULL');

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4 p-8">
      <div className={`rounded-full p-4 ${isBanned ? 'bg-red-500/10' : isFull ? 'bg-yellow-500/10' : 'bg-red-500/10'}`}>
        <AlertTriangle className={`h-10 w-10 ${isBanned ? 'text-red-400' : isFull ? 'text-yellow-400' : 'text-red-400'}`} />
      </div>
      <h2 className="text-xl font-semibold">
        {isNotFound ? 'Room not found' : isBanned ? 'Banned from room' : isFull ? 'Room is full' : 'Something went wrong'}
      </h2>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        {isNotFound ? 'This room doesn\'t exist or has been closed.' :
         isBanned ? 'You have been banned from this room.' :
         isFull ? 'This room has reached its member limit.' :
         'An unexpected error occurred while loading this room.'}
      </p>
      <div className="flex gap-3">
        {!isBanned && <Button onClick={reset}><RefreshCw className="mr-1 h-4 w-4" /> Try again</Button>}
        <Link href="/discover" className="inline-flex items-center justify-center rounded-xl font-medium transition-all px-4 py-2.5 text-base bg-surface-light border border-border text-text-primary hover:border-primary/50">
          Browse rooms
        </Link>
      </div>
    </div>
  );
}
