'use client';

import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '@/lib/supabase';

/**
 * Socket.IO client with Supabase auth.
 *
 * The socket connects with the Supabase access token in the
 * handshake auth. The backend verifies the token via
 * verifySupabaseToken() in the socket auth middleware.
 *
 * This module provides a singleton socket instance.
 * Token is fetched automatically from the Supabase session.
 */

let socket: Socket | null = null;
let connecting: Promise<Socket> | null = null;

/**
 * Get or create the singleton Socket.IO connection.
 * Automatically injects the Supabase access token.
 *
 * This is the canonical socket accessor. Do NOT pass a token —
 * the token is fetched internally from the Supabase session.
 */
export async function getSocket(): Promise<Socket> {
  if (socket?.connected) {
    return socket;
  }

  if (connecting) {
    return connecting;
  }

  connecting = (async () => {
    const token = await getAccessToken();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    if (!token) {
      throw new Error('Not authenticated — cannot connect to socket');
    }

    // Disconnect any existing stale socket
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }

    socket = io(apiUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      if (err.message.includes('Authentication') || err.message.includes('Invalid or expired')) {
        // Token is invalid — force re-auth
        window.location.href = '/auth/login';
      }
    });

    socket.on('disconnect', (reason) => {
      console.warn('Socket disconnected:', reason);
    });

    // Reconnect with fresh token on reconnection attempts
    socket.io.on('reconnect_attempt', async () => {
      if (socket) {
        const freshToken = await getAccessToken();
        if (freshToken) {
          socket.auth = { token: freshToken };
        }
      }
    });

    return new Promise<Socket>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Socket connection timeout'));
      }, 10000);

      socket!.on('connect', () => {
        clearTimeout(timeout);
        resolve(socket!);
      });

      socket!.on('connect_error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  })();

  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}

/**
 * Get the current socket instance if connected, or null.
 * Useful for registering event listeners without awaiting connection.
 */
export function getSocketSync(): Socket | null {
  return socket?.connected ? socket : null;
}

/**
 * Disconnect the socket and clean up.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  connecting = null;
}

/**
 * Reconnect with a fresh token (after session refresh).
 */
export async function reconnectSocket(): Promise<Socket> {
  disconnectSocket();
  return getSocket();
}
