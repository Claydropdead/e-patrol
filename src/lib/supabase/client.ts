import { createBrowserClient } from '@supabase/ssr'

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // PERFORMANCE OPTIMIZATION: Improve connection handling
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'e-patrol-auth-token'
      },
      db: {
        schema: 'public'
      },
      // Add connection pooling settings
      global: {
        headers: {
          'X-Client-Info': 'e-patrol-web'
        }
      }
    }
  )
