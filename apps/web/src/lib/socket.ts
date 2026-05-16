import { io, Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents } from '@syncsaga/shared';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
let currentToken: string | null = null;

export function getSocket(token?: string | null): Socket<ServerToClientEvents, ClientToServerEvents> {
  const needsNewToken = token !== undefined && token !== currentToken;

  if (!socket || needsNewToken) {
    if (socket) {
      socket.disconnect();
    }
    
    currentToken = token ?? currentToken;
    
    socket = io(SOCKET_URL, {
      auth: { token: currentToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      console.log('[SyncSaga] Socket connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[SyncSaga] Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[SyncSaga] Socket connection error:', error.message);
    });
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
}
