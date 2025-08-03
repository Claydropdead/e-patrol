'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardContent } from '@/components/dashboard/content'
import { Loader2, Navigation } from 'lucide-react'

export default function DashboardPage() {
  const { user, adminAccount, personnel, userType, loading } = useAuthStore()
  const [activeTab, setActiveTab] = useState('overview')
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-3">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading dashboard...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // SECURITY: Handle users without proper profiles
  if (userType === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-red-600 text-6xl">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600">
            Your account exists but no authorized profile has been assigned.
          </p>
          <p className="text-sm text-gray-500">
            This is a security measure. Please contact your system administrator.
          </p>
          <button 
            onClick={() => useAuthStore.getState().signOut()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  // Redirect personnel to a different page or show limited access
  if (userType === 'personnel') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">Welcome Personnel</h1>
          <p className="text-gray-600">
            {personnel?.full_name}, your account is set up for mobile field operations.
          </p>
          <p className="text-sm text-gray-500">
            Please use the mobile application for location tracking and field duties.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50/30 flex overflow-hidden">
      <DashboardSidebar 
        userType={userType} 
        adminRole={adminAccount?.role} 
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <main className="flex-1 overflow-auto h-full">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-gray-100 p-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <Navigation className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">E-Patrol</h1>
              <p className="text-xs text-gray-500">MIMAROPA Command</p>
            </div>
          </div>
        </div>
        
        <div className="p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <DashboardContent activeTab={activeTab} />
          </div>
        </div>
      </main>
    </div>
  )
}
