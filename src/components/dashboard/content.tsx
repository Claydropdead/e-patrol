'use client'

import { useAuthStore } from '@/lib/stores/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminCreationForm } from './admin-creation-form'
import { PersonnelCreationForm } from './personnel-creation-form'
import { ManageUsers } from './manage-users'
import { AuditLogsViewer } from './audit-logs-viewer'
import { LiveMonitoring } from './live-monitoring'
import { GeofencingContent } from './geofencing'
import { Badge } from '@/components/ui/badge'
import { Users, Shield, MapPin, BarChart3 } from 'lucide-react'

interface DashboardContentProps {
  activeTab: string
}

export function DashboardContent({ activeTab }: DashboardContentProps) {
  const { loading } = useAuthStore()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  // Dashboard Overview
  if (activeTab === 'overview') {
    return <DashboardOverview />
  }

  // Create Admin Page
  if (activeTab === 'create-admin') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Admin Account</h1>
          <p className="text-gray-600 mt-2">Create new administrative accounts for the PNP E-Patrol system</p>
        </div>
        <AdminCreationForm />
      </div>
    )
  }

  // Create Personnel Page
  if (activeTab === 'create-personnel') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Personnel Account</h1>
          <p className="text-gray-600 mt-2">Create new personnel accounts for field officers in MIMAROPA region</p>
        </div>
        <PersonnelCreationForm />
      </div>
    )
  }

  // Manage Users Page
  if (activeTab === 'manage-users') {
    return <ManageUsers />
  }

  // Live Monitoring Page
  if (activeTab === 'live-monitoring') {
    return <LiveMonitoring key="live-monitoring" />
  }

  // Geofencing Page
  if (activeTab === 'geofencing') {
    return <GeofencingContent />
  }

  // Analytics Page
  if (activeTab === 'analytics') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-2">Performance metrics and operational insights</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              System Analytics
            </CardTitle>
            <CardDescription>
              Operational metrics and performance data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Coming soon: Charts and graphs showing patrol coverage, response times, and system usage statistics.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Audit Logs Page (Superadmin only)
  if (activeTab === 'audit-logs') {
    return <AuditLogsViewer />
  }

  // Settings Page
  if (activeTab === 'settings') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">System configuration and preferences</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
            <CardDescription>
              Configure system preferences and regional settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Coming soon: System configuration options, notification settings, and regional customizations.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Default fallback
  return <DashboardOverview />
}

function DashboardOverview() {
  const { adminAccount, personnel, userType } = useAuthStore()

  if (userType === 'admin' && adminAccount) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600 mt-2">Welcome to the PNP E-Patrol MIMAROPA Command Center</p>
        </div>

        {/* Welcome Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Welcome, {adminAccount.full_name}
              <Badge variant={adminAccount.role === 'superadmin' ? 'default' : 'secondary'}>
                {adminAccount.role}
              </Badge>
            </CardTitle>
            <CardDescription>
              {adminAccount.rank} - {adminAccount.email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {adminAccount.role === 'superadmin' 
                ? 'You have full access to create admin accounts and personnel across MIMAROPA region.'
                : `You have ${adminAccount.role} level access to the E-Patrol system.`
              }
            </p>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Personnel</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Active field officers</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admin Accounts</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">System administrators</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Patrols</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Personnel on duty</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions for Superadmin */}
        {adminAccount.role === 'superadmin' && (
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common administrative tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Use the sidebar navigation to create admin accounts and personnel, or monitor live operations.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  if (userType === 'personnel' && personnel) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Welcome, {personnel.full_name}</CardTitle>
            <CardDescription>
              {personnel.rank} - {personnel.email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Assignment:</strong> {personnel.province}
              </div>
              <div>
                <strong>Sub-Unit:</strong> {personnel.sub_unit}
              </div>
              <div>
                <strong>Contact:</strong> {personnel.contact_number || 'Not provided'}
              </div>
              <div>
                <strong>Status:</strong> 
                <Badge variant={personnel.is_active ? 'default' : 'destructive'} className="ml-2">
                  {personnel.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // SECURITY: This should never be reached due to checks in dashboard page
  // If we get here, there's a security issue
  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="text-red-800">Unauthorized Access</CardTitle>
        <CardDescription className="text-red-600">
          Security violation detected. Access denied.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-red-700">
          This incident has been logged. Please contact system administrator.
        </p>
      </CardContent>
    </Card>
  )
}
