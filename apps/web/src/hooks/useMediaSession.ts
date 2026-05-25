'use client';

import { useEffect, useCallback } from 'react';

export function useMediaSession(opts: {
  title?: string;
  artist?: string;
  album?: string;
  artwork?: { src: string; sizes: string; type: string }[];
  playbackState?: 'playing' | 'paused' | 'none';
  onPlay?: () => void;
  onPause?: () => void;
  onSeekBackward?: () => void;
  onSeekForward?: () => void;
  onSeekTo?: (time: number) => void;
}) {
  const update = useCallback(() => {
    if (!('mediaSession' in navigator)) return;
    if (opts.title) navigator.mediaSession.metadata = new MediaMetadata({
      title: opts.title,
      artist: opts.artist || 'SyncSaga',
      album: opts.album || 'Watch Party',
      artwork: opts.artwork || [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    });
    if (opts.playbackState) {
      navigator.mediaSession.playbackState = opts.playbackState;
    }
    navigator.mediaSession.setActionHandler('play', opts.onPlay || (() => {}));
    navigator.mediaSession.setActionHandler('pause', opts.onPause || (() => {}));
    navigator.mediaSession.setActionHandler('seekbackward', opts.onSeekBackward || (() => {}));
    navigator.mediaSession.setActionHandler('seekforward', opts.onSeekForward || (() => {}));
    navigator.mediaSession.setActionHandler('seekto', opts.onSeekTo || (() => {}));
  }, [opts.title, opts.artist, opts.playbackState]);

  useEffect(() => { update(); }, [update]);
}
