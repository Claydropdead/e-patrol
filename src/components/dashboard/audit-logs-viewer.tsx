'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { RefreshCw, Search, Shield, Activity, Trash2, BarChart3 } from 'lucide-react'

interface AuditEntry {
  event_time: string
  table_name: string
  operation: string
  event_description: string
  performed_by: string
}

interface AuditStats {
  totalAuditEntries: number
  recentActivity: number
  tableActivity: any[]
}

export function AuditLogsViewer() {
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([])
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    table: '',
    operation: '',
    userId: '',
    page: 1
  })

  const supabase = createClient()

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
        limit: '50'
      })

      if (filters.table) params.append('table', filters.table)
      if (filters.operation) params.append('operation', filters.operation)
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

      setAuditLogs(result.data)
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

  const cleanupOldLogs = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Authentication required')
        return
      }

      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'cleanup' })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to cleanup logs')
      }

      toast.success(result.message)
      fetchStats() // Refresh stats
    } catch (error) {
      console.error('Error cleaning up logs:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to cleanup logs')
    }
  }

  const getOperationBadge = (operation: string) => {
    switch (operation) {
      case 'INSERT':
        return <Badge className="bg-green-100 text-green-800">Created</Badge>
      case 'UPDATE':
        return <Badge className="bg-blue-100 text-blue-800">Updated</Badge>
      case 'DELETE':
        return <Badge className="bg-red-100 text-red-800">Deleted</Badge>
      default:
        return <Badge variant="secondary">{operation}</Badge>
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  useEffect(() => {
    fetchAuditLogs()
    fetchStats()
  }, [filters])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600 mt-1">Monitor all system activities and changes</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={cleanupOldLogs} variant="outline" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Cleanup Old Logs
          </Button>
          <Button onClick={fetchAuditLogs} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Audit Entries</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalAuditEntries}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Recent Activity (7 days)</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.recentActivity}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Shield className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Monitoring Status</p>
                  <p className="text-lg font-semibold text-green-600">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="table-filter">Table</Label>
              <Select value={filters.table} onValueChange={(value) => setFilters({...filters, table: value, page: 1})}>
                <SelectTrigger>
                  <SelectValue placeholder="All tables" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All tables</SelectItem>
                  <SelectItem value="admin_accounts">Admin Accounts</SelectItem>
                  <SelectItem value="personnel">Personnel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="operation-filter">Operation</Label>
              <Select value={filters.operation} onValueChange={(value) => setFilters({...filters, operation: value, page: 1})}>
                <SelectTrigger>
                  <SelectValue placeholder="All operations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All operations</SelectItem>
                  <SelectItem value="INSERT">Create</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="user-filter">User ID</Label>
              <Input
                id="user-filter"
                placeholder="Filter by user ID"
                value={filters.userId}
                onChange={(e) => setFilters({...filters, userId: e.target.value, page: 1})}
              />
            </div>

            <div className="flex items-end">
              <Button onClick={fetchAuditLogs} className="w-full">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
          <CardDescription>
            All system modifications are logged and monitored for security
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading audit logs...</span>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No audit logs found matching your filters
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium text-gray-600">Time</th>
                    <th className="text-left p-3 font-medium text-gray-600">Table</th>
                    <th className="text-left p-3 font-medium text-gray-600">Operation</th>
                    <th className="text-left p-3 font-medium text-gray-600">Description</th>
                    <th className="text-left p-3 font-medium text-gray-600">Performed By</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-gray-600 font-mono text-xs">
                        {formatDateTime(log.event_time)}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">{log.table_name}</Badge>
                      </td>
                      <td className="p-3">
                        {getOperationBadge(log.operation)}
                      </td>
                      <td className="p-3 text-gray-900">
                        {log.event_description}
                      </td>
                      <td className="p-3 text-gray-600">
                        {log.performed_by}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
