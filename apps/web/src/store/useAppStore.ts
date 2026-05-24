import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Room, Message, RoomMember } from '@syncsaga/shared';

interface OnlineUser {
  user_id: string;
  status: 'online' | 'offline' | 'away' | 'watching';
  current_room_id: string | null;
  activity: string | null;
}

interface AppState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;

  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeRoomId: string | null;
  setActiveRoomId: (id: string | null) => void;

  rooms: Room[];
  setRooms: (rooms: Room[]) => void;
  addRoom: (room: Room) => void;

  currentRoom: (Room & { members: RoomMember[] }) | null;
  setCurrentRoom: (room: (Room & { members: RoomMember[] }) | null) => void;
  updateRoomState: (partial: Partial<Room>) => void;

  friends: User[];
  setFriends: (friends: User[]) => void;
  onlineUsers: Map<string, OnlineUser>;
  updatePresence: (presence: { user_id: string; status: OnlineUser['status']; current_room_id?: string | null; activity?: string | null }) => void;

  messages: Message[];
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;

  roomMembers: RoomMember[];
  setRoomMembers: (members: RoomMember[]) => void;
  addRoomMember: (member: RoomMember) => void;
  removeRoomMember: (userId: string) => void;

  driftStatuses: Map<string, { drift: number; status: 'synced' | 'slight' | 'desynced' }>;
  setDriftStatus: (userId: string, data: { drift: number; status: 'synced' | 'slight' | 'desynced' }) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, currentRoom: null, rooms: [], messages: [], friends: [], roomMembers: [] });
      },

      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      activeRoomId: null,
      setActiveRoomId: (id) => set({ activeRoomId: id }),

      rooms: [],
      setRooms: (rooms) => set({ rooms }),
      addRoom: (room) => set({ rooms: [...get().rooms, room] }),

      currentRoom: null,
      setCurrentRoom: (room) => set({ currentRoom: room }),
      updateRoomState: (partial) => {
        const current = get().currentRoom;
        if (current) set({ currentRoom: { ...current, ...partial } });
      },

      friends: [],
      setFriends: (friends) => set({ friends }),
      onlineUsers: new Map(),
      updatePresence: (presence) => {
        const map = new Map(get().onlineUsers);
        if (presence.status === 'offline') {
          map.delete(presence.user_id);
        } else {
          map.set(presence.user_id, presence as OnlineUser);
        }
        set({ onlineUsers: map });
      },

      messages: [],
      addMessage: (message) => {
        const exists = get().messages.some(m => m.id === message.id);
        if (!exists) set({ messages: [...get().messages, message] });
      },
      setMessages: (messages) => set({ messages }),

      roomMembers: [],
      setRoomMembers: (members) => set({ roomMembers: members }),
      addRoomMember: (member) => {
        const exists = get().roomMembers.some(m => m.user_id === member.user_id);
        if (!exists) set({ roomMembers: [...get().roomMembers, member] });
      },
      removeRoomMember: (userId) => set({ roomMembers: get().roomMembers.filter(m => m.user_id !== userId) }),

      driftStatuses: new Map(),
      setDriftStatus: (userId, data) => {
        const map = new Map(get().driftStatuses);
        map.set(userId, data);
        set({ driftStatuses: map });
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
