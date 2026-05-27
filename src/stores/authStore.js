import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'

async function fetchAdminProfile(userId) {
  const { data } = await supabase
    .from('admin_users')
    .select('id, full_name, role, is_active')
    .eq('auth_user_id', userId)
    .single()
  if (!data?.is_active) return null
  return { id: data.id, fullName: data.full_name, role: data.role }
}

export const useAuthStore = create(
  persist(
    (set) => ({
      session: null,
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: true,

      setSession: (session, profile = null) => {
        set({
          session,
          user: session?.user ?? null,
          profile,
          isAuthenticated: !!session && !!profile,
        })
      },

      logout: async () => {
        await supabase.auth.signOut()
        set({ session: null, user: null, profile: null, isAuthenticated: false })
      },

      init: async () => {
        const { data: { session } } = await supabase.auth.getSession()

        let profile = null
        if (session?.user) {
          profile = await fetchAdminProfile(session.user.id)
          if (!profile) {
            await supabase.auth.signOut()
            set({ session: null, user: null, profile: null, isAuthenticated: false, isLoading: false })
            return
          }
        }

        set({
          session,
          user: session?.user ?? null,
          profile,
          isAuthenticated: !!session && !!profile,
          isLoading: false,
        })

        supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session?.user) {
            const profile = await fetchAdminProfile(session.user.id)
            if (!profile) {
              await supabase.auth.signOut()
              return
            }
            set({ session, user: session.user, profile, isAuthenticated: true })
          } else {
            set({ session: null, user: null, profile: null, isAuthenticated: false })
          }
        })
      },
    }),
    {
      name: 'fs-admin-auth',
      partialize: (state) => ({
        session: state.session,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
