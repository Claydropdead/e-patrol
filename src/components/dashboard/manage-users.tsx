'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Users, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Shield, 
  Crown, 
  Building, 
  MapPin,
  UserCheck,
  UserX,
  RefreshCw,
  History,
  Save,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/stores/auth'
import { useApiData } from '@/lib/hooks/useApiData'
import { MIMAROPA_STRUCTURE } from '@/lib/constants/mimaropa'
import type { AdminRole } from '@/lib/types/database'

// Types for user data
interface AdminUser {
  id: string
  rank: string
  full_name: string
  email: string
  role: AdminRole
  is_active: boolean
  created_at: string
  updated_at: string
}

interface PersonnelUser {
  id: string
  rank: string
  full_name: string
  email: string
  contact_number?: string
  province: string
  unit: string
  sub_unit: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface AssignmentHistory {
  id: string
  personnel_id: string
  previous_unit: string | null
  previous_sub_unit: string | null
  previous_province: string | null
  new_unit: string | null
  new_sub_unit: string | null
  new_province: string | null
  changed_at: string
  changed_by: string | null
  reason: string | null
  changed_by_admin?: {
    full_name: string
    rank: string
  } | null
}

type UserType = 'admin' | 'personnel'

export function ManageUsers() {
  const [activeTab, setActiveTab] = useState<UserType>('admin')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  
  // Use stable API hook without reactive dependencies
  const {
    data: usersData,
    loading,
    refresh
  } = useApiData<{ adminUsers: AdminUser[]; personnelUsers: PersonnelUser[] }>({
    endpoint: '/api/users',
    params: { type: 'all' }, // Remove reactive params
    onError: (errorMsg) => toast.error(errorMsg as string)
  })

  // Extract and filter users from API response locally
  const allAdminUsers = usersData?.adminUsers || []
  const allPersonnelUsers = usersData?.personnelUsers || []
  
  // Filter users locally instead of via API
  const adminUsers = allAdminUsers.filter(user => {
    const matchesSearch = !searchTerm || 
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.rank.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && user.is_active) ||
      (filterStatus === 'inactive' && !user.is_active)
    
    return matchesSearch && matchesStatus
  })
  
