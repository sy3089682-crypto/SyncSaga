import { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { openDB } from 'idb';

export function useYjsRoom(roomId: string) {
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [playbackState, setPlaybackState] = useState({ timestamp: 0, state: 'paused', speed: 1, episode: null as string | null });
  const providerRef = useRef<WebrtcProvider | null>(null);

  useEffect(() => {
    if (!roomId) return;
    
    const ydoc = new Y.Doc();
    // Connect to WebRTC signaling servers for decentralized sync
    const provider = new WebrtcProvider(`syncsaga-room-${roomId}`, ydoc, {
      signaling: ['wss://signaling.yjs.dev', 'wss://y-webrtc-signaling-eu.herokuapp.com']
    });
    
    providerRef.current = provider;
    
    // Shared state map
    const yMap = ydoc.getMap('playback');

    // Offline persistence
    const setupIDB = async () => {
      const db = await openDB('syncsaga-offline', 1, {
        upgrade(db) {
          db.createObjectStore('rooms');
        },
      });
      const offlineData = await db.get('rooms', roomId);
      if (offlineData) {
        Y.applyUpdate(ydoc, offlineData);
      }

      // Save to IDB whenever document updates
      ydoc.on('update', async (update) => {
        const state = Y.encodeStateAsUpdate(ydoc);
        await db.put('rooms', state, roomId);
      });
    };
    setupIDB();

    // Listen to changes
    yMap.observe(() => {
      setPlaybackState({
        timestamp: yMap.get('timestamp') as number || 0,
        state: yMap.get('state') as string || 'paused',
        speed: yMap.get('speed') as number || 1,
        episode: yMap.get('episode') as string | null || null,
      });
    });

    setDoc(ydoc);

    return () => {
      provider.destroy();
      ydoc.destroy();
    };
  }, [roomId]);

  const updateSharedState = (updates: Partial<typeof playbackState>) => {
    if (!doc) return;
    const yMap = doc.getMap('playback');
    doc.transact(() => {
      if (updates.timestamp !== undefined) yMap.set('timestamp', updates.timestamp);
      if (updates.state !== undefined) yMap.set('state', updates.state);
      if (updates.speed !== undefined) yMap.set('speed', updates.speed);
      if (updates.episode !== undefined) yMap.set('episode', updates.episode);
    });
  };

  return { doc, playbackState, updateSharedState };
}
