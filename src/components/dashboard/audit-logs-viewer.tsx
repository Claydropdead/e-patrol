'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useApiData } from '@/lib/hooks/useApiData'
import { useAuthStore } from '@/lib/stores/auth'
import { toast } from 'sonner'
import { RefreshCw, Activity, Calendar, Database, User, Filter, X } from 'lucide-react'

interface AuditEntry {
  id: string
  changed_at: string
  table_name: string
  operation: string
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  changed_by: string | null
  changed_by_name?: string | null
}

interface AuditStats {
  totalAuditEntries: number
  recentActivity: number
  tableActivity: Array<{
    table_name: string
    count: number
  }>
}

interface AuditResponse {
  data: AuditEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface StatsResponse {
  totalAuditEntries: number
  recentActivity: number
  tableActivity: Array<{
    table_name: string
    count: number
  }>
}

export function AuditLogsViewer() {
  const [filters, setFilters] = useState({
    table: 'all',
    operation: 'all',
    userId: '',
    page: 1
  })
  const [refreshing, setRefreshing] = useState(false)

  // Use stable API hook for audit logs
  const {
    data: auditResponse,
    loading,
    error,
    refresh
  } = useApiData<AuditResponse>({
    endpoint: '/api/audit',
    params: {
      page: filters.page.toString(),
      limit: '25',
      ...(filters.table !== 'all' && { table: filters.table }),
      ...(filters.operation !== 'all' && { operation: filters.operation }),
      ...(filters.userId && { userId: filters.userId })
    },
    onError: (errorMsg) => toast.error(`Audit logs error: ${errorMsg}`)
  })

  // Separate hook for stats
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // Fetch stats function
  const fetchStats = async () => {
    try {
      const session = await useAuthStore.getState().getValidSession()
      if (!session) return

      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'stats' })
      })

      if (response.ok) {
        const result = await response.json()
        setStats(result)
      }
    } catch (error) {
      console.warn('Failed to fetch stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  const auditLogs = auditResponse?.data || []
  const pagination = auditResponse?.pagination

  // Helper function to get user-friendly table names
  const getTableDisplayName = (tableName: string): string => {
    const tableNames: Record<string, string> = {
      'users': 'User Accounts',
      'personnel': 'Personnel Records',
      'admin_accounts': 'Administrator Accounts',
      'locations': 'Location Data',
      'assignment_history': 'Assignment History',
      'audit_logs': 'System Audit',
      'geofences': 'Geofence Areas',
      'live_locations': 'Live Tracking'
    }
    return tableNames[tableName] || 'System Data'
  }

  // Helper function to format audit data changes
  const formatAuditChanges = (log: AuditEntry): { old: string; new: string } => {
    const relevantFields = ['name', 'email', 'role', 'username', 'first_name', 'last_name', 'title', 'full_name', 'rank', 'badge_number', 'phone', 'is_active']
    
    const formatData = (data: Record<string, unknown> | null): string => {
      if (!data) return 'No data'
      
      const displayData = relevantFields
        .filter(field => data[field] !== undefined && data[field] !== null)
        .map(field => `${field}: ${data[field]}`)
        .join(', ')
      
      return displayData || 'System data updated'
    }

    return {
      old: formatData(log.old_data),
      new: formatData(log.new_data)
    }
  }

  // Operation badge styling
  const getOperationBadge = (operation: string) => {
    const styles = {
      INSERT: 'bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full',
      UPDATE: 'bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full',
      DELETE: 'bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full'
    }
    const labels = { INSERT: 'Created', UPDATE: 'Updated', DELETE: 'Deleted' }
    
    return (
      <span className={styles[operation as keyof typeof styles] || 'bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full'}>
        {labels[operation as keyof typeof labels] || operation}
      </span>
    )
  }

  // Manual refresh handler
  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      refresh()
      fetchStats()
      toast.success('Audit logs refreshed')
    } catch (err) {
      toast.error('Failed to refresh audit logs')
    } finally {
      setRefreshing(false)
    }
  }

  // Filter change handler
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }))
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({ table: 'all', operation: 'all', userId: '', page: 1 })
  }

  // Refetch when filters change
  useEffect(() => {
    refresh()
  }, [filters, refresh])

  // Fetch stats on mount
  useEffect(() => {
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Audit Logs</h2>
        </div>
        <div className="bg-white rounded-lg border p-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <p className="text-center mt-4 text-gray-600">Loading audit logs...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Audit Logs</h2>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
          <Button onClick={handleRefresh} className="mt-2" variant="outline" size="sm">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center">
          <Database className="h-6 w-6 mr-2 text-blue-600" />
          Audit Logs
        </h2>
        <Button 
          onClick={handleRefresh} 
          variant="outline"
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex items-center">
              <Database className="h-5 w-5 text-blue-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Total Entries</p>
                <p className="text-2xl font-bold">{stats.totalAuditEntries}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex items-center">
              <Activity className="h-5 w-5 text-green-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Recent Activity (24h)</p>
                <p className="text-2xl font-bold">{stats.recentActivity}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-purple-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Active Tables</p>
                <p className="text-2xl font-bold">{stats.tableActivity?.length || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Filter className="h-5 w-5 mr-2 text-gray-600" />
            Filters
          </h3>
          {(filters.table !== 'all' || filters.operation !== 'all' || filters.userId) && (
            <Button onClick={clearFilters} variant="outline" size="sm">
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select value={filters.table} onValueChange={(value) => handleFilterChange('table', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              <SelectItem value="users">User Accounts</SelectItem>
              <SelectItem value="personnel">Personnel Records</SelectItem>
              <SelectItem value="admin_accounts">Administrator Accounts</SelectItem>
              <SelectItem value="locations">Location Data</SelectItem>
              <SelectItem value="assignment_history">Assignment History</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.operation} onValueChange={(value) => handleFilterChange('operation', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select operation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Operations</SelectItem>
              <SelectItem value="INSERT">Created</SelectItem>
              <SelectItem value="UPDATE">Updated</SelectItem>
              <SelectItem value="DELETE">Deleted</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Filter by User ID"
              value={filters.userId}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Page {filters.page}</span>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold flex items-center">
            <Activity className="h-5 w-5 mr-2 text-blue-600" />
            Recent Activity
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Module
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Operation
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Old Data
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  New Data
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Changed By
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    <Database className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    No audit logs found with current filters
                  </td>
                </tr>
              ) : (
                auditLogs.map((log, index) => {
                  const changes = formatAuditChanges(log)
                  return (
                    <tr key={`${log.id}-${index}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(log.changed_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium bg-gray-100 px-2 py-1 rounded text-xs">
                          {getTableDisplayName(log.table_name)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {getOperationBadge(log.operation)}
                      </td>
                      <td className="px-4 py-4 text-sm max-w-xs">
                        <div className="truncate" title={changes.old}>
                          {log.operation === 'INSERT' ? (
                            <span className="text-gray-400 italic">New record</span>
                          ) : (
                            <span className="text-red-600 bg-red-50 px-2 py-1 rounded text-xs">
                              {changes.old}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm max-w-xs">
                        <div className="truncate" title={changes.new}>
                          {log.operation === 'DELETE' ? (
                            <span className="text-gray-400 italic">Record deleted</span>
                          ) : (
                            <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs">
                              {changes.new}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="flex items-center">
                          <User className="h-4 w-4 mr-1 text-gray-400" />
                          {log.changed_by_name || log.changed_by || 'System'}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between bg-white px-4 py-3 border rounded-lg">
        <Button
          onClick={() => handleFilterChange('page', (filters.page - 1).toString())}
          disabled={filters.page <= 1}
          variant="outline"
          size="sm"
        >
          Previous
        </Button>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            Page {filters.page} {pagination && `of ${pagination.totalPages}`}
          </span>
          <span className="text-xs text-gray-400">
            ({auditLogs.length} entries{pagination && ` / ${pagination.total} total`})
          </span>
        </div>
        
        <Button
          onClick={() => handleFilterChange('page', (filters.page + 1).toString())}
          disabled={!pagination || auditLogs.length < pagination.limit}
          variant="outline"
          size="sm"
        >
          Next
        </Button>
      </div>
    </div>
  )
}
