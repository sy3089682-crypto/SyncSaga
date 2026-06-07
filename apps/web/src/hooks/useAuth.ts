'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'

export function useAuth() {
  const {
    user,
    session,
    isLoading,
    isAuthenticated,
    tier,
    setUser,
    setSession,
    signOut,
    refreshProfile,
  } = useAuthStore()

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setSession(session as any)
      if (session?.user) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }: any) => {
            if (data) setUser(data as any)
          })
      }
      useAuthStore.setState({ isLoading: false })
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session as any)
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        if (data) setUser(data as any)
      } else {
        setUser(null)
      }
      useAuthStore.setState({ isLoading: false })
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, session, isLoading, isAuthenticated, tier, signOut, refreshProfile }
}
