import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Room, Message, RoomMember } from '@syncsaga/shared';

interface OnlineUser {
  user_id: string;
  status: 'online' | 'offline' | 'away' | 'watching';
  current_room_id: string | null;
  activity: string | null;
}

interface AuthSlice {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

interface RoomSlice {
  rooms: Room[];
  currentRoom: (Room & { members: RoomMember[] }) | null;
  activeRoomId: string | null;
  roomMembers: RoomMember[];
  messages: Message[];
  driftStatuses: Map<string, { drift: number; status: 'synced' | 'slight' | 'desynced' }>;
  setRooms: (rooms: Room[]) => void;
  addRoom: (room: Room) => void;
  setCurrentRoom: (room: (Room & { members: RoomMember[] }) | null) => void;
  updateRoomState: (partial: Partial<Room>) => void;
  setActiveRoomId: (id: string | null) => void;
  setRoomMembers: (members: RoomMember[]) => void;
  addRoomMember: (member: RoomMember) => void;
  removeRoomMember: (userId: string) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setDriftStatus: (userId: string, data: { drift: number; status: 'synced' | 'slight' | 'desynced' }) => void;
}

interface UiSlice {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

interface SocialSlice {
  friends: User[];
  onlineUsers: Map<string, OnlineUser>;
  setFriends: (friends: User[]) => void;
  updatePresence: (presence: { user_id: string; status: OnlineUser['status']; current_room_id?: string | null; activity?: string | null }) => void;
}

export type AppState = AuthSlice & RoomSlice & UiSlice & SocialSlice;

const initialAuth: AuthSlice = {
  user: null,
  token: null,
  isAuthenticated: false,
  setUser: () => {},
  setToken: () => {},
  logout: () => {},
};

const initialRoom: RoomSlice = {
  rooms: [],
  currentRoom: null,
  activeRoomId: null,
  roomMembers: [],
  messages: [],
  driftStatuses: new Map(),
  setRooms: () => {},
  addRoom: () => {},
  setCurrentRoom: () => {},
  updateRoomState: () => {},
  setActiveRoomId: () => {},
  setRoomMembers: () => {},
  addRoomMember: () => {},
  removeRoomMember: () => {},
  addMessage: () => {},
  setMessages: () => {},
  setDriftStatus: () => {},
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialAuth,
      ...initialRoom,
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      friends: [],
      onlineUsers: new Map(),
      setFriends: (friends) => set({ friends }),

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, currentRoom: null, rooms: [], messages: [], friends: [], roomMembers: [] });
      },

      setActiveRoomId: (id) => set({ activeRoomId: id }),
      setRooms: (rooms) => set({ rooms }),
      addRoom: (room) => set({ rooms: [...get().rooms, room] }),

      setCurrentRoom: (room) => set({ currentRoom: room }),
      updateRoomState: (partial) => {
        const current = get().currentRoom;
        if (current) set({ currentRoom: { ...current, ...partial } });
      },

      setRoomMembers: (members) => set({ roomMembers: members }),
      addRoomMember: (member) => {
        const exists = get().roomMembers.some(m => m.user_id === member.user_id);
        if (!exists) set({ roomMembers: [...get().roomMembers, member] });
      },
      removeRoomMember: (userId) => set({ roomMembers: get().roomMembers.filter(m => m.user_id !== userId) }),

      addMessage: (message) => {
        const exists = get().messages.some(m => m.id === message.id);
        if (!exists) set({ messages: [...get().messages, message] });
      },
      setMessages: (messages) => set({ messages }),

      setDriftStatus: (userId, data) => {
        const map = new Map(get().driftStatuses);
        map.set(userId, data);
        set({ driftStatuses: map });
      },

      updatePresence: (presence) => {
        const map = new Map(get().onlineUsers);
        if (presence.status === 'offline') {
          map.delete(presence.user_id);
        } else {
          map.set(presence.user_id, presence as OnlineUser);
        }
        set({ onlineUsers: map });
      },
    }),
    {
      name: 'syncsaga-store',
      partialize: (state) => ({ token: state.token, user: state.user }),
      merge: (persisted: any, current: AppState) => ({
        ...current,
        token: persisted?.token ?? null,
        user: persisted?.user ?? null,
        isAuthenticated: !!persisted?.user,
      }),
    }
  )
);
