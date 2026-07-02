'use client';

import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import type { Room } from '@syncsaga/shared';

/**
 * Application Store
 *
 * Manages client-side UI state and cached data.
 * Authentication state is NOT stored here — it's managed by
 * Supabase Auth via cookies and the useAuth hook.
 *
 * The store is intentionally minimal:
 * - user: cached Supabase user object (for UI rendering)
 * - rooms: cached room list (for dashboard)
 * - onlineUsers: presence indicator for friends
 * - driftStatuses: per-user sync drift in the current room
 */

interface AppState {
  // Cached user data (source of truth is Supabase Auth)
  user: User | null;
  setUser: (user: User | null) => void;

  // Room data
  rooms: Room[];
  setRooms: (rooms: Room[]) => void;
  addRoom: (room: Room) => void;
  removeRoom: (roomId: string) => void;

  // Online users (presence)
  onlineUsers: string[];
  setOnlineUsers: (userIds: string[]) => void;

  // Drift statuses (per-user sync quality in current room)
  driftStatuses: Record<string, { drift: number; status: 'synced' | 'slight' | 'desynced' }>;
  setDriftStatus: (userId: string, data: { drift: number; status: 'synced' | 'slight' | 'desynced' }) => void;
  clearDriftStatuses: () => void;

  // UI state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Reset (called on sign out)
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),

  rooms: [],
  setRooms: (rooms) => set({ rooms }),
  addRoom: (room) => set((state) => ({ rooms: [room, ...state.rooms] })),
  removeRoom: (roomId) => set((state) => ({ rooms: state.rooms.filter((r) => r.id !== roomId) })),

  onlineUsers: [],
  setOnlineUsers: (userIds) => set({ onlineUsers: userIds }),

  driftStatuses: {},
  setDriftStatus: (userId, data) =>
    set((state) => ({
      driftStatuses: { ...state.driftStatuses, [userId]: data },
    })),
  clearDriftStatuses: () => set({ driftStatuses: {} }),

  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  reset: () =>
    set({
      user: null,
      rooms: [],
      onlineUsers: [],
      driftStatuses: {},
      sidebarOpen: true,
    }),
}));