  const personnelUsers = allPersonnelUsers.filter(user => {
    const matchesSearch = !searchTerm || 
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.rank.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && user.is_active) ||
      (filterStatus === 'inactive' && !user.is_active)
    
    return matchesSearch && matchesStatus
  })
  
  // Auto refresh state
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  
  // Edit dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | PersonnelUser | null>(null)
  const [editingUserType, setEditingUserType] = useState<UserType>('admin')
  const [editForm, setEditForm] = useState<Partial<AdminUser & PersonnelUser & { reassignment_reason?: string }>>({})
  const [editLoading, setEditLoading] = useState(false)
  
  // Assignment history dialog states
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [assignmentHistory, setAssignmentHistory] = useState<AssignmentHistory[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [currentPersonnelId, setCurrentPersonnelId] = useState<string | null>(null)
  
  // Simple cache for assignment history to avoid repeated API calls
  const [historyCache, setHistoryCache] = useState<Record<string, AssignmentHistory[]>>({})

  // Auto-refresh every 2 minutes when enabled (reduced frequency)
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      refresh()
      setLastRefresh(new Date())
    }, 120000) // Changed from 30 seconds to 2 minutes
    return () => clearInterval(interval)
  }, [autoRefresh, refresh]) // Added refresh dependency

  // Manual refresh function for button click
  const handleManualRefresh = useCallback(() => {
    refresh()
    setLastRefresh(new Date())
    toast.success('Users data refreshed')
  }, [refresh]) // Added refresh dependency

  const getRoleInfo = (role: AdminRole) => {
    const roleConfig = {
      superadmin: { 
        icon: Crown, 
        color: 'text-amber-600', 
        bgColor: 'bg-amber-100', 
        borderColor: 'border-amber-200',
        label: 'Superadmin'
      },
      regional: { 
        icon: Building, 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-100', 
        borderColor: 'border-blue-200',
        label: 'Regional'
      },
      provincial: { 
        icon: MapPin, 
        color: 'text-emerald-600', 
        bgColor: 'bg-emerald-100', 
        borderColor: 'border-emerald-200',
        label: 'Provincial'
      },
      station: { 
        icon: Shield, 
        color: 'text-purple-600', 
        bgColor: 'bg-purple-100', 
        borderColor: 'border-purple-200',
        label: 'Station'
      }
    }
    return roleConfig[role]
  }

  const AdminUsersTable = ({ users, loading, onToggleStatus, onDelete }: { 
    users: AdminUser[], 
    loading: boolean, 
    onToggleStatus: (id: string, type: UserType) => void,
    onDelete: (id: string, type: UserType) => void 
  }) => {
    if (loading) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading admin accounts...</p>
            </div>
          </CardContent>
        </Card>
      )
    }

    if (users.length === 0) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No admin accounts found</h3>
              <p className="text-gray-600">Try adjusting your search criteria</p>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">User</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const roleInfo = getRoleInfo(user.role)
                  const IconComponent = roleInfo.icon
                  return (
                    <tr key={user.id} className={`border-b border-gray-100 hover:bg-gray-50 ${!user.is_active ? 'opacity-60' : ''}`}>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                            user.is_active ? 'bg-blue-600' : 'bg-gray-400'
                          }`}>
                            {user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.full_name}</p>
                            <p className="text-sm text-gray-600">{user.rank}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="secondary" className={`${roleInfo.bgColor} ${roleInfo.color} ${roleInfo.borderColor} border`}>
                          <IconComponent className="h-3 w-3 mr-1" />
                          {roleInfo.label}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant={user.is_active ? "default" : "secondary"} className={
                          user.is_active 
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200" 
                            : "bg-red-100 text-red-800 border-red-200"
                        }>
                          {user.is_active ? (
                            <>
                              <UserCheck className="h-3 w-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <UserX className="h-3 w-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(user, 'admin')}
                            className="h-8 w-8 p-0 hover:bg-blue-50"
                            title="Edit admin account"
                          >
                            <Edit className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onToggleStatus(user.id, 'admin')}
                            className={`h-8 w-8 p-0 ${user.is_active ? 'hover:bg-red-50' : 'hover:bg-emerald-50'}`}
                          >
                            {user.is_active ? (
                              <EyeOff className="h-4 w-4 text-red-600" />
                            ) : (
                              <Eye className="h-4 w-4 text-emerald-600" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDelete(user.id, 'admin')}
                            className={`h-8 w-8 p-0 ${
                              user.is_active 
                                ? 'hover:bg-orange-50 border-orange-200' 
                                : 'hover:bg-red-50 border-red-200'
                            }`}
                            title={user.is_active ? 'Deactivate user' : 'Permanently delete user'}
                          >
                            <Trash2 className={`h-4 w-4 ${
                              user.is_active ? 'text-orange-600' : 'text-red-600'
                            }`} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    )
  }

  const PersonnelUsersTable = ({ users, loading, onToggleStatus, onDelete }: { 
    users: PersonnelUser[], 
    loading: boolean, 
    onToggleStatus: (id: string, type: UserType) => void,
    onDelete: (id: string, type: UserType) => void 
  }) => {
    if (loading) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading personnel...</p>
            </div>
          </CardContent>
        </Card>
      )
    }

    if (users.length === 0) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No personnel found</h3>
              <p className="text-gray-600">Try adjusting your search criteria</p>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">User</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Assignment</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className={`border-b border-gray-100 hover:bg-gray-50 ${!user.is_active ? 'opacity-60' : ''}`}>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                          user.is_active ? 'bg-blue-600' : 'bg-gray-400'
                        }`}>
                          {user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.full_name}</p>
                          <p className="text-sm text-gray-600">{user.rank}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{user.province}</p>
                        <p className="text-sm text-gray-600">{user.sub_unit}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant={user.is_active ? "default" : "secondary"} className={
                        user.is_active 
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200" 
                          : "bg-red-100 text-red-800 border-red-200"
                      }>
                        {user.is_active ? (
                          <>
                            <UserCheck className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <UserX className="h-3 w-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user, 'personnel')}
                          className="h-8 w-8 p-0 hover:bg-blue-50"
                          title="Edit personnel record"
                        >
                          <Edit className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewAssignmentHistory(user.id)}
                          className="h-8 w-8 p-0 hover:bg-purple-50"
                          title="View assignment history"
                        >
                          <History className="h-4 w-4 text-purple-600" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onToggleStatus(user.id, 'personnel')}
                          className={`h-8 w-8 p-0 ${user.is_active ? 'hover:bg-red-50' : 'hover:bg-emerald-50'}`}
                        >
                          {user.is_active ? (
                            <EyeOff className="h-4 w-4 text-red-600" />
                          ) : (
                            <Eye className="h-4 w-4 text-emerald-600" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDelete(user.id, 'personnel')}
                          className={`h-8 w-8 p-0 ${
                            user.is_active 
                              ? 'hover:bg-orange-50 border-orange-200' 
                              : 'hover:bg-red-50 border-red-200'
                          }`}
                          title={user.is_active ? 'Deactivate user' : 'Permanently delete user'}
                        >
                          <Trash2 className={`h-4 w-4 ${
                            user.is_active ? 'text-orange-600' : 'text-red-600'
                          }`} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    )
  }

  const filteredAdminUsers = adminUsers.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.rank.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && user.is_active) ||
                         (filterStatus === 'inactive' && !user.is_active)
    return matchesSearch && matchesStatus
  })

  const filteredPersonnelUsers = personnelUsers.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.rank.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.contact_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.province.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.sub_unit.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && user.is_active) ||
                         (filterStatus === 'inactive' && !user.is_active)
    return matchesSearch && matchesStatus
  })

  const handleToggleUserStatus = async (userId: string, userType: UserType) => {
    try {
      const session = await useAuthStore.getState().getValidSession()
      
      if (!session) {
        toast.error('Authentication required')
        return
      }

      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId,
          userType,
          action: 'toggle_status'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update user status')
      }

      toast.success('User status updated successfully')
      
      // Refresh data to ensure consistency
      setTimeout(() => refresh(), 1000)
    } catch (error) {
      toast.error('Failed to update user status')
      console.error('Error updating user status:', error)
    }
  }

  const handleDeleteUser = async (userId: string, userType: UserType) => {
    // Get the user data to determine current status
    const user = userType === 'admin' 
      ? adminUsers.find(u => u.id === userId)
      : personnelUsers.find(u => u.id === userId)

    if (!user) {
      toast.error('User not found')
      return
    }

    let confirmMessage = ''
    let actionType = ''

    if (user.is_active) {
      // Active user - will be deactivated
      confirmMessage = `Are you sure you want to deactivate ${user.full_name}?\n\nThis will:\n• Set their status to inactive\n• Preserve their data for audit purposes\n• Allow reactivation later if needed`
      actionType = 'deactivate'
    } else {
      // Inactive user - will be permanently deleted
      confirmMessage = `⚠️ PERMANENT DELETION WARNING ⚠️\n\nAre you sure you want to permanently delete ${user.full_name}?\n\nThis action will:\n• Permanently remove all user data\n• Cannot be undone\n• Remove all associated records\n\nType "DELETE" to confirm permanent deletion.`
      actionType = 'permanent_delete'
    }

    // Show appropriate confirmation dialog
    if (actionType === 'permanent_delete') {
      const userInput = prompt(confirmMessage)
      if (userInput !== 'DELETE') {
        toast.info('Permanent deletion cancelled')
        return
      }
    } else {
      if (!confirm(confirmMessage)) {
        return
      }
    }

    try {
      const session = await useAuthStore.getState().getValidSession()
      
      if (!session) {
        toast.error('Authentication required')
        return
      }

      const force = !user.is_active // Force permanent deletion for inactive users
      const response = await fetch(`/api/users?id=${userId}&type=${userType}&force=${force}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to delete user')
      }

      const result = await response.json()

      // Show appropriate success message
      if (result.type === 'permanent') {
        toast.success(`${user.full_name} has been permanently deleted`)
      } else if (result.type === 'deactivated') {
        toast.success(`${user.full_name} has been deactivated`)
      }
      
      // Refresh data to ensure consistency
      setTimeout(() => refresh(), 1000)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete user'
      toast.error(errorMessage)
      console.error('Error deleting user:', error)
    }
  }

  const handleEditUser = (user: AdminUser | PersonnelUser, userType: UserType) => {
    setEditingUser(user)
    setEditingUserType(userType)
    // Initialize form with user data, ensuring clean state
    const cleanForm: Partial<AdminUser & PersonnelUser & { reassignment_reason?: string }> = { ...user }
    // Clear any reassignment fields when opening edit
    cleanForm.reassignment_reason = ''
    setEditForm(cleanForm)
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingUser || !editForm) return

    // Check if assignment is changing and require reason
    const isPersonnel = editingUserType === 'personnel'
    const assignmentChanged = isPersonnel && editingUser && (
      editForm.province !== (editingUser as PersonnelUser).province ||
      editForm.sub_unit !== (editingUser as PersonnelUser).sub_unit
    )

    if (assignmentChanged && (!editForm.reassignment_reason || editForm.reassignment_reason.trim() === '')) {
      toast.error('Please provide a reason for the unit reassignment')
      return
    }

    setEditLoading(true)
    try {
      const session = await useAuthStore.getState().getValidSession()
      if (!session) {
        toast.error('Authentication required')
        return
      }

      const endpoint = editingUserType === 'admin' ? '/api/admin/update' : '/api/personnel/update'
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: editingUser.id,
          updates: editForm
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update user')
      }

      const result = await response.json()

      toast.success('User updated successfully')
      setEditDialogOpen(false)
      setEditingUser(null)
      setEditForm({})

      if (result.assignmentChanged) {
        toast.info('Assignment change recorded in history')
        // Clear assignment history cache for this user if it was personnel
        if (editingUserType === 'personnel' && editingUser?.id) {
          setHistoryCache(prev => {
            const newCache = { ...prev }
            delete newCache[editingUser.id]
            return newCache
          })
        }
      }

      // Refresh data to ensure consistency
      setTimeout(() => refresh(), 1000)

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update user')
      console.error('Error updating user:', error)
    } finally {
      setEditLoading(false)
    }
  }

  const handleViewAssignmentHistory = async (personnelId: string, forceRefresh = false) => {
    setCurrentPersonnelId(personnelId)
    setHistoryDialogOpen(true)
    
    // Check cache first unless forcing refresh
    if (!forceRefresh && historyCache[personnelId]) {
      setAssignmentHistory(historyCache[personnelId])
      return
    }
    
    setHistoryLoading(true)
    setAssignmentHistory([]) // Clear previous data immediately
    
    try {
      const session = await useAuthStore.getState().getValidSession()
      if (!session) {
        toast.error('Authentication required')
        return
      }

      // Add timeout to prevent hanging requests
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      // Add timestamp to prevent caching and ensure fresh data
      const url = new URL(`/api/personnel/update`, window.location.origin)
      url.searchParams.set('personnelId', personnelId)
      url.searchParams.set('_t', Date.now().toString()) // Cache buster

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Personnel not found')
        }
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Failed to fetch assignment history (${response.status})`)
      }

      const result = await response.json()
      
      // Get assignment history data - handle both new and old data formats
      const historyData = result.history || []
      console.log('Assignment history received:', historyData)
      
      // Simple validation - just ensure we have basic required fields
      const filteredHistory = historyData.filter((record: AssignmentHistory) => {
        return record.personnel_id && (record.previous_unit || record.new_unit)
      })
      
      console.log('Filtered assignment history:', filteredHistory)
      setAssignmentHistory(filteredHistory)
      
      // Cache the results for 2 minutes (shorter for live data)
      setHistoryCache(prev => ({
        ...prev,
        [personnelId]: filteredHistory
      }))
      
      // Clear cache after 2 minutes
      setTimeout(() => {
        setHistoryCache(prev => {
          const newCache = { ...prev }
          delete newCache[personnelId]
          return newCache
        })
      }, 2 * 60 * 1000)

      // Show success message if no records found
      if (filteredHistory.length === 0) {
        toast.info('No assignment history found for this personnel')
      }

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          toast.error('Request timed out. Please try again.')
        } else {
          toast.error(error.message || 'Failed to load assignment history')
        }
      } else {
        toast.error('Failed to load assignment history')
      }
      console.error('Error loading assignment history:', error)
      setAssignmentHistory([]) // Ensure empty state on error
    } finally {
      setHistoryLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
          <p className="text-gray-600 mt-1">View and manage all admin accounts and personnel</p>
          <div className="flex items-center space-x-4 mt-2">
            <p className="text-sm text-gray-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-600">Auto-refresh (30s)</span>
            </label>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleManualRefresh} variant="outline" className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4" />
            <span>Refresh Now</span>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="search" className="text-sm font-medium text-gray-700 mb-2 block">
                Search Users
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by name, email, rank..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Lists */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as UserType)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="admin" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Admin Accounts</span>
          </TabsTrigger>
          <TabsTrigger value="personnel" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Personnel</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="admin" className="mt-6">
          <AdminUsersTable users={filteredAdminUsers} loading={loading} onToggleStatus={handleToggleUserStatus} onDelete={handleDeleteUser} />
        </TabsContent>

        <TabsContent value="personnel" className="mt-6">
          <PersonnelUsersTable users={filteredPersonnelUsers} loading={loading} onToggleStatus={handleToggleUserStatus} onDelete={handleDeleteUser} />
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit {editingUserType === 'admin' ? 'Admin Account' : 'Personnel Record'}
            </DialogTitle>
            <DialogDescription>
              Update user information. Changes will be logged for audit purposes.
            </DialogDescription>
          </DialogHeader>

          {editForm && (
            <div className="space-y-4">
              {/* Common fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-rank">Rank</Label>
                  <Input
                    id="edit-rank"
                    value={editForm.rank || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, rank: e.target.value }))}
                    placeholder="e.g. Police Colonel"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-full-name">Full Name</Label>
                  <Input
                    id="edit-full-name"
                    value={editForm.full_name || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Enter full name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-email">Email Address</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@pnp.gov.ph"
                />
              </div>

              {/* Admin-specific fields */}
              {editingUserType === 'admin' && (
                <div>
                  <Label htmlFor="edit-role">Admin Role</Label>
                  <Select 
                    value={editForm.role || ''} 
                    onValueChange={(value: AdminRole) => setEditForm(prev => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="superadmin">Superadmin</SelectItem>
                      <SelectItem value="regional">Regional Admin</SelectItem>
                      <SelectItem value="provincial">Provincial Admin</SelectItem>
                      <SelectItem value="station">Station Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Personnel-specific fields */}
              {editingUserType === 'personnel' && (
                <>
                  <div>
                    <Label htmlFor="edit-contact">Contact Number</Label>
                    <Input
                      id="edit-contact"
                      value={editForm.contact_number || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, contact_number: e.target.value }))}
                      placeholder="+63 917 123 4567"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="edit-province">Province/Unit</Label>
                      <Select
                        value={editForm.province || ''}
                        onValueChange={(value) => {
                          setEditForm(prev => ({
                            ...prev,
                            province: value,
                            unit: value,
                            sub_unit: '' // Reset sub-unit when province changes
                          }))
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select province/unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(MIMAROPA_STRUCTURE).map((province) => (
                            <SelectItem key={province} value={province}>
                              {province}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {editForm.province && (
                      <div>
                        <Label htmlFor="edit-sub-unit">Sub-Unit</Label>
                        <Select
                          value={editForm.sub_unit || ''}
                          onValueChange={(value) => setEditForm(prev => ({ ...prev, sub_unit: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select sub-unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {editForm.province && MIMAROPA_STRUCTURE[editForm.province as keyof typeof MIMAROPA_STRUCTURE] ? 
                              MIMAROPA_STRUCTURE[editForm.province as keyof typeof MIMAROPA_STRUCTURE].subUnits.map((subUnit) => (
                                <SelectItem key={subUnit} value={subUnit}>
                                  {subUnit}
                                </SelectItem>
                              )) : null
                            }
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Show reassignment reason for personnel if unit is changing */}
                  {editingUser && (
                    editForm.province !== (editingUser as PersonnelUser).province ||
                    editForm.sub_unit !== (editingUser as PersonnelUser).sub_unit
                  ) && (
                    <div className="space-y-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="font-medium text-yellow-800">Unit Reassignment Required</h4>
                      <p className="text-sm text-yellow-700">
                        You are changing this personnel&apos;s unit assignment. Please provide a reason for this reassignment.
                      </p>
                      <div>
                        <Label htmlFor="reassignment-reason" className="text-red-600">
                          Reason for Reassignment *
                        </Label>
                        <Input
                          id="reassignment-reason"
                          value={editForm.reassignment_reason || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, reassignment_reason: e.target.value }))}
                          placeholder="e.g. Promotional transfer, Administrative requirement, Disciplinary action"
                          className={`${(!editForm.reassignment_reason || editForm.reassignment_reason.trim() === '') ? 'border-red-300 focus:border-red-500' : ''}`}
                          required
                        />
                        {(!editForm.reassignment_reason || editForm.reassignment_reason.trim() === '') && (
                          <p className="text-sm text-red-600 mt-1">This field is required for unit reassignments</p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div>
                <Label htmlFor="edit-status">Account Status</Label>
                <Select
                  value={editForm.is_active ? 'active' : 'inactive'}
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, is_active: value === 'active' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false)
                setEditingUser(null)
                setEditForm({})
              }}
              disabled={editLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={editLoading}>
              {editLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assignment History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Assignment History</DialogTitle>
                <DialogDescription>
                  View all unit and sub-unit assignments for this personnel
                </DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (currentPersonnelId) {
                    // Force refresh to get latest data
                    handleViewAssignmentHistory(currentPersonnelId, true)
                  }
                }}
                className="flex items-center space-x-1"
                disabled={historyLoading}
              >
                <RefreshCw className={`h-3 w-3 ${historyLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {historyLoading ? (
              <div className="space-y-4">
                {/* Loading skeleton for better UX */}
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="h-6 w-20 bg-gray-200 rounded"></div>
                      <div className="h-4 w-32 bg-gray-200 rounded"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <div className="h-4 w-12 bg-gray-200 rounded mb-1"></div>
                        <div className="h-4 w-24 bg-gray-200 rounded mb-1"></div>
                        <div className="h-4 w-32 bg-gray-200 rounded"></div>
                      </div>
                      <div>
                        <div className="h-4 w-8 bg-gray-200 rounded mb-1"></div>
                        <div className="h-4 w-28 bg-gray-200 rounded mb-1"></div>
                        <div className="h-4 w-36 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                    <div className="h-4 w-48 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 w-40 bg-gray-200 rounded"></div>
                  </div>
                ))}
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Loading assignment history...</p>
                </div>
              </div>
            ) : assignmentHistory.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Assignment History</h3>
                <p className="text-gray-600">This personnel has no recorded unit reassignments</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignmentHistory.map((assignment, index) => (
                  <div key={assignment.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            Assignment #{assignmentHistory.length - index}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {new Date(assignment.changed_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-1">From:</h4>
                            <p className="text-sm text-gray-600">{assignment.previous_province}</p>
                            <p className="text-sm text-gray-500">{assignment.previous_sub_unit}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 mb-1">To:</h4>
                            <p className="text-sm text-gray-600">{assignment.new_province}</p>
                            <p className="text-sm text-gray-500">{assignment.new_sub_unit}</p>
                          </div>
                        </div>
                        
                        <div className="mb-2">
                          <span className="text-sm font-medium text-gray-700">Reason: </span>
                          <span className="text-sm text-gray-600">{assignment.reason}</span>
                        </div>
                        
                        {assignment.reason && (
                          <div className="mb-2">
                            <span className="text-sm font-medium text-gray-700">Reason: </span>
                            <span className="text-sm text-gray-600">{assignment.reason}</span>
                          </div>
                        )}
                        
                        <div className="text-sm text-gray-500">
                          Changed by: {assignment.changed_by_admin?.rank || ''} {assignment.changed_by_admin?.full_name || 'System'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
