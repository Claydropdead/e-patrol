import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { AdminAccount, Personnel } from '@/lib/types/database'

interface AuthState {
  user: User | null
  adminAccount: AdminAccount | null
  personnel: Personnel | null
  userType: 'admin' | 'personnel' | null
  loading: boolean
  error: string | null
  
  // Actions
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  fetchUserProfile: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  adminAccount: null,
  personnel: null,
  userType: null,
  loading: true,
  error: null,

  initialize: async () => {
    try {
      set({ loading: true, error: null })
      const supabase = createClient()
      
      // Get initial session
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      
      if (session?.user) {
        set({ user: session.user })
        await get().fetchUserProfile()
      }
      
      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          set({ user: session.user })
          await get().fetchUserProfile()
        } else {
          set({ user: null, adminAccount: null, personnel: null, userType: null })
        }
      })
      
      set({ loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null })
      const supabase = createClient()
      
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
      const supabase = createClient()
      
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
      if (!user) return
      
      const supabase = createClient()
      
      // PERFORMANCE OPTIMIZATION: Run both queries in parallel
      const [adminResult, personnelResult] = await Promise.allSettled([
        supabase
          .from('admin_accounts')
          .select('*')
          .eq('id', user.id)
          .single(),
        supabase
          .from('personnel')
          .select('*')
          .eq('id', user.id)
          .single()
      ])
      
      // Process admin result
      if (adminResult.status === 'fulfilled' && adminResult.value.data && !adminResult.value.error) {
        set({ 
          adminAccount: adminResult.value.data, 
          personnel: null, 
          userType: 'admin',
          error: null 
        })
        return
      }
      
      // Process personnel result
      if (personnelResult.status === 'fulfilled' && personnelResult.value.data && !personnelResult.value.error) {
        set({ 
          adminAccount: null, 
          personnel: personnelResult.value.data, 
          userType: 'personnel',
          error: null 
        })
        return
      }
      
      // Handle cases where both queries failed or returned no data
      const adminError = adminResult.status === 'fulfilled' ? adminResult.value.error : adminResult.reason
      const personnelError = personnelResult.status === 'fulfilled' ? personnelResult.value.error : personnelResult.reason
      
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
  }
}))
