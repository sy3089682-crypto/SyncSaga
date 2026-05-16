import { create } from 'zustand'
import type { Room, SyncState, User } from '@/types'
import { api } from '@/lib/api'

interface RoomState {
  currentRoom: Room | null
  participants: User[]
  syncState: SyncState | null
  isJoined: boolean
  setRoom: (room: Room) => void
  setParticipants: (users: User[]) => void
  setSyncState: (state: SyncState) => void
  join: (roomId: string) => Promise<void>
  leave: (roomId: string) => Promise<void>
  fetchRoom: (roomId: string) => Promise<void>
  reset: () => void
}

export const useRoomStore = create<RoomState>((set, get) => ({
  currentRoom: null,
  participants: [],
  syncState: null,
  isJoined: false,

  setRoom: (room) => set({ currentRoom: room }),
  setParticipants: (users) => set({ participants: users }),
  setSyncState: (state) => set({ syncState: state }),

  join: async (roomId) => {
    await rooms.join(roomId)
    set({ isJoined: true })
  },

  leave: async (roomId) => {
    await rooms.leave(roomId)
    set({ isJoined: false, currentRoom: null, participants: [], syncState: null })
  },

  fetchRoom: async (roomId) => {
    const room = await api.get<Room>(`/api/rooms/${roomId}`)
    set({ currentRoom: room })
  },

  reset: () => set({ currentRoom: null, participants: [], syncState: null, isJoined: false }),
}))
