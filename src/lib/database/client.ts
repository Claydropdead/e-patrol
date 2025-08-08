import { createClient } from '@supabase/supabase-js'
import { Client } from 'pg'

// Supabase client with service role key for server-side operations
export const createServerSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Secure database client for direct SQL operations when Supabase client isn't sufficient
export const createDatabaseClient = (): Client => {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  return new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false // Required for Supabase hosted databases
    }
  })
}

// Helper function to execute SQL queries safely
export const executeQuery = async <T = Record<string, unknown>>(
  query: string, 
  params: unknown[] = []
): Promise<T[]> => {
  const client = createDatabaseClient()
  
  try {
    await client.connect()
    const result = await client.query(query, params)
    return result.rows
  } finally {
    await client.end()
  }
}
