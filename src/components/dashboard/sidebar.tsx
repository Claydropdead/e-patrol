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
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useState } from 'react'
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
              'w-full justify-between h-11 px-3 text-left font-medium',
              'sidebar-item-hover dashboard-smooth-transition sidebar-button',
              'hover:bg-blue-50 hover:text-blue-700',
              isActive && 'bg-blue-50 text-blue-700 shadow-sm'
            )}
            onClick={() => toggleSection(item.id)}
          >
            <div className="flex items-center">
              <Icon className="mr-3 h-5 w-5" />
              <span className="text-sm">{item.label}</span>
            </div>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 dashboard-smooth-transition" />
            ) : (
              <ChevronRight className="h-4 w-4 dashboard-smooth-transition" />
            )}
          </Button>
          
          {isExpanded && item.children && (
            <div className="ml-3 space-y-1 pl-3 border-l-2 border-gray-100">
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
                        'w-full justify-start h-10 px-3 text-left font-medium',
                        'sidebar-item-hover dashboard-smooth-transition sidebar-button',
                        'hover:bg-blue-50 hover:text-blue-700',
                        isChildActive && 'bg-blue-100 text-blue-800 shadow-sm border-l-2 border-blue-500'
                      )}
                      onClick={() => onTabChange(child.id)}
                    >
                      <ChildIcon className="mr-3 h-4 w-4" />
                      <span className="text-sm">{child.label}</span>
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
          'w-full justify-start h-11 px-3 text-left font-medium',
          'sidebar-item-hover dashboard-smooth-transition sidebar-button',
          'hover:bg-blue-50 hover:text-blue-700',
          activeTab === item.id && 'bg-blue-100 text-blue-800 shadow-sm border-l-4 border-blue-500'
        )}
        onClick={() => onTabChange(item.id)}
      >
        <Icon className="mr-3 h-5 w-5" />
        <span className="text-sm">{item.label}</span>
      </Button>
    )
  }

  return (
    <aside className="w-64 bg-white shadow-lg border-r border-gray-100 h-screen overflow-y-auto sidebar-scroll">
      <div className="p-6">
        {/* Logo & Brand */}
        <div className="flex items-center space-x-3 mb-8 pb-6 border-b border-gray-100">
          <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md dashboard-smooth-transition hover:shadow-lg">
            <Navigation className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">E-Patrol</h2>
            <p className="text-xs text-gray-500 font-medium">MIMAROPA Command</p>
          </div>
        </div>
        
        {/* Navigation Menu */}
        <nav className="space-y-1">
          {availableItems.map(renderMenuItem)}
        </nav>
        
        {/* Access Level Card */}
        {userType === 'admin' && adminRole && (
          <div className="mt-8 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 dashboard-smooth-transition hover:shadow-sm">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-900">Access Level</h3>
            </div>
            <p className="text-sm text-blue-700 font-medium capitalize">{adminRole}</p>
            {adminRole === 'superadmin' && (
              <p className="text-xs text-blue-600 mt-1 font-medium">Full system access</p>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
