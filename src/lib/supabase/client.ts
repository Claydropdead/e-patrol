import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

// Singleton pattern to prevent multiple client instances
let supabaseInstance: SupabaseClient | null = null

export const createClient = (): SupabaseClient => {
  // Return existing instance if it exists
  if (supabaseInstance) {
    return supabaseInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  // Create new instance only if none exists
  supabaseInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'e-patrol-auth-token',
      flowType: 'pkce'
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'X-Client-Info': 'e-patrol-web'
      }
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  })

  return supabaseInstance
}

// Export the singleton instance directly for components that need it
export const supabase = createClient()
