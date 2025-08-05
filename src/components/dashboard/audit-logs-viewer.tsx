'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { RefreshCw, Activity } from 'lucide-react'

interface AuditEntry {
  id: string
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [realTimeStatus, setRealTimeStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [usePolling, setUsePolling] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filters, setFilters] = useState({
    table: 'all',
    operation: 'all',
    userId: '',
    page: 1
  })

  // Helper function to format audit data
  const formatAuditData = (log: AuditEntry): string => {
    if (!log.new_data) return 'No data available'
    
    const data = log.new_data
    const relevantFields = ['name', 'email', 'role', 'username', 'first_name', 'last_name', 'title']
    
    const displayData = relevantFields
      .filter(field => data[field])
      .map(field => `${field}: ${data[field]}`)
      .join(', ')
    
    return displayData || 'Data updated'
  }

  const fetchAuditLogs = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    setError(null)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Authentication required')
      }

      const params = new URLSearchParams({
        page: filters.page.toString(),
        limit: '25',
        // Add cache-busting parameter
        _t: Date.now().toString()
      })

      if (filters.table && filters.table !== 'all') params.append('table', filters.table)
      if (filters.operation && filters.operation !== 'all') params.append('operation', filters.operation)
      if (filters.userId) params.append('userId', filters.userId)

      const response = await fetch(`/api/audit?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      setAuditLogs(result.data || [])
      
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch audit logs'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [filters.page, filters.table, filters.operation, filters.userId])

  const fetchStats = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/audit?_t=${Date.now()}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
        body: JSON.stringify({ action: 'stats' })
      })

      if (response.ok) {
        const result = await response.json()
        setStats(result)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }, [])

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

  const loadAuditData = useCallback(async (showLoading = true) => {
    await Promise.all([
      fetchAuditLogs(showLoading),
      fetchStats()
    ])
  }, [fetchAuditLogs, fetchStats])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await loadAuditData(false)
      toast.success('Audit logs refreshed')
    } catch (error) {
      toast.error('Failed to refresh audit logs')
    } finally {
      setRefreshing(false)
    }
  }

  // Load data when component mounts
  useEffect(() => {
    loadAuditData(true)
  }, []) // Remove function dependencies to prevent infinite loop

  // Separate effect for filter changes
  useEffect(() => {
    fetchAuditLogs(true)
  }, [fetchAuditLogs])

  // Real-time subscription for audit logs
  useEffect(() => {
    let channel: any = null;
    
    const setupRealTime = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          console.log('No session available for real-time subscription')
          setRealTimeStatus('disconnected')
          setUsePolling(true) // Use polling instead
          return
        }

        // For now, skip real-time and use polling due to schema issues
        console.log('Skipping real-time due to schema binding issues, using polling instead')
        setRealTimeStatus('disconnected')
        setUsePolling(true)
        return

        // TODO: Re-enable when real-time is properly configured
        /* 
        // Test if we can query the audit_logs table first
        console.log('Testing audit_logs table access...')
        const { data: testQuery, error: testError } = await supabase
          .from('audit_logs')
          .select('id')
          .limit(1)
          .maybeSingle()

        if (testError) {
          console.error('Cannot access audit_logs table:', testError)
          setRealTimeStatus('disconnected')
          setUsePolling(true)
          return
        }

        console.log('audit_logs table accessible, setting up real-time...')

        // Check if real-time is available by testing the connection
        channel = supabase
          .channel(`audit-logs-realtime-${Date.now()}`) // Unique channel name
          .on(
            'postgres_changes',
            {
              event: 'INSERT', // Only listen to INSERT events initially
              schema: 'public',
              table: 'audit_logs',
              filter: undefined // Remove any filters to avoid binding issues
            },
            (payload) => {
              console.log('Real-time audit log insert:', payload)
              
              try {
                if (payload.eventType === 'INSERT' && payload.new) {
                  // Validate the payload structure before using it
                  const newEntry = payload.new as any
                  if (newEntry.id && newEntry.changed_at && newEntry.table_name && newEntry.operation) {
                    // Add new audit log to the beginning of the list
                    setAuditLogs(prevLogs => [newEntry as AuditEntry, ...prevLogs])
                    
                    // Update stats
                    fetchStats()
                    
                    // Show notification for new audit entry
                    toast.info(`New ${newEntry.operation}: ${newEntry.table_name}`)
                  } else {
                    console.warn('Invalid audit log payload structure:', newEntry)
                  }
                }
              } catch (payloadError) {
                console.error('Error processing real-time payload:', payloadError)
              }
            }
          )
          .subscribe((status, err) => {
            console.log('Real-time subscription status:', status)
            if (err) {
              console.error('Real-time subscription error:', err)
            }
            
            if (status === 'SUBSCRIBED') {
              console.log('Successfully subscribed to audit logs real-time updates')
              setRealTimeStatus('connected')
            } else if (status === 'CHANNEL_ERROR') {
              console.error('Error subscribing to audit logs real-time updates')
              setRealTimeStatus('disconnected')
              setUsePolling(true) // Enable polling fallback
              // Real-time not available, but that's ok - manual refresh still works
              toast.warning('Real-time updates unavailable. Using periodic refresh instead.')
            } else if (status === 'TIMED_OUT') {
              console.error('Real-time subscription timed out')
              setRealTimeStatus('disconnected')
              setUsePolling(true) // Enable polling fallback
            } else if (status === 'CLOSED') {
              console.log('Real-time subscription closed')
              setRealTimeStatus('disconnected')
            }
          })
        */
      } catch (error) {
        console.error('Failed to setup real-time subscription:', error)
        setRealTimeStatus('disconnected')
        setUsePolling(true) // Enable polling fallback
        // Don't show error toast - real-time is optional, manual refresh still works
        console.log('Real-time updates not available, falling back to periodic refresh')
      }
    }

    setupRealTime()

    // Cleanup subscription on component unmount
    return () => {
      if (channel) {
        console.log('Unsubscribing from audit logs real-time updates')
        try {
          supabase.removeChannel(channel)
        } catch (cleanupError) {
          console.error('Error cleaning up real-time subscription:', cleanupError)
        }
      }
    }
  }, []) // Empty dependency array - only run once

  // Auto-refresh polling when real-time is not available
  useEffect(() => {
    if (!usePolling || !autoRefresh) return

    console.log('Starting auto-refresh polling for audit logs (30 seconds)')
    const pollInterval = setInterval(() => {
      console.log('Auto-refreshing audit logs...')
      loadAuditData(false) // Don't show loading spinner for auto-refresh
    }, 30000) // Poll every 30 seconds

    return () => {
      console.log('Stopping auto-refresh polling')
      clearInterval(pollInterval)
    }
  }, [usePolling, autoRefresh, loadAuditData])

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }))
  }

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
          <Button 
            onClick={handleRefresh} 
            variant="outline"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Retrying...' : 'Retry'}
          </Button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
          <Button 
            onClick={handleRefresh} 
            className="mt-2" 
            variant="outline" 
            size="sm"
            disabled={refreshing}
          >
            {refreshing ? 'Retrying...' : 'Try Again'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold">Audit Logs</h2>
          {/* Real-time status indicator */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              realTimeStatus === 'connected' ? 'bg-green-500' : 
              realTimeStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
              usePolling && autoRefresh ? 'bg-blue-500 animate-pulse' :
              'bg-red-500'
            }`}></div>
            <span className="text-sm text-gray-600">
              {realTimeStatus === 'connected' ? 'Live' : 
               realTimeStatus === 'connecting' ? 'Connecting...' : 
               usePolling && autoRefresh ? 'Auto-refresh (30s)' :
               usePolling ? 'Auto-refresh off' :
               'Manual only'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Auto-refresh toggle */}
          {usePolling && (
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
            >
              <Activity className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
              Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
            </Button>
          )}
          
          {/* Manual refresh button */}
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center">
              <Activity className="h-5 w-5 text-blue-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Total Entries</p>
                <p className="text-2xl font-bold">{stats.totalAuditEntries}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center">
              <Activity className="h-5 w-5 text-green-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Recent Activity (24h)</p>
                <p className="text-2xl font-bold">{stats.recentActivity}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center">
              <Activity className="h-5 w-5 text-purple-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Active Tables</p>
                <p className="text-2xl font-bold">{stats.tableActivity?.length || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select value={filters.table} onValueChange={(value) => handleFilterChange('table', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select table" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tables</SelectItem>
              <SelectItem value="users">Users</SelectItem>
              <SelectItem value="personnel">Personnel</SelectItem>
              <SelectItem value="locations">Locations</SelectItem>
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

          <Input
            placeholder="User ID"
            value={filters.userId}
            onChange={(e) => handleFilterChange('userId', e.target.value)}
          />

          <Button 
            onClick={() => setFilters({ table: 'all', operation: 'all', userId: '', page: 1 })}
            variant="outline"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Recent Activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Table
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Operation
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Changes
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                auditLogs.map((log, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(log.changed_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="font-medium">{log.table_name}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {getOperationBadge(log.operation)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {formatAuditData(log)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.changed_by || 'System'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Button
          onClick={() => handleFilterChange('page', (filters.page - 1).toString())}
          disabled={filters.page <= 1}
          variant="outline"
        >
          Previous
        </Button>
        
        <span className="text-sm text-gray-600">
          Page {filters.page}
        </span>
        
        <Button
          onClick={() => handleFilterChange('page', (filters.page + 1).toString())}
          disabled={auditLogs.length < 25}
          variant="outline"
        >
          Next
        </Button>
      </div>
    </div>
  )
}
