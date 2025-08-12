'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthStore } from '@/lib/stores/auth'
import { toast } from 'sonner'
import { RefreshCw, Activity, Calendar, Database, User, Filter, X, ChevronDown, ChevronUp, Eye } from 'lucide-react'

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
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  // Direct state management instead of useApiData
  const [auditResponse, setAuditResponse] = useState<AuditResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch audit logs function with server-side filtering and pagination
  const fetchAuditLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const session = await useAuthStore.getState().getValidSession()
      if (!session) {
        throw new Error('Authentication required')
      }

      // Build query parameters for server-side filtering
      const params = new URLSearchParams({
        page: filters.page.toString(),
        limit: '25', // Reasonable page size
        ...(filters.table !== 'all' && { table: filters.table }),
        ...(filters.operation !== 'all' && { operation: filters.operation }),
        ...(filters.userId && { userId: filters.userId })
      })

      const response = await fetch(`/api/audit?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Cache-Control': 'no-cache'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      if (result.error) {
        throw new Error(result.error)
      }

      setAuditResponse(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch audit logs'
      setError(errorMessage)
      toast.error(`Audit logs error: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }, [filters])

  // Initial fetch with debounced filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAuditLogs()
    }, 300) // 300ms debounce for filter changes

    return () => clearTimeout(timer)
  }, [fetchAuditLogs])

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchAuditLogs()
  }, [fetchAuditLogs])

  // Memoized audit logs (already filtered by server)
  const auditLogs = useMemo(() => auditResponse?.data || [], [auditResponse?.data])
  
  // Server-side filtering means we don't need client-side filtering anymore
  const paginatedLogs = auditLogs // Already paginated by server
  
  // Get pagination from server response
  const pagination = useMemo(() => 
    auditResponse?.pagination || {
      page: 1,
      limit: 25,
      total: 0,
      totalPages: 1
    }, [auditResponse?.pagination]
  )

  // Separate hook for stats
  const [stats, setStats] = useState<StatsResponse | null>(null)

  // Fetch stats function
  const fetchStats = useCallback(async () => {
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
    }
  }, [])

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
    const fieldLabels: Record<string, string> = {
      'name': 'Name',
      'email': 'Email Address',
      'role': 'Role',
      'username': 'Username',
      'first_name': 'First Name',
      'last_name': 'Last Name',
      'title': 'Job Title',
      'full_name': 'Full Name',
      'rank': 'Rank',
      'badge_number': 'Badge Number',
      'phone': 'Phone Number',
      'is_active': 'Status',
      'province': 'Province',
      'unit': 'Unit',
      'sub_unit': 'Sub Unit',
      'contact_number': 'Contact Number',
      'created_at': 'Created Date',
      'updated_at': 'Updated Date'
    }
    
    const formatData = (data: Record<string, unknown> | null): string => {
      if (!data) return 'No data available'
      
      // Prioritize readable fields over UUIDs
      const priorityFields = ['personnel_name', 'beat_name', 'old_personnel_name', 'new_personnel_name', 'replacement_reason', 'full_name', 'email', 'role']
      const otherFields = Object.keys(data).filter(field => 
        data[field] !== undefined && 
        data[field] !== null && 
        !['id', 'password', 'created_at', 'updated_at', 'personnel_id', 'beat_id', 'old_personnel_id', 'new_personnel_id'].includes(field) &&
        !priorityFields.includes(field)
      )
      
      const relevantFields = [
        ...priorityFields.filter(field => data[field] !== undefined && data[field] !== null),
        ...otherFields
      ]
      
      if (relevantFields.length === 0) return 'No changes detected'
      
      const displayData = relevantFields
        .slice(0, 3) // Show only first 3 fields to keep it clean
        .map(field => {
          const label = fieldLabels[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          let value = data[field]
          
          // Format boolean values
          if (typeof value === 'boolean') {
            value = value ? 'Active' : 'Inactive'
          }
          
          // Truncate long values
          if (typeof value === 'string' && value.length > 30) {
            value = value.substring(0, 30) + '...'
          }
          
          return `${label}: ${value}`
        })
        .join(', ')
      
      const remainingCount = relevantFields.length - 3
      return remainingCount > 0 ? `${displayData} (+${remainingCount} more)` : displayData
    }

    return {
      old: formatData(log.old_data),
      new: formatData(log.new_data)
    }
  }

  // Helper function to format clean data for expanded view (non-JSON)
  const formatCleanData = (data: Record<string, unknown> | null): React.ReactNode => {
    if (!data) return null

    const fieldLabels: Record<string, string> = {
      'name': 'Name',
      'email': 'Email Address', 
      'role': 'Role',
      'username': 'Username',
      'first_name': 'First Name',
      'last_name': 'Last Name',
      'title': 'Job Title',
      'full_name': 'Full Name',
      'rank': 'Rank',
      'badge_number': 'Badge Number',
      'phone': 'Phone Number',
      'is_active': 'Status',
      'province': 'Province',
      'unit': 'Unit',
      'sub_unit': 'Sub Unit',
      'contact_number': 'Contact Number',
      'center_lat': 'Center Latitude',
      'center_lng': 'Center Longitude',
      'radius_meters': 'Radius (meters)',
      'address': 'Address',
      'assigned_personnel': 'Assigned Personnel',
      'beat_id': 'Beat ID',
      'personnel_id': 'Personnel ID', 
      'old_personnel_id': 'Old Personnel ID',
      'new_personnel_id': 'New Personnel ID',
      'replacement_reason': 'Replacement Reason',
      'replaced_at': 'Replaced At',
      'personnel_name': 'Personnel',
      'beat_name': 'Beat',
      'old_personnel_name': 'Old Personnel',
      'new_personnel_name': 'New Personnel'
    }

    const relevantFields = Object.keys(data).filter(field => 
      data[field] !== undefined && 
      data[field] !== null && 
      !['id', 'password', 'created_at', 'updated_at', 'created_by', 'personnel_id', 'beat_id', 'old_personnel_id', 'new_personnel_id'].includes(field)
    )

    if (relevantFields.length === 0) return <span className="text-gray-500 italic">No relevant data to display</span>

    return (
      <div className="space-y-2">
        {relevantFields.map(field => {
          const label = fieldLabels[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          let value = data[field]
          
          // Handle UUID fields - show them as they are since we can't easily resolve them in the client
          if (typeof value === 'string' && value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            // For personnel and beat IDs, show a shortened version
            if (field.includes('personnel_id') || field.includes('beat_id')) {
              value = `${value.substring(0, 8)}...`
            }
          }
          
          // Handle assigned personnel array
          if (field === 'assigned_personnel' && Array.isArray(value)) {
            if (value.length === 0) {
              value = 'No personnel assigned'
            } else {
              return (
                <div key={field} className="space-y-1">
                  <span className="font-medium text-gray-700">{label}:</span>
                  <div className="ml-4 space-y-1">
                    {value.map((person: { full_name?: string; rank?: string; email?: string; acceptance_status?: string }, index: number) => (
                      <div key={index} className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                        <div><strong>{String(person.full_name || 'Unknown')}</strong> ({String(person.rank || 'N/A')})</div>
                        {person.email && <div className="text-gray-600">Email: {String(person.email)}</div>}
                        <div className="text-gray-600">Status: {String(person.acceptance_status || 'Unknown')}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }
          }
          
          // Format boolean values
          if (typeof value === 'boolean') {
            value = value ? 'Active' : 'Inactive'
          }
          
          return (
            <div key={field} className="flex justify-between items-start">
              <span className="font-medium text-gray-700 min-w-0 flex-shrink-0 mr-3">{label}:</span>
              <span className="text-gray-900 text-right break-words">{String(value)}</span>
            </div>
          )
        })}
      </div>
    )
  }

  // Operation badge styling
  const getOperationBadge = (operation: string) => {
    const styles = {
      INSERT: 'bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-medium shadow-sm border border-green-200',
      UPDATE: 'bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-medium shadow-sm border border-blue-200',
      DELETE: 'bg-red-100 text-red-800 text-xs px-3 py-1 rounded-full font-medium shadow-sm border border-red-200'
    }
    const labels = { INSERT: '✅ Created', UPDATE: '📝 Updated', DELETE: '🗑️ Deleted' }
    
    return (
      <span className={styles[operation as keyof typeof styles] || 'bg-gray-100 text-gray-800 text-xs px-3 py-1 rounded-full font-medium shadow-sm border border-gray-200'}>
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
    } catch {
      toast.error('Failed to refresh audit logs')
    } finally {
      setRefreshing(false)
    }
  }

  // Filter change handler
  const handleFilterChange = (key: string, value: string) => {
    if (key === 'page') {
      // For page changes, don't reset to page 1
      setFilters(prev => ({ ...prev, [key]: parseInt(value) }))
    } else {
      // For other filter changes, reset to page 1
      setFilters(prev => ({ ...prev, [key]: value, page: 1 }))
    }
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({ table: 'all', operation: 'all', userId: '', page: 1 })
  }

  // Fetch stats on mount
  useEffect(() => {
    fetchStats()
  }, [fetchStats])

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
    <>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
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

      {/* Simple Audit Logs Table */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-4 py-3 border-b">
          <h3 className="text-lg font-semibold flex items-center">
            <Activity className="h-5 w-5 mr-2 text-blue-600" />
            Recent Activity
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-40">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">Module</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-36">Operation</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[200px]">Old Data</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[200px]">New Data</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">Changed By</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log: AuditEntry, index: number) => {
                  const changes = formatAuditChanges(log)
                  const isExpanded = expandedRow === log.id
                  return (
                    <React.Fragment key={`audit-row-${log.id}-${index}`}>
                      <tr className="hover:bg-blue-50/50 transition-colors duration-200 border-l-4 border-transparent hover:border-blue-400">
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                            className="p-1 h-6 w-6 hover:bg-blue-100 transition-all duration-200"
                            title={isExpanded ? 'Collapse details' : 'Expand details'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-blue-600" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-500 hover:text-blue-600" />
                            )}
                          </Button>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(log.changed_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-medium shadow-sm">
                            {getTableDisplayName(log.table_name)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {getOperationBadge(log.operation)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 min-w-[200px] max-w-xs">
                          {log.operation === 'INSERT' ? (
                            <span className="text-gray-400 italic">New record</span>
                          ) : (
                            <div className="truncate">
                              {changes.old}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 min-w-[200px] max-w-xs">
                          {log.operation === 'DELETE' ? (
                            <span className="text-gray-400 italic">Record deleted</span>
                          ) : (
                            <div className="truncate">
                              {changes.new}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {log.changed_by_name || 'System'}
                        </td>
                      </tr>
                      
                      {/* Expanded Row Details */}
                      {isExpanded && (
                        <tr className="bg-gradient-to-r from-blue-50 to-indigo-50" style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                          <td colSpan={7} className="p-0">
                            <div className="px-6 py-6 w-full overflow-hidden">
                              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full min-w-0">
                                {/* Old Data Section */}
                                <div className="bg-white rounded-xl border border-red-100 p-5 shadow-sm hover:shadow-md transition-shadow min-w-0">
                                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                                    <div className="p-1 bg-red-100 rounded-lg mr-3 flex-shrink-0">
                                      <Database className="h-4 w-4 text-red-600" />
                                    </div>
                                    📋 Original Data
                                  </h4>
                                  <div className="bg-red-50 rounded-lg p-4 text-sm border border-red-100 min-h-[120px]">
                                    {log.operation === 'INSERT' ? (
                                      <div className="flex items-center text-gray-500 italic">
                                        <span className="text-2xl mr-2">➕</span>
                                        No previous data (new record created)
                                      </div>
                                    ) : log.old_data ? (
                                      <div className="bg-white p-4 rounded border max-h-80 overflow-auto">
                                        {formatCleanData(log.old_data)}
                                      </div>
                                    ) : (
                                      <span className="text-gray-500 italic flex items-center">
                                        <span className="text-2xl mr-2">❓</span>
                                        No data available
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* New Data Section */}
                                <div className="bg-white rounded-xl border border-green-100 p-5 shadow-sm hover:shadow-md transition-shadow min-w-0">
                                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                                    <div className="p-1 bg-green-100 rounded-lg mr-3 flex-shrink-0">
                                      <Database className="h-4 w-4 text-green-600" />
                                    </div>
                                    ✨ Updated Data
                                  </h4>
                                  <div className="bg-green-50 rounded-lg p-4 text-sm border border-green-100 min-h-[120px]">
                                    {log.operation === 'DELETE' ? (
                                      <div className="flex items-center text-gray-500 italic">
                                        <span className="text-2xl mr-2">🗑️</span>
                                        Record was permanently deleted
                                      </div>
                                    ) : log.new_data ? (
                                      <div className="bg-white p-4 rounded border max-h-80 overflow-auto">
                                        {formatCleanData(log.new_data)}
                                      </div>
                                    ) : (
                                      <span className="text-gray-500 italic flex items-center">
                                        <span className="text-2xl mr-2">❓</span>
                                        No data available
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Additional Details */}
                                <div className="bg-white rounded-xl border border-blue-100 p-5 xl:col-span-2 shadow-sm hover:shadow-md transition-shadow min-w-0">
                                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                                    <div className="p-1 bg-blue-100 rounded-lg mr-3 flex-shrink-0">
                                      <Eye className="h-4 w-4 text-blue-600" />
                                    </div>
                                    🔍 Audit Details
                                  </h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                    <div className="p-3 bg-gray-50 rounded-lg min-w-0">
                                      <span className="text-gray-500 text-xs uppercase tracking-wide">Table</span>
                                      <p className="font-semibold text-gray-900 mt-1 truncate" title={log.table_name}>{log.table_name}</p>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-lg min-w-0">
                                      <span className="text-gray-500 text-xs uppercase tracking-wide">Operation</span>
                                      <p className="font-semibold text-gray-900 mt-1">{log.operation}</p>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-lg min-w-0">
                                      <span className="text-gray-500 text-xs uppercase tracking-wide">Changed By</span>
                                      <p className="font-semibold text-gray-900 mt-1 truncate" title={log.changed_by_name || 'System'}>{log.changed_by_name || 'System'}</p>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-lg min-w-0">
                                      <span className="text-gray-500 text-xs uppercase tracking-wide">Timestamp</span>
                                      <p className="font-semibold text-gray-900 mt-1 text-xs break-words">{new Date(log.changed_at).toLocaleString()}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-6 py-4 border rounded-lg">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Page {filters.page} of {pagination.totalPages}
            </div>
            <div className="text-sm text-gray-600">
              Showing {((filters.page - 1) * pagination.limit) + 1} to {Math.min(filters.page * pagination.limit, pagination.total)} of {pagination.total} audit entries
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterChange('page', '1')}
              disabled={filters.page === 1}
              className="flex items-center space-x-1"
            >
              <span>First</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterChange('page', (filters.page - 1).toString())}
              disabled={filters.page <= 1}
              className="flex items-center space-x-1"
            >
              <span>Previous</span>
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNumber;
                
                if (pagination.totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (filters.page <= 3) {
                  pageNumber = i + 1;
                } else if (filters.page >= pagination.totalPages - 2) {
                  pageNumber = pagination.totalPages - 4 + i;
                } else {
                  pageNumber = filters.page - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNumber}
                    variant={filters.page === pageNumber ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFilterChange('page', pageNumber.toString())}
                    className="w-8 h-8 p-0"
                  >
                    {pageNumber}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterChange('page', (filters.page + 1).toString())}
              disabled={filters.page >= pagination.totalPages}
              className="flex items-center space-x-1"
            >
              <span>Next</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterChange('page', pagination.totalPages.toString())}
              disabled={filters.page === pagination.totalPages}
              className="flex items-center space-x-1"
            >
              <span>Last</span>
            </Button>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
