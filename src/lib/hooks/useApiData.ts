import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/lib/stores/auth'

interface UseApiDataOptions {
  endpoint: string
  params?: Record<string, string>
  debounceMs?: number
  onSuccess?: (data: unknown) => void
  onError?: (error: string) => void
}

export function useApiData<T = unknown>({
  endpoint,
  params = {},
  debounceMs = 0,
  onSuccess,
  onError
}: UseApiDataOptions) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    console.log(`🔄 Fetching ${endpoint}...`)
    setLoading(true)
    setError(null)

    try {
      // Get fresh session
      const session = await useAuthStore.getState().getValidSession()
      if (!session) {
        throw new Error('Authentication required')
      }

      // Build URL with params (no cache busting unless explicitly needed)
      const searchParams = new URLSearchParams(params)
      const url = searchParams.toString() ? `${endpoint}?${searchParams}` : endpoint
      
      console.log(`🌐 API call: ${url}`)

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Cache-Control': 'no-cache'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log(`✅ ${endpoint} data received`)

      if (result.error) {
        throw new Error(result.error)
      }

      setData(result)
      onSuccess?.(result)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'API request failed'
      console.error(`❌ ${endpoint} error:`, errorMessage)
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setLoading(false)
      console.log(`🏁 ${endpoint} complete`)
    }
  }, [endpoint]) // Simplified dependencies - removed unstable params and callbacks

  // Initial data fetch only
  useEffect(() => {
    if (debounceMs > 0) {
      const timer = setTimeout(fetchData, debounceMs)
      return () => clearTimeout(timer)
    } else {
      fetchData()
    }
  }, []) // Empty dependency array - only run once on mount

  // Manual refresh function for external triggers
  const refresh = useCallback(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refresh
  }
}
