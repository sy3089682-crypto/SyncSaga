import { useEffect, useCallback } from 'react';

export function useMediaSession(opts: {
  title?: string;
  artist?: string;
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
    });
    if (opts.playbackState) {
      try {
        navigator.mediaSession.playbackState = opts.playbackState;
      } catch (e) {}
    }
    navigator.mediaSession.setActionHandler('play', opts.onPlay || (() => {}));
    navigator.mediaSession.setActionHandler('pause', opts.onPause || (() => {}));
    navigator.mediaSession.setActionHandler('seekbackward', opts.onSeekBackward || (() => {}));
    navigator.mediaSession.setActionHandler('seekforward', opts.onSeekForward || (() => {}));
    
    // Explicitly handle MediaSessionActionHandler type requirements
    if (opts.onSeekTo) {
      navigator.mediaSession.setActionHandler('seekto', (details: { seekTime?: number }) => {
        if (details.seekTime !== undefined && opts.onSeekTo) {
          opts.onSeekTo(details.seekTime);
        }
      });
    } else {
      navigator.mediaSession.setActionHandler('seekto', null);
    }
  }, [opts.title, opts.artist, opts.playbackState, opts.onPlay, opts.onPause, opts.onSeekBackward, opts.onSeekForward, opts.onSeekTo]);

  useEffect(() => { update(); }, [update]);
}
