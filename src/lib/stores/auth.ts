import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import type { AdminAccount, Personnel } from '@/lib/types/database'

interface AuthState {
  user: User | null
  adminAccount: AdminAccount | null
  personnel: Personnel | null
  userType: 'admin' | 'personnel' | null
  loading: boolean
  error: string | null
  sessionRefreshed: number // Add this to track when session is refreshed
  
  // Actions
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  fetchUserProfile: () => Promise<void>
  refreshSession: () => Promise<Session | null>
  getValidSession: () => Promise<Session | null>
  triggerDataRefresh: () => void // Add this to manually trigger data refresh
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  adminAccount: null,
  personnel: null,
  userType: null,
  loading: true,
  error: null,
  sessionRefreshed: 0, // Initialize session refresh counter

  initialize: async () => {
    try {
      set({ loading: true, error: null })
      
      // Get initial session
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      
      if (session?.user) {
        set({ user: session.user })
        await get().fetchUserProfile()
        // Set initial session timestamp without triggering refresh
        set({ sessionRefreshed: Date.now() })
      }
      
      // Listen for auth changes - only handle essential events
      supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
        // Only log SIGNED_OUT events to avoid spam
        if (event === 'SIGNED_OUT') {
          console.log('Auth state change: SIGNED_OUT')
          set({ user: null, adminAccount: null, personnel: null, userType: null })
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Silently update user on token refresh, no logging or profile refetch
          set({ user: session.user })
        }
        // Remove SIGNED_IN handling to prevent reload loops when returning to tab
        // Initial auth is handled by getSession() call above
      })
      
      set({ loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null })
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) throw error
      
      if (data.user) {
        set({ user: data.user })
        await get().fetchUserProfile()
      }
      
      set({ loading: false })
      return { success: true }
    } catch (error) {
      const errorMessage = (error as Error).message
      set({ error: errorMessage, loading: false })
      return { success: false, error: errorMessage }
    }
  },

  signOut: async () => {
    try {
      set({ loading: true, error: null })
      
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      set({ 
        user: null, 
        adminAccount: null, 
        personnel: null, 
        userType: null,
        loading: false 
      })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  fetchUserProfile: async () => {
    try {
      const { user } = get()
      if (!user?.id) return
      
      // Check admin_accounts first
      const { data: adminData, error: adminError } = await supabase
        .from('admin_accounts')
        .select('*')
        .eq('id', user.id)
        .maybeSingle() // Use maybeSingle to avoid throwing on no results
      
      if (adminData && !adminError) {
        set({ 
          adminAccount: adminData, 
          personnel: null, 
          userType: 'admin',
          error: null 
        })
        return
      }
      
      // If not admin, check personnel
      const { data: personnelData, error: personnelError } = await supabase
        .from('personnel')
        .select('*')
        .eq('id', user.id)
        .maybeSingle() // Use maybeSingle to avoid throwing on no results
      
      if (personnelData && !personnelError) {
        set({ 
          adminAccount: null, 
          personnel: personnelData, 
          userType: 'personnel',
          error: null 
        })
        return
      }
      
      // If neither found, user might not be properly set up
      console.warn('User not found in admin_accounts or personnel tables:', user.id)
      set({ 
        adminAccount: null, 
        personnel: null, 
        userType: null,
        error: 'User profile not found' 
      })
      
      // Handle RLS policy errors (user might have profile but RLS blocks access)
      if (adminError?.code === 'PGRST116' && personnelError?.code === 'PGRST116') {
        // No records found - user has no profile
        set({ 
          adminAccount: null, 
          personnel: null, 
          userType: null,
          error: null 
        })
        return
      }
      
      // Handle other RLS-related errors
      if (adminError?.code === '42501' || personnelError?.code === '42501') {
        // Permission denied - likely RLS policy issue
        console.error('RLS Policy Error - User might have inactive profile')
        set({ 
          adminAccount: null, 
          personnel: null, 
          userType: null,
          error: 'Account access restricted. Please contact administrator.' 
        })
        return
      }
      
      // Some other error occurred
      console.error('Error fetching user profile:', {
        adminError,
        personnelError,
        userEmail: user.email,
        userId: user.id
      })
      set({ error: 'Error fetching user profile' })
      
    } catch (error) {
      console.error('Error in fetchUserProfile:', error)
      set({ error: (error as Error).message })
    }
  },

  refreshSession: async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) throw error
      
      if (data.session) {
        set({ 
          user: data.session.user,
          sessionRefreshed: Date.now() // Update refresh timestamp
        })
        return data.session
      }
      return null
    } catch (error) {
      console.error('Error refreshing session:', error)
      set({ error: 'Session refresh failed' })
      return null
    }
  },

  getValidSession: async () => {
    try {
      // First try to get current session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        return null
      }
      
      // Check if token is close to expiry (within 5 minutes)
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0
      const now = Date.now()
      const fiveMinutes = 5 * 60 * 1000
      
      if (expiresAt - now < fiveMinutes) {
        console.log('Token expires soon, refreshing...')
        const state = get()
        return await state.refreshSession()
      }
      
      return session
    } catch (error) {
      console.error('Error getting valid session:', error)
      return null
    }
  },

  triggerDataRefresh: () => {
    // Manually trigger data refresh by updating the timestamp
    set({ sessionRefreshed: Date.now() })
  }
}))
