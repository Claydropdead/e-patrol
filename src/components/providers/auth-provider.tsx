'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
    const { initialize } = useAuthStore()

  useEffect(() => {
    initialize()
    
    // Set up periodic token refresh (every 30 minutes)
    const tokenRefreshInterval = setInterval(async () => {
      try {
        await useAuthStore.getState().getValidSession() // Use stable reference
      } catch (error) {
        console.error('Background token refresh failed:', error)
      }
    }, 30 * 60 * 1000) // 30 minutes

    // Add visibility change listener to refresh session when user returns to tab
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        // User returned to tab, silently refresh session if needed
        try {
          await useAuthStore.getState().getValidSession()
        } catch (error) {
          console.error('Session refresh on tab focus failed:', error)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(tokenRefreshInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [initialize])

  return <>{children}</>
}
