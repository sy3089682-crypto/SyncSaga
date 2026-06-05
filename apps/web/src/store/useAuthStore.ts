import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  profile: any | null; // Replace 'any' with your Profile type from @syncsaga/types if available
  sessionToken: string | null;
  setSession: (user: User | null, token: string | null) => void;
  setProfile: (profile: any) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      sessionToken: null,
      setSession: (user, token) => set({ user, sessionToken: token }),
      setProfile: (profile) => set({ profile }),
      clearSession: () => set({ user: null, profile: null, sessionToken: null }),
    }),
    {
      name: 'syncsaga-auth',
    }
  )
);
