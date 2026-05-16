import { create } from 'zustand'
import type { User } from '@/types'
import { api } from '@/lib/api'

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string, displayName: string) => Promise<void>
  logout: () => void
  loadSession: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  login: async (username, password) => {
    const res = await api.post<{ access_token: string; token_type: string }>('/api/auth/login', { username, password })
    api.setToken(res.access_token)
    const user = await api.get<User>('/api/auth/me')
    set({ user, token: res.access_token })
  },

  register: async (username, password, displayName) => {
    const res = await api.post<{ access_token: string; token_type: string }>('/api/auth/register', { username, password, display_name: displayName })
    api.setToken(res.access_token)
    const user = await api.get<User>('/api/auth/me')
    set({ user, token: res.access_token })
  },

  logout: () => {
    api.setToken(null)
    set({ user: null, token: null })
  },

  loadSession: () => {
    const token = api.loadToken()
    if (token) {
      api.get<User>('/api/auth/me')
        .then((user) => set({ user, token, isLoading: false }))
        .catch(() => { api.setToken(null); set({ user: null, token: null, isLoading: false }) })
    } else {
      set({ isLoading: false })
    }
  },
}))
