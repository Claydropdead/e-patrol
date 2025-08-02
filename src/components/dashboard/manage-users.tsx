'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
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
  region: string
  province: string
  unit: string
  sub_unit: string
  is_active: boolean
  created_at: string
  updated_at: string
}

type UserType = 'admin' | 'personnel'

export function ManageUsers() {
  const [activeTab, setActiveTab] = useState<UserType>('admin')
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [personnelUsers, setPersonnelUsers] = useState<PersonnelUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // Load users from API
  useEffect(() => {
    loadUsers()
  }, [])

  // Reload users when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadUsers()
    }, 500) // Debounce search

    return () => clearTimeout(timeoutId)
  }, [searchTerm, filterRole, filterStatus])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const searchParams = new URLSearchParams({
        type: 'all',
        search: searchTerm,
        role: filterRole,
        status: filterStatus
      })

      const response = await fetch(`/api/users?${searchParams}`)
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const data = await response.json()
      
      if (data.adminUsers) {
        setAdminUsers(data.adminUsers)
      }
      if (data.personnelUsers) {
        setPersonnelUsers(data.personnelUsers)
      }
    } catch (error) {
      toast.error('Failed to load users')
      console.error('Error loading users:', error)
      
      // Fallback to mock data for development
      const mockAdminUsers: AdminUser[] = [
        {
          id: '1',
          rank: 'Police Colonel',
          full_name: 'Juan Carlos Santos',
          email: 'jc.santos@pnp.gov.ph',
          role: 'superadmin',
          is_active: true,
          created_at: '2024-01-15T10:30:00Z',
          updated_at: '2024-01-15T10:30:00Z'
        },
        {
          id: '2',
          rank: 'Police Major',
          full_name: 'Maria Elena Rodriguez',
          email: 'me.rodriguez@pnp.gov.ph',
          role: 'regional',
          is_active: true,
          created_at: '2024-02-10T14:20:00Z',
          updated_at: '2024-02-10T14:20:00Z'
        },
        {
          id: '3',
          rank: 'Police Captain',
          full_name: 'Roberto Miguel Cruz',
          email: 'rm.cruz@pnp.gov.ph',
          role: 'provincial',
          is_active: false,
          created_at: '2024-03-05T09:15:00Z',
          updated_at: '2024-03-05T09:15:00Z'
        }
      ]

      const mockPersonnelUsers: PersonnelUser[] = [
        {
          id: '4',
          rank: 'Police Officer III',
          full_name: 'Jose Antonio Dela Cruz',
          email: 'ja.delacruz@pnp.gov.ph',
          contact_number: '+63 917 123 4567',
          region: 'MIMAROPA',
          province: 'Oriental Mindoro PPO',
          unit: 'Oriental Mindoro PPO',
          sub_unit: 'Calapan CPS - Investigation Unit',
          is_active: true,
          created_at: '2024-01-20T11:45:00Z',
          updated_at: '2024-01-20T11:45:00Z'
        },
        {
          id: '5',
          rank: 'Police Officer II',
          full_name: 'Ana Marie Gonzales',
          email: 'am.gonzales@pnp.gov.ph',
          contact_number: '+63 917 765 4321',
          region: 'MIMAROPA',
          province: 'Palawan PPO',
          unit: 'Palawan PPO',
          sub_unit: 'Puerto Princesa CPS - Patrol Unit',
          is_active: true,
          created_at: '2024-02-15T16:30:00Z',
          updated_at: '2024-02-15T16:30:00Z'
        }
      ]

      setAdminUsers(mockAdminUsers)
      setPersonnelUsers(mockPersonnelUsers)
    } finally {
      setLoading(false)
    }
  }

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
    const matchesRole = filterRole === 'all' || user.role === filterRole
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && user.is_active) ||
                         (filterStatus === 'inactive' && !user.is_active)
    return matchesSearch && matchesRole && matchesStatus
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
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
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

      // Update local state
      if (userType === 'admin') {
        setAdminUsers(prev => prev.map(user => 
          user.id === userId ? { ...user, is_active: !user.is_active } : user
        ))
      } else {
        setPersonnelUsers(prev => prev.map(user => 
          user.id === userId ? { ...user, is_active: !user.is_active } : user
        ))
      }
      
      toast.success('User status updated successfully')
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
      const force = !user.is_active // Force permanent deletion for inactive users
      const response = await fetch(`/api/users?id=${userId}&type=${userType}&force=${force}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete user')
      }

      const result = await response.json()

      // Update local state based on the operation type
      if (result.type === 'permanent') {
        // Remove user from local state (permanent deletion)
        if (userType === 'admin') {
          setAdminUsers(prev => prev.filter(user => user.id !== userId))
        } else {
          setPersonnelUsers(prev => prev.filter(user => user.id !== userId))
        }
        toast.success(`${user.full_name} has been permanently deleted`)
      } else if (result.type === 'deactivated') {
        // Update user status in local state (soft delete)
        if (userType === 'admin') {
          setAdminUsers(prev => prev.map(user => 
            user.id === userId ? { ...user, is_active: false } : user
          ))
        } else {
          setPersonnelUsers(prev => prev.map(user => 
            user.id === userId ? { ...user, is_active: false } : user
          ))
        }
        toast.success(`${user.full_name} has been deactivated`)
      }
      
    } catch (error) {
      toast.error('Failed to delete user')
      console.error('Error deleting user:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
          <p className="text-gray-600 mt-1">View and manage all admin accounts and personnel</p>
        </div>
        <Button onClick={loadUsers} variant="outline" className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </Button>
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
    </div>
  )
}
