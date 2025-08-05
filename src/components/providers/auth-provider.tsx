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

    return () => clearInterval(tokenRefreshInterval)
  }, [initialize])

  return <>{children}</>
}
