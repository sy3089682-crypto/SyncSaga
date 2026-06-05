import { create } from 'zustand';
import { Socket } from 'socket.io-client';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  latency: number;
  setSocket: (socket: Socket) => void;
  setConnected: (status: boolean) => void;
  setLatency: (ms: number) => void;
  disconnect: () => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  latency: 0,
  setSocket: (socket) => set({ socket }),
  setConnected: (isConnected) => set({ isConnected }),
  setLatency: (latency) => set({ latency }),
  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    set({ socket: null, isConnected: false, latency: 0 });
  },
}));
