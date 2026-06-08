import { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { openDB } from 'idb';

export function useYjsRoom(roomId: string) {
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [playbackState, setPlaybackState] = useState({ timestamp: 0, state: 'paused', speed: 1, episode: null as string | null });
  const [polls, setPolls] = useState<Record<string, any>>({});
  const [whiteboardElements, setWhiteboardElements] = useState<unknown[]>([]);

  const providerRef = useRef<WebrtcProvider | null>(null);

  useEffect(() => {
    if (!roomId) return;
    
    const ydoc = new Y.Doc();
    const provider = new WebrtcProvider(`syncsaga-room-${roomId}`, ydoc, {
      signaling: ['wss://signaling.yjs.dev', 'wss://y-webrtc-signaling-eu.herokuapp.com']
    });
    
    providerRef.current = provider;
    
    const yPlayback = ydoc.getMap('playback');
    const yPolls = ydoc.getMap('polls');
    const yWhiteboard = ydoc.getArray('whiteboard');

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

      ydoc.on('update', async () => {
        const state = Y.encodeStateAsUpdate(ydoc);
        await db.put('rooms', state, roomId);
      });
    };
    setupIDB();

    yPlayback.observe(() => {
      setPlaybackState({
        timestamp: yPlayback.get('timestamp') as number || 0,
        state: yPlayback.get('state') as string || 'paused',
        speed: yPlayback.get('speed') as number || 1,
        episode: yPlayback.get('episode') as string | null || null,
      });
    });

    yPolls.observe(() => {
      setPolls(yPolls.toJSON());
    });

    yWhiteboard.observe(() => {
      setWhiteboardElements(yWhiteboard.toArray());
    });

    setDoc(ydoc);

    return () => {
      provider.destroy();
      ydoc.destroy();
    };
  }, [roomId]);

  const updateSharedState = (updates: Partial<typeof playbackState>) => {
    if (!doc) return;
    const yPlayback = doc.getMap('playback');
    doc.transact(() => {
      if (updates.timestamp !== undefined) yPlayback.set('timestamp', updates.timestamp);
      if (updates.state !== undefined) yPlayback.set('state', updates.state);
      if (updates.speed !== undefined) yPlayback.set('speed', updates.speed);
      if (updates.episode !== undefined) yPlayback.set('episode', updates.episode);
    });
  };

  const createPoll = (pollId: string, question: string, options: string[]) => {
    if (!doc) return;
    const yPolls = doc.getMap('polls');
    yPolls.set(pollId, { question, options, votes: {} });
  };

  const votePoll = (pollId: string, userId: string, optionIndex: number) => {
    if (!doc) return;
    const yPolls = doc.getMap('polls');
    const poll = yPolls.get(pollId) as { question: string, options: string[], votes: Record<string, number> };
    if (poll) {
      doc.transact(() => {
        const newPoll = { ...poll, votes: { ...poll.votes, [userId]: optionIndex } };
        yPolls.set(pollId, newPoll);
      });
    }
  };

  const addWhiteboardElement = (element: unknown) => {
    if (!doc) return;
    const yWhiteboard = doc.getArray('whiteboard');
    yWhiteboard.push([element]);
  };

  const clearWhiteboard = () => {
    if (!doc) return;
    const yWhiteboard = doc.getArray('whiteboard');
    yWhiteboard.delete(0, yWhiteboard.length);
  };

  return { 
    doc, 
    playbackState, 
    updateSharedState,
    polls,
    createPoll,
    votePoll,
    whiteboardElements,
    addWhiteboardElement,
    clearWhiteboard
  };
}
