import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Room, Message, PresenceEvent } from '@syncsaga/shared';

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;

  // UI
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeRoomId: string | null;
  setActiveRoomId: (id: string | null) => void;

  // Data
  rooms: Room[];
  setRooms: (rooms: Room[]) => void;
  addRoom: (room: Room) => void;
  currentRoom: (Room & { members: any[] }) | null;
  setCurrentRoom: (room: (Room & { members: any[] }) | null) => void;

  // Friends & Presence
  friends: User[];
  setFriends: (friends: User[]) => void;
  onlineUsers: Map<string, PresenceEvent & { user: User }>;
  updatePresence: (presence: PresenceEvent & { user: User }) => void;

  // Messages
  messages: Message[];
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;

  // Voice
  isInVoice: boolean;
  setIsInVoice: (value: boolean) => void;
  voiceMuted: boolean;
  setVoiceMuted: (value: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      token: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),

      // UI
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      activeRoomId: null,
      setActiveRoomId: (id) => set({ activeRoomId: id }),

      // Data
      rooms: [],
      setRooms: (rooms) => set({ rooms }),
      addRoom: (room) => set({ rooms: [...get().rooms, room] }),
      currentRoom: null,
      setCurrentRoom: (room) => set({ currentRoom: room }),

      // Friends
      friends: [],
      setFriends: (friends) => set({ friends }),
      onlineUsers: new Map(),
      updatePresence: (presence) => {
        const map = new Map(get().onlineUsers);
        if (presence.status === 'offline') {
          map.delete(presence.user_id);
        } else {
          map.set(presence.user_id, presence);
        }
        set({ onlineUsers: map });
      },

      // Messages
      messages: [],
      addMessage: (message) => set({ messages: [...get().messages, message] }),
      setMessages: (messages) => set({ messages }),

      // Voice
      isInVoice: false,
      setIsInVoice: (value) => set({ isInVoice: value }),
      voiceMuted: false,
      setVoiceMuted: (value) => set({ voiceMuted: value }),
    }),
    {
      name: 'syncsaga-store',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
