import { io, Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents } from '@syncsaga/shared';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
let currentToken: string | null = null;

type EventHandler = (...args: any[]) => void;
const eventHandlers: Record<string, EventHandler> = {
  connect: () => {},
  disconnect: () => {},
  connect_error: () => {},
};

export function getSocket(token?: string | null): Socket<ServerToClientEvents, ClientToServerEvents> {
  const needsNewToken = token !== undefined && token !== currentToken;

  if (!socket || needsNewToken) {
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
    }

    currentToken = token ?? currentToken;

    socket = io(SOCKET_URL, {
      auth: { token: currentToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.3,
      timeout: 20000,
    });
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
}
