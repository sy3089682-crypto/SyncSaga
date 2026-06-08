'use client';

import { useTracks, VideoTrack } from '@livekit/components-react';
import { Track } from 'livekit-client';

export function ScreenShareOverlay() {
  const tracks = useTracks([Track.Source.ScreenShare, Track.Source.Camera]);

  if (tracks.length === 0) return null;

  return (
    <div className="absolute top-4 left-4 right-4 flex gap-4 z-40 overflow-x-auto pointer-events-none pb-4">
      {tracks.map((trackRef) => (
        <div 
          key={trackRef.participant.sid + trackRef.source} 
          className="w-64 aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-border-strong pointer-events-auto shrink-0 relative group"
        >
          <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur text-xs rounded text-white z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            {trackRef.participant.name || trackRef.participant.identity}
          </div>
          <VideoTrack trackRef={trackRef} className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  );
}
