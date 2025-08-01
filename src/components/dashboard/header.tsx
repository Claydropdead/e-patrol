'use client'

import { Bell, Search, User, LogOut, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/lib/stores/auth'
import { toast } from 'sonner'

export function DashboardHeader() {
  const { adminAccount, personnel, userType, signOut } = useAuthStore()

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Successfully signed out')
    } catch (signOutError) {
      console.error('Sign out error:', signOutError)
      toast.error('Error signing out')
    }
  }

  const currentUser = adminAccount || personnel
  const userDisplayName = currentUser?.full_name || 'User'
  const userRole = adminAccount?.role || 'personnel'

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6">
      {/* Left - Logo & Title */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <span className="text-white font-bold text-sm">PNP</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">E-Patrol MIMAROPA</h1>
            <p className="text-xs text-gray-500">Command Center</p>
          </div>
        </div>
      </div>

      {/* Center - Search */}
      <div className="flex-1 max-w-lg mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search personnel, units, locations..."
            className="pl-10 bg-gray-50 border-gray-300"
          />
        </div>
      </div>

      {/* Right - Actions & Profile */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            3
          </span>
        </Button>

        {/* Theme Toggle */}
        <Button variant="ghost" size="sm">
          <Sun className="h-5 w-5" />
        </Button>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">{userDisplayName}</p>
                <p className="text-xs text-gray-500 capitalize">{userRole}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
