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
    <header className="bg-white border-b border-gray-100 h-16 flex items-center justify-between px-6 shadow-sm">
      {/* Left - Logo & Title */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-md">
            <span className="text-white font-bold text-sm">PNP</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">E-Patrol MIMAROPA</h1>
            <p className="text-xs text-gray-500 font-medium">Command Center</p>
          </div>
        </div>
      </div>

      {/* Center - Search */}
      <div className="flex-1 max-w-lg mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search personnel, units, locations..."
            className="pl-10 bg-gray-50/80 border-gray-200 focus:bg-white focus:border-blue-300 focus:ring-blue-100 transition-all duration-200"
          />
        </div>
      </div>

      {/* Right - Actions & Profile */}
      <div className="flex items-center space-x-3">
        {/* Notifications */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative h-10 w-10 p-0 hover:bg-gray-100 transition-colors duration-200"
        >
          <Bell className="h-5 w-5 text-gray-600" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium shadow-sm">
            3
          </span>
        </Button>

        {/* Theme Toggle */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-10 w-10 p-0 hover:bg-gray-100 transition-colors duration-200"
        >
          <Sun className="h-5 w-5 text-gray-600" />
        </Button>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-3 h-12 px-3 hover:bg-gray-50 transition-colors duration-200">
              <div className="h-9 w-9 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-sm">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900">{userDisplayName}</p>
                <p className="text-xs text-gray-500 capitalize font-medium">{userRole}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 shadow-lg border-gray-100">
            <DropdownMenuItem className="h-10 font-medium">
              <User className="mr-2 h-4 w-4" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleSignOut} 
              className="text-red-600 h-10 font-medium hover:bg-red-50 focus:bg-red-50"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
