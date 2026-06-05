import { create } from 'zustand'
import type { Room, Message, RoomMember, VoiceParticipant, SyncState } from '@syncsaga/types'

interface RoomState {
  currentRoom: Room | null
  members: RoomMember[]
  messages: Message[]
  syncState: SyncState | null
  voiceParticipants: VoiceParticipant[]
  isConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  typingUsers: string[]
  localLatency: number

  setRoom: (room: Room | null) => void
  setMembers: (members: RoomMember[]) => void
  addMember: (member: RoomMember) => void
  removeMember: (userId: string) => void
  addMessage: (message: Message) => void
  setMessages: (messages: Message[]) => void
  updateMessage: (id: string, updates: Partial<Message>) => void
  setSyncState: (state: SyncState) => void
  setVoiceParticipants: (participants: VoiceParticipant[]) => void
  updateVoiceParticipant: (userId: string, updates: Partial<VoiceParticipant>) => void
  setConnected: (connected: boolean) => void
  setConnectionStatus: (status: RoomState['connectionStatus']) => void
  addTypingUser: (userId: string) => void
  removeTypingUser: (userId: string) => void
  setLatency: (ms: number) => void
  reset: () => void
}

const initialState = {
  currentRoom: null,
  members: [],
  messages: [],
  syncState: null,
  voiceParticipants: [],
  isConnected: false,
  connectionStatus: 'disconnected' as const,
  typingUsers: [],
  localLatency: 0,
}

export const useRoomStore = create<RoomState>()((set) => ({
  ...initialState,
  setRoom: (room) => set({ currentRoom: room }),
  setMembers: (members) => set({ members }),
  addMember: (member) =>
    set((s) => ({ members: [...s.members.filter((m) => m.user_id !== member.user_id), member] })),
  removeMember: (userId) =>
    set((s) => ({ members: s.members.filter((m) => m.user_id !== userId) })),
  addMessage: (message) =>
    set((s) => ({ messages: [...s.messages.slice(-200), message] })),
  setMessages: (messages) => set({ messages }),
  updateMessage: (id, updates) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),
  setSyncState: (syncState) => set({ syncState }),
  setVoiceParticipants: (voiceParticipants) => set({ voiceParticipants }),
  updateVoiceParticipant: (userId, updates) =>
    set((s) => ({
      voiceParticipants: s.voiceParticipants.map((p) =>
        p.user_id === userId ? { ...p, ...updates } : p
      ),
    })),
  setConnected: (isConnected) => set({ isConnected }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  addTypingUser: (userId) =>
    set((s) => ({ typingUsers: [...new Set([...s.typingUsers, userId])] })),
  removeTypingUser: (userId) =>
    set((s) => ({ typingUsers: s.typingUsers.filter((id) => id !== userId) })),
  setLatency: (localLatency) => set({ localLatency }),
  reset: () => set(initialState),
}))
