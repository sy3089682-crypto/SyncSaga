import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { createClient } from '@/lib/supabase/client'
import type { Profile, UserTier } from '@syncsaga/types'

interface AuthState {
  user: Profile | null
  session: { access_token: string; user: { id: string; email?: string } } | null
  isLoading: boolean
  isAuthenticated: boolean
  tier: UserTier
  setUser: (user: Profile | null) => void
  setSession: (session: AuthState['session']) => void
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isLoading: true,
      isAuthenticated: false,
      tier: 'free',
      setUser: (user) => set({ user, isAuthenticated: !!user, tier: (user as any)?.tier ?? 'free' }),
      setSession: (session) => set({ session }),
      signOut: async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        set({ user: null, session: null, isAuthenticated: false, tier: 'free' })
      },
      refreshProfile: async () => {
        const { session } = get()
        if (!session) return
        const supabase = createClient()
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        if (data) set({ user: data as Profile, tier: (data as any).tier ?? 'free' })
      },
      updateProfile: async (updates) => {
        const { session } = get()
        if (!session) return
        const supabase = createClient()
        const { data } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', session.user.id)
          .select()
          .single()
        if (data) set({ user: data as Profile })
      },
    }),
    {
      name: 'syncsaga-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, session: state.session, tier: state.tier }),
    }
  )
)
