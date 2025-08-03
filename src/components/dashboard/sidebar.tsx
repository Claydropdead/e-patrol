'use client'

import { 
  LayoutDashboard, 
  Users, 
  MapPin, 
  UserPlus, 
  Settings, 
  Shield,
  BarChart3,
  Navigation,
  ChevronDown,
  ChevronRight,
  FileText,
  Menu,
  X,
  Bell,
  LogOut,
  User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { useAuthStore } from '@/lib/stores/auth'
import { toast } from 'sonner'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { AdminRole } from '@/lib/types/database'
import type { LucideIcon } from 'lucide-react'

interface MenuItem {
  id: string
  label: string
  icon: LucideIcon
  available: AdminRole[]
  type: 'item' | 'section'
  children?: MenuChild[]
}

interface MenuChild {
  id: string
  label: string
  icon: LucideIcon
  available: AdminRole[]
}

interface DashboardSidebarProps {
  userType: 'admin' | 'personnel' | null
  adminRole?: AdminRole
  activeTab: string
  onTabChange: (tab: string) => void
}

export function DashboardSidebar({ userType, adminRole, activeTab, onTabChange }: DashboardSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['user-management'])
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { adminAccount, personnel, signOut } = useAuthStore()

  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsMobileMenuOpen(!isMobileMenuOpen)
    } else {
      setIsCollapsed(!isCollapsed)
    }
  }

  const closeMobileMenu = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsMobileMenuOpen(false)
    }
  }

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

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const menuItems: MenuItem[] = [
    {
      id: 'overview',
      label: 'Dashboard',
      icon: LayoutDashboard,
      available: ['superadmin', 'regional', 'provincial', 'station'],
      type: 'item'
    },
    {
      id: 'user-management',
      label: 'User Management',
      icon: Users,
      available: ['superadmin'],
      type: 'section',
      children: [
        {
          id: 'create-admin',
          label: 'Create Admin Account',
          icon: Shield,
          available: ['superadmin']
        },
        {
          id: 'create-personnel',
          label: 'Create Personnel',
          icon: UserPlus,
          available: ['superadmin']
        },
        {
          id: 'manage-users',
          label: 'Manage Users',
          icon: Users,
          available: ['superadmin']
        }
      ]
    },
    {
      id: 'live-monitoring',
      label: 'Live Monitoring',
      icon: MapPin,
      available: ['superadmin', 'regional', 'provincial', 'station'],
      type: 'item'
    },
    {
      id: 'live-map',
      label: 'Live Map',
      icon: Navigation,
      available: ['superadmin', 'regional', 'provincial', 'station'],
      type: 'item'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      available: ['superadmin', 'regional', 'provincial'],
      type: 'item'
    },
    {
      id: 'audit-logs',
      label: 'Audit Logs',
      icon: FileText,
      available: ['superadmin'],
      type: 'item'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      available: ['superadmin', 'regional', 'provincial', 'station'],
      type: 'item'
    }
  ]

  // Filter menu items based on user role
  const availableItems = menuItems.filter(item => {
    if (userType !== 'admin' || !adminRole) return false
    return item.available.includes(adminRole)
  })

  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icon
    const isExpanded = expandedSections.includes(item.id)
    const isActive = activeTab === item.id

    if (item.type === 'section') {
      return (
        <div key={item.id} className="space-y-1">
          <Button
            variant="ghost"
            className={cn(
              isCollapsed ? 'w-10 h-10 p-0 mx-auto' : 'w-full justify-between h-11 px-3 text-left font-medium',
              'sidebar-item-hover dashboard-smooth-transition sidebar-button',
              'hover:bg-blue-50 hover:text-blue-700',
              isExpanded && 'bg-blue-50 text-blue-700 shadow-sm'
            )}
            onClick={() => !isCollapsed && toggleSection(item.id)}
            title={isCollapsed ? item.label : undefined}
          >
            {isCollapsed ? (
              <Icon className="h-5 w-5" />
            ) : (
              <>
                <div className="flex items-center">
                  <Icon className="mr-3 h-5 w-5" />
                  <span className="text-sm">{item.label}</span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 dashboard-smooth-transition" />
                ) : (
                  <ChevronRight className="h-4 w-4 dashboard-smooth-transition" />
                )}
              </>
            )}
          </Button>
          
          {!isCollapsed && isExpanded && item.children && (
            <div className="ml-1 mt-1 space-y-1 pl-3 border-l-2 border-blue-200 bg-gradient-to-r from-blue-50/30 to-transparent rounded-r-lg py-1">
              {item.children
                .filter((child: MenuChild) => child.available.includes(adminRole!))
                .map((child: MenuChild) => {
                  const ChildIcon = child.icon
                  const isChildActive = activeTab === child.id
                  return (
                    <Button
                      key={child.id}
                      variant="ghost"
                      className={cn(
                        'w-full justify-start h-10 px-4 text-left font-medium',
                        'sidebar-item-hover dashboard-smooth-transition sidebar-button',
                        'hover:bg-blue-50 hover:text-blue-700 hover:shadow-sm',
                        isChildActive && 'bg-blue-100 text-blue-800 shadow-lg border-l-4 border-blue-600 font-semibold'
                      )}
                      onClick={() => {
                        onTabChange(child.id)
                        closeMobileMenu()
                      }}
                    >
                      <ChildIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="text-sm truncate">{child.label}</span>
                    </Button>
                  )
                })}
            </div>
          )}
        </div>
      )
    }

    return (
      <Button
        key={item.id}
        variant="ghost"
        className={cn(
          isCollapsed ? 'w-10 h-10 p-0 mx-auto' : 'w-full justify-start h-11 px-3 text-left font-medium',
          'sidebar-item-hover dashboard-smooth-transition sidebar-button',
          'hover:bg-blue-50 hover:text-blue-700',
          activeTab === item.id && 'bg-blue-100 text-blue-800 shadow-md border-l-4 border-blue-500 font-semibold'
        )}
        onClick={() => {
          onTabChange(item.id)
          closeMobileMenu()
        }}
        title={isCollapsed ? item.label : undefined}
      >
        {isCollapsed ? (
          <Icon className="h-5 w-5" />
        ) : (
          <>
            <Icon className="mr-3 h-5 w-5" />
            <span className="text-sm">{item.label}</span>
          </>
        )}
      </Button>
    )
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={closeMobileMenu}
        />
      )}
      
      <aside className={cn(
        "bg-white shadow-lg border-r border-gray-100 h-screen overflow-y-auto sidebar-scroll transition-all duration-300 ease-in-out z-50",
        // Desktop behavior
        "md:relative md:translate-x-0",
        isCollapsed ? "md:w-16" : "md:w-64",
        // Mobile behavior
        "fixed left-0 top-0 w-64",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-4">
          {/* Header with Hamburger Menu */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            {!isCollapsed && (
              <div className="flex items-center space-x-2">
                {/* Notifications */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="relative h-8 w-8 p-0 hover:bg-gray-100"
                >
                  <Bell className="h-4 w-4 text-gray-600" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium">
                    3
                  </span>
                </Button>
              </div>
            )}
          </div>

          {/* Logo & Brand */}
          {!isCollapsed && (
            <div className="flex items-center space-x-3 mb-8 pb-6 border-b border-gray-100">
              <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md dashboard-smooth-transition hover:shadow-lg">
                <Navigation className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">E-Patrol</h2>
                <p className="text-xs text-gray-500 font-medium">MIMAROPA Command</p>
              </div>
            </div>
          )}
          
          {/* Collapsed Logo */}
          {isCollapsed && (
            <div className="flex justify-center mb-8 pb-6 border-b border-gray-100">
              <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md">
                <Navigation className="h-6 w-6 text-white" />
              </div>
            </div>
          )}
          
          {/* Navigation Menu */}
          <nav className="space-y-2">
            {availableItems.map(renderMenuItem)}
          </nav>
          
          {/* User Profile & Sign Out */}
          <div className="mt-8 border-t border-gray-100 pt-4">
            {isCollapsed ? (
              <div className="flex flex-col space-y-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-10 w-10 p-0 hover:bg-gray-100 mx-auto"
                  title={userDisplayName}
                >
                  <User className="h-5 w-5 text-gray-600" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSignOut}
                  className="h-10 w-10 p-0 hover:bg-red-50 text-red-600 mx-auto"
                  title="Sign Out"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full flex items-center space-x-3 h-12 px-3 hover:bg-gray-50 justify-start">
                    <div className="h-9 w-9 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-sm">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{userDisplayName}</p>
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
            )}
          </div>
          
          {/* Access Level Card */}
          {!isCollapsed && userType === 'admin' && adminRole && (
            <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 dashboard-smooth-transition hover:shadow-sm">
              <div className="flex items-center space-x-3 mb-3">
                <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Access Level</h3>
                  <p className="text-sm text-blue-700 font-medium capitalize">{adminRole}</p>
                </div>
              </div>
              {adminRole === 'superadmin' && (
                <div className="mt-2 px-2 py-1 bg-blue-100 rounded-md">
                  <p className="text-xs text-blue-700 font-medium">🔐 Full System Access</p>
                </div>
              )}
              {adminRole === 'regional' && (
                <div className="mt-2 px-2 py-1 bg-green-100 rounded-md">
                  <p className="text-xs text-green-700 font-medium">🌍 MIMAROPA Region</p>
                </div>
              )}
              {adminRole === 'provincial' && (
                <div className="mt-2 px-2 py-1 bg-yellow-100 rounded-md">
                  <p className="text-xs text-yellow-700 font-medium">🏛️ Provincial Level</p>
                </div>
              )}
              {adminRole === 'station' && (
                <div className="mt-2 px-2 py-1 bg-purple-100 rounded-md">
                  <p className="text-xs text-purple-700 font-medium">🏢 Station Level</p>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
