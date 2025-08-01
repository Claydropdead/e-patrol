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
  ChevronRight
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
              'w-full justify-between',
              isActive && 'bg-blue-50 text-blue-700'
            )}
            onClick={() => toggleSection(item.id)}
          >
            <div className="flex items-center">
              <Icon className="mr-3 h-4 w-4" />
              {item.label}
            </div>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          
          {isExpanded && item.children && (
            <div className="ml-6 space-y-1">
              {item.children
                .filter((child: MenuChild) => child.available.includes(adminRole!))
                .map((child: MenuChild) => {
                  const ChildIcon = child.icon
                  return (
                    <Button
                      key={child.id}
                      variant={activeTab === child.id ? 'default' : 'ghost'}
                      className={cn(
                        'w-full justify-start',
                        activeTab === child.id && 'bg-blue-50 text-blue-700 hover:bg-blue-50'
                      )}
                      onClick={() => onTabChange(child.id)}
                    >
                      <ChildIcon className="mr-3 h-4 w-4" />
                      {child.label}
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
        variant={activeTab === item.id ? 'default' : 'ghost'}
        className={cn(
          'w-full justify-start',
          activeTab === item.id && 'bg-blue-50 text-blue-700 hover:bg-blue-50'
        )}
        onClick={() => onTabChange(item.id)}
      >
        <Icon className="mr-3 h-4 w-4" />
        {item.label}
      </Button>
    )
  }

  return (
    <aside className="w-64 bg-white shadow-sm border-r border-gray-200">
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-8">
          <Navigation className="h-8 w-8 text-blue-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">E-Patrol</h2>
            <p className="text-xs text-gray-500">MIMAROPA Command</p>
          </div>
        </div>
        
        <nav className="space-y-2">
          {availableItems.map(renderMenuItem)}
        </nav>
        
        {userType === 'admin' && adminRole && (
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Access Level</h3>
            <p className="text-xs text-gray-600 capitalize">{adminRole}</p>
            {adminRole === 'superadmin' && (
              <p className="text-xs text-blue-600 mt-1">Full system access</p>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
