'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { RefreshCw, Activity } from 'lucide-react'

interface AuditEntry {
  changed_at: string
  table_name: string
  operation: string
  new_data: Record<string, unknown> | null
  changed_by: string | null
}

interface AuditStats {
  totalAuditEntries: number
  recentActivity: number
  tableActivity: Array<{
    table_name: string
    count: number
  }>
}

export function AuditLogsViewer() {
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([])
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    table: 'all',
    operation: 'all',
    userId: '',
    page: 1
  })

  const supabase = createClient()

  // Helper function to format audit data in user-friendly way
  const formatAuditData = (log: AuditEntry): string => {
    if (!log.new_data) {
      // For DELETE operations, we might not have new_data but could show table info
      if (log.operation === 'DELETE') {
        return `Deleted record from ${log.table_name.replace('_', ' ')}`
      }
      return 'No details available'
    }
    
    try {
      const data = log.new_data
      
      if (log.table_name === 'admin_accounts') {
        const name = String(data.full_name || 'Unknown')
        const role = String(data.role || 'Unknown')
        const email = String(data.email || 'No email')
        const rank = String(data.rank || 'No rank')
        
        if (log.operation === 'INSERT') {
          return `Created admin: ${name} (${rank}) - ${role.toUpperCase()} role - ${email}`
        } else if (log.operation === 'UPDATE') {
          return `Updated admin: ${name} (${rank}) - Role: ${role.toUpperCase()}`
        } else if (log.operation === 'DELETE') {
          return `Deleted admin: ${name} (${rank})`
        }
      }
      
      if (log.table_name === 'personnel') {
        const name = String(data.full_name || 'Unknown')
        const rank = String(data.rank || 'No rank')
        const unit = String(data.sub_unit || data.unit || 'No unit')
        const province = String(data.province || 'No province')
        
        if (log.operation === 'INSERT') {
          return `Created personnel: ${name} (${rank}) - ${unit}, ${province}`
        } else if (log.operation === 'UPDATE') {
          return `Updated personnel: ${name} (${rank}) - ${unit}`
        } else if (log.operation === 'DELETE') {
          return `Deleted personnel: ${name} (${rank})`
        }
      }
      
      // Generic fallback for other tables
      const operation = log.operation.toLowerCase()
      const tableName = log.table_name.replace('_', ' ')
      return `${operation.charAt(0).toUpperCase() + operation.slice(1)} record in ${tableName}`
      
    } catch (error) {
      console.error('Error formatting audit data:', error)
      return `${log.operation.toLowerCase()} operation on ${log.table_name.replace('_', ' ')}`
    }
  }

  // Helper function to format the "changed_by" field
  const formatChangedBy = (changedBy: string | null): string => {
    // Handle null or undefined values
    if (!changedBy) {
      return 'System'
    }
    
    // If it looks like an email, show it as-is
    if (changedBy.includes('@')) {
      return changedBy
    }
    
    // If it looks like a UUID, show a friendlier message
    if (changedBy.length === 36 && changedBy.includes('-')) {
      return 'System Admin'
    }
    
    return changedBy
  }

  const fetchAuditLogs = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Authentication required')
        return
      }

      const params = new URLSearchParams({
        page: filters.page.toString(),
        limit: '25' // Reduced limit for faster loading
      })

      if (filters.table && filters.table !== 'all') params.append('table', filters.table)
      if (filters.operation && filters.operation !== 'all') params.append('operation', filters.operation)
      if (filters.userId) params.append('userId', filters.userId)

      const response = await fetch(`/api/audit?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch audit logs')
      }

      setAuditLogs(result.data || [])
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to fetch audit logs')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'stats' })
      })

      const result = await response.json()

      if (response.ok) {
        setStats(result)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

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

  useEffect(() => {
    fetchAuditLogs()
  }, [filters.page, filters.table, filters.operation, filters.userId])

  // Initial load only
  useEffect(() => {
    fetchStats()
  }, [])

  return (
    <div className="space-y-4">
      {/* Simplified Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-600">System activity monitoring</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={fetchAuditLogs} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Compact Statistics */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 p-3 rounded-lg border">
            <p className="text-xs text-blue-600 font-medium">Total Entries</p>
            <p className="text-lg font-bold text-blue-900">{stats.totalAuditEntries}</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg border">
            <p className="text-xs text-green-600 font-medium">Recent Activity</p>
            <p className="text-lg font-bold text-green-900">{stats.recentActivity}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg border">
            <p className="text-xs text-gray-600 font-medium">Tables Monitored</p>
            <p className="text-lg font-bold text-gray-900">{stats.tableActivity?.length || 0}</p>
          </div>
        </div>
      )}

      {/* Compact Filters */}
      <div className="bg-white border rounded-lg p-3">
        <div className="grid grid-cols-3 gap-3">
          <Select value={filters.table} onValueChange={(value) => setFilters({...filters, table: value, page: 1})}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All tables" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tables</SelectItem>
              <SelectItem value="admin_accounts">Admin Accounts</SelectItem>
              <SelectItem value="personnel">Personnel Records</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.operation} onValueChange={(value) => setFilters({...filters, operation: value, page: 1})}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All operations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All operations</SelectItem>
              <SelectItem value="INSERT">Create</SelectItem>
              <SelectItem value="UPDATE">Update</SelectItem>
              <SelectItem value="DELETE">Delete</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Search by user email..."
            value={filters.userId}
            onChange={(e) => setFilters({...filters, userId: e.target.value, page: 1})}
            className="h-9"
          />
        </div>
      </div>

      {/* Streamlined Table */}
      <div className="bg-white border rounded-lg">
        <div className="p-3 border-b bg-gray-50">
          <h3 className="text-sm font-medium text-gray-900">Activity Log</h3>
        </div>
        <div className="overflow-hidden">
          {loading ? (
            // Improved loading skeleton
            <div className="divide-y divide-gray-100">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="p-3 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center space-x-2">
                        <div className="h-3 bg-gray-200 rounded w-20"></div>
                        <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                      </div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    </div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No logs found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {auditLogs.map((log, index) => (
                <div key={index} className="p-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-xs font-medium text-gray-900 capitalize">
                          {log.table_name.replace('_', ' ')}
                        </span>
                        {getOperationBadge(log.operation)}
                        <span className="text-xs text-gray-500">
                          {new Date(log.changed_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900">
                        {formatAuditData(log)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">by {formatChangedBy(log.changed_by)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Simple Pagination */}
        {auditLogs.length > 0 && (
          <div className="p-3 border-t bg-gray-50 flex items-center justify-between">
            <p className="text-xs text-gray-600">
              Page {filters.page} • {auditLogs.length} entries
            </p>
            <div className="flex space-x-1">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setFilters({...filters, page: Math.max(1, filters.page - 1)})}
                disabled={filters.page <= 1}
                className="h-7 px-2 text-xs"
              >
                Previous
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setFilters({...filters, page: filters.page + 1})}
                disabled={auditLogs.length < 25}
                className="h-7 px-2 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
