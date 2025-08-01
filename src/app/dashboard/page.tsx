'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth'
import { DashboardHeader } from '@/components/dashboard/header'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardContent } from '@/components/dashboard/content'
import { Loader2 } from 'lucide-react'

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
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <div className="flex">
        <DashboardSidebar 
          userType={userType} 
          adminRole={adminAccount?.role} 
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        <main className="flex-1 p-6">
          <DashboardContent activeTab={activeTab} />
        </main>
      </div>
    </div>
  )
}
