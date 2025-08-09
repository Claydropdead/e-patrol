'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { 
  Shield, 
  MapPin, 
  Plus, 
  Search,
  Edit,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  Timer,
  Activity,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Filter,
  X,
  AlertCircle,
  Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/lib/stores/auth'
import { MIMAROPA_STRUCTURE } from '@/lib/constants/mimaropa'
import { toast } from 'sonner'

interface GeofenceBeat {
  id: string
  name: string
  location: {
    lat: number
    lng: number
    address: string
  }
  radius: number // in meters
  province: string
  unit: string
  subUnit: string
  assignedPersonnel: string[]
  status: 'active' | 'inactive' | 'maintenance'
  createdAt: string
  violations: number
  lastActivity: string
  // New duty and acceptance fields
  dutyStartTime?: string
  dutyEndTime?: string
  beatStatus: 'pending' | 'on_duty' | 'completed'
  acceptanceTime?: string
  declineReason?: string
  // Personnel acceptance tracking
  personnelAcceptance?: {
    [personnelName: string]: {
      status: 'pending' | 'accepted' | 'declined'
      timestamp?: string
      reason?: string
    }
  }
}

interface Violation {
  id: string
  beatId: string
  beatName: string
  personnelName: string
  personnelId: string
  type: 'exit' // Only exit violations - when personnel leave the beat radius
  timestamp: string
  location: {
    lat: number
    lng: number
  }
  status: 'pending' | 'resolved' | 'ignored' | 'acknowledged'
  distanceFromCenter: number // Required - distance from beat center when violation occurred
  responseTime?: number
  resolvedAt?: string
  acknowledgedAt?: string
  notificationSent?: boolean
}

// Helper functions
const getBeatStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800'
    case 'on_duty': return 'bg-blue-100 text-blue-800'
    case 'completed': return 'bg-green-100 text-green-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getBeatStatusIcon = (status: string) => {
  switch (status) {
    case 'pending': return <Timer className="h-4 w-4" />
    case 'on_duty': return <Activity className="h-4 w-4" />
    case 'completed': return <CheckCircle className="h-4 w-4" />
    default: return <Clock className="h-4 w-4" />
  }
}

const formatDutyTime = (startTime?: string, endTime?: string) => {
  if (!startTime) return 'Not scheduled'
  
  // Special case for 24-hour duty
  if (startTime === '00:00' && endTime === '23:59') {
    return '24-Hour Duty'
  }
  
  // Enhanced time formatting function
  const formatTime = (timeStr: string) => {
    // Handle simple time format (HH:MM or H:MM)
    if (timeStr.includes(':') && !timeStr.includes(' ') && !timeStr.includes('T')) {
      const [hoursStr, minutesStr] = timeStr.split(':')
      const hour = parseInt(hoursStr, 10)
      const minutes = minutesStr.padStart(2, '0')
      
      // Validate hour and minutes
      if (isNaN(hour) || hour < 0 || hour > 23) {
        return timeStr // Return original if invalid
      }
      
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      return `${displayHour}:${minutes} ${ampm}`
    }
    
    // Handle full datetime format (ISO strings)
    if (timeStr.includes('T') || timeStr.includes('-')) {
      try {
        const date = new Date(timeStr)
        if (isNaN(date.getTime())) {
          return timeStr // Return original if invalid date
        }
        return date.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        })
      } catch {
        return timeStr
      }
    }
    
    // Handle timestamps or other formats
    try {
      const date = new Date(timeStr)
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        })
      }
    } catch {
      // Fall through to return original
    }
    
    return timeStr // Return original string if no format matches
  }
  
  const startFormatted = formatTime(startTime)
  
  if (endTime) {
    const endFormatted = formatTime(endTime)
    return `${startFormatted} - ${endFormatted}`
  }
  
  return `${startFormatted} - Ongoing`
}

const calculateDutyDuration = (startTime?: string, endTime?: string) => {
  if (!startTime || !endTime) return 'N/A'
  
  // Special case for 24-hour duty (00:00 to 23:59)
  if (startTime === '00:00' && endTime === '23:59') {
    return '24 hours'
  }
  
  // Enhanced time parsing function
  const parseTime = (timeStr: string): { hours: number; minutes: number } | null => {
    // Handle simple time format (HH:MM or H:MM)
    if (timeStr.includes(':') && !timeStr.includes(' ') && !timeStr.includes('T')) {
      const [hoursStr, minutesStr] = timeStr.split(':')
      const hours = parseInt(hoursStr, 10)
      const minutes = parseInt(minutesStr, 10)
      
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return null
      }
      
      return { hours, minutes }
    }
    
    // Handle datetime formats
    try {
      const date = new Date(timeStr)
      if (isNaN(date.getTime())) {
        return null
      }
      return { 
        hours: date.getHours(), 
        minutes: date.getMinutes() 
      }
    } catch {
      return null
    }
  }
  
  const startParsed = parseTime(startTime)
  const endParsed = parseTime(endTime)
  
  if (!startParsed || !endParsed) {
    return 'N/A'
  }
  
  const startMinutes = startParsed.hours * 60 + startParsed.minutes
  let endMinutes = endParsed.hours * 60 + endParsed.minutes
  
  // Handle overnight shifts (end time is next day)
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60 // Add 24 hours
  }
  
  const diffMinutes = endMinutes - startMinutes
  const hours = Math.floor(diffMinutes / 60)
  const minutes = diffMinutes % 60
  
  // Format duration nicely
  if (hours === 0) {
    return `${minutes} min${minutes !== 1 ? 's' : ''}`
  } else if (minutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`
  } else {
    return `${hours}h ${minutes}m`
  }
}

// Helper function to get violation details for a specific beat
export function GeofencingContent() {
  // Tab and filter states
  const [selectedTab, setSelectedTab] = useState('beats')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('all')
  const [selectedSubUnit, setSelectedSubUnit] = useState('all')
  const [sortBy, setSortBy] = useState<'name' | 'unit' | 'status'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  
  // Data states with loading and error handling
  const [beats, setBeats] = useState<GeofenceBeat[]>([])
  const [violations, setViolations] = useState<Violation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalBeats, setTotalBeats] = useState(0)
  const ITEMS_PER_PAGE = 20
  
  // Dialog states
  const [isCreateBeatOpen, setIsCreateBeatOpen] = useState(false)
  const [selectedBeat, setSelectedBeat] = useState<GeofenceBeat | null>(null)
  const [isEditBeatOpen, setIsEditBeatOpen] = useState(false)
  const [beatToEdit, setBeatToEdit] = useState<GeofenceBeat | null>(null)
  
  // Last refresh tracking for manual refresh only
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // Optimized data fetching with pagination and error handling
  const fetchData = useCallback(async (page = 1, showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      setError(null)

      const session = await useAuthStore.getState().getValidSession()
      if (!session) {
        throw new Error('Authentication required')
      }

      // Build query parameters for server-side filtering and pagination
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        search: searchTerm,
        unit: selectedUnit !== 'all' ? selectedUnit : '',
        subUnit: selectedSubUnit !== 'all' ? selectedSubUnit : '',
        status: statusFilter !== 'all' ? statusFilter : ''
      })

      const [beatsResponse, beatPersonnelResponse] = await Promise.all([
        fetch(`/api/beats?${params}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }),
        fetch('/api/beat-personnel', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
      ])
      
      if (!beatsResponse.ok) {
        throw new Error(`Failed to fetch beats: ${beatsResponse.statusText}`)
      }
      if (!beatPersonnelResponse.ok) {
        throw new Error(`Failed to fetch personnel data: ${beatPersonnelResponse.statusText}`)
      }
      
      const beatsData = await beatsResponse.json()
      const beatPersonnelData = await beatPersonnelResponse.json()
      
      // Set total for pagination
      setTotalBeats(beatsData.pagination?.total || beatsData.length)
      
      // Transform database data to component format with error handling
      const transformedBeats: GeofenceBeat[] = (beatsData.data || beatsData).map((beat: Record<string, unknown>) => {
        try {
          const assignedPersonnel = beatPersonnelData
            .filter((bp: Record<string, unknown>) => bp.beat_id === beat.id)
            .map((bp: Record<string, unknown>) => (bp.personnel as Record<string, unknown>)?.full_name as string)
            .filter(Boolean)
          
          const pendingPersonnel = beatPersonnelData
            .filter((bp: Record<string, unknown>) => bp.beat_id === beat.id && bp.acceptance_status === 'pending')
            .map((bp: Record<string, unknown>) => (bp.personnel as Record<string, unknown>)?.full_name as string)
            .filter(Boolean)
          
          const acceptedPersonnel = beatPersonnelData
            .filter((bp: Record<string, unknown>) => bp.beat_id === beat.id && bp.acceptance_status === 'accepted')
            .map((bp: Record<string, unknown>) => (bp.personnel as Record<string, unknown>)?.full_name as string)
            .filter(Boolean)
          
          return {
            id: beat.id as string,
            name: beat.name as string,
            location: {
              lat: beat.center_lat as number,
              lng: beat.center_lng as number,
              address: (beat.address as string) || `${beat.name as string} Area`
            },
            radius: beat.radius_meters as number,
            province: (beat.unit as string)?.includes('PPO') ? (beat.unit as string).replace(' PPO', '') : 'MIMAROPA',
            unit: beat.unit as string,
            subUnit: beat.sub_unit as string,
            assignedPersonnel,
            status: 'active' as const,
            createdAt: beat.created_at as string,
            violations: 0, // TODO: implement violations tracking
            lastActivity: beat.updated_at as string || beat.created_at as string,
            beatStatus: acceptedPersonnel.length > 0 ? 'on_duty' : 
                       pendingPersonnel.length > 0 ? 'pending' : 'completed',
            assignedPersonnelDetails: beatPersonnelData
              .filter((bp: Record<string, unknown>) => bp.beat_id === beat.id)
              .map((bp: Record<string, unknown>) => ({
                id: (bp.personnel as Record<string, unknown>)?.id as string,
                name: (bp.personnel as Record<string, unknown>)?.full_name as string,
                rank: (bp.personnel as Record<string, unknown>)?.rank as string,
                email: (bp.personnel as Record<string, unknown>)?.email as string,
                status: bp.acceptance_status as string,
                assignedAt: bp.assigned_at as string,
                acceptedAt: bp.accepted_at as string
              }))
              .filter((detail: any) => detail.id && detail.name),
            dutyStartTime: beat.created_at as string,
            estimatedDuration: '8 hours'
          }
        } catch (err) {
          console.error('Error transforming beat data:', err, beat)
          // Return a minimal beat object in case of error
          return {
            id: beat.id as string || `error-${Date.now()}`,
            name: beat.name as string || 'Unknown Beat',
            location: { lat: 0, lng: 0, address: 'Unknown Location' },
            radius: 500,
            province: 'Unknown',
            unit: 'Unknown Unit',
            subUnit: 'Unknown Sub-unit',
            assignedPersonnel: [],
            status: 'active' as const,
            createdAt: beat.created_at as string || new Date().toISOString(),
            violations: 0,
            lastActivity: new Date().toISOString(),
            beatStatus: 'pending' as const
          }
        }
      })
      
      setBeats(transformedBeats)
      setViolations([]) // TODO: implement violations from database
      setLastRefresh(new Date())
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data'
      setError(errorMessage)
      console.error('Failed to fetch data:', err)
      toast.error(`Error loading beats: ${errorMessage}`)
    } finally {
      if (showLoading) setLoading(false)
      setRefreshing(false)
    }
  }, [searchTerm, selectedUnit, selectedSubUnit, statusFilter])

  // Manual refresh function
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData(currentPage, false)
  }, [fetchData, currentPage])

  // Delete beat handler
  const handleDeleteBeat = useCallback(async (beatId: string, beatName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${beatName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const session = await useAuthStore.getState().getValidSession()
      if (!session) {
        throw new Error('Authentication required')
      }

      const response = await fetch(`/api/beats/${beatId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete beat')
      }

      toast.success('Beat deleted successfully')
      await fetchData(currentPage, false) // Refresh the data
    } catch (error) {
      console.error('Delete beat error:', error)
      toast.error('Failed to delete beat')
    }
  }, [fetchData, currentPage])

  // Initial data load
  useEffect(() => {
    fetchData(1)
  }, [fetchData])

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedUnit, selectedSubUnit, statusFilter])

  // Memoized filtered and sorted beats for better performance
  const { filteredBeats, totalPages } = useMemo(() => {
    // Server-side pagination means we use the beats as-is from API
    const total = Math.ceil(totalBeats / ITEMS_PER_PAGE)
    return {
      filteredBeats: beats,
      totalPages: total
    }
  }, [beats, totalBeats])

  // Memoized unique units and sub-units
  const units = useMemo(() => {
    try {
      const uniqueUnits = [...new Set(beats.map(beat => beat.unit).filter(Boolean))]
      return uniqueUnits.sort()
    } catch (error) {
      console.error('Error getting units:', error)
      return []
    }
  }, [beats])

  const subUnits = useMemo(() => {
    try {
      let filteredBeats = beats
      if (selectedUnit !== 'all') {
        filteredBeats = beats.filter(beat => beat.unit === selectedUnit)
      }
      const uniqueSubUnits = [...new Set(filteredBeats.map(beat => beat.subUnit).filter(Boolean))]
      return uniqueSubUnits.sort()
    } catch (error) {
      console.error('Error getting sub-units:', error)
      return []
    }
  }, [beats, selectedUnit])

  // Pagination handlers
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
    fetchData(page, false)
  }, [fetchData])

  // Filter change handlers
  const handleUnitChange = useCallback((value: string) => {
    setSelectedUnit(value)
    setSelectedSubUnit('all') // Reset sub-unit when unit changes
  }, [])

  // Memoized stats for dashboard
  const stats = useMemo(() => {
    const activeBeats = beats.filter(beat => beat.beatStatus === 'on_duty').length
    const pendingBeats = beats.filter(beat => beat.beatStatus === 'pending').length
    const totalPersonnel = beats.reduce((sum, beat) => sum + beat.assignedPersonnel.length, 0)
    
    return {
      totalBeats: totalBeats,
      activeBeats,
      pendingBeats,
      totalPersonnel
    }
  }, [beats, totalBeats])

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Geofencing Management</h1>
            <p className="text-gray-600">Manage patrol beats and monitor personnel movement</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            </div>
            <Dialog open={isCreateBeatOpen} onOpenChange={setIsCreateBeatOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Beat
                </Button>
              </DialogTrigger>
              <CreateBeatDialog 
                onClose={() => setIsCreateBeatOpen(false)} 
                onBeatCreated={() => {
                  setIsCreateBeatOpen(false)
                  handleRefresh()
                }}
              />
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Beats</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalBeats}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Active Beats</p>
                  <p className="text-2xl font-bold text-green-600">{stats.activeBeats}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Timer className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendingBeats}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Personnel</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalPersonnel}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Last refresh info */}
        <div className="text-xs text-gray-500 flex items-center space-x-2">
          <Clock className="h-3 w-3" />
          <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">Error loading beats</p>
            </div>
            <p className="text-sm text-red-600 mt-1">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              className="mt-3 border-red-300 text-red-600 hover:bg-red-100"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search beats, locations, or personnel..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={selectedUnit} onValueChange={handleUnitChange}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="All Units" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Units</SelectItem>
                  {units.map(unit => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedSubUnit} onValueChange={setSelectedSubUnit}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="All Sub-Units" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sub-Units</SelectItem>
                  {subUnits.map(subUnit => (
                    <SelectItem key={subUnit} value={subUnit}>
                      {subUnit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Beats</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="on-duty">On Duty</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              {(searchTerm || selectedUnit !== 'all' || selectedSubUnit !== 'all' || statusFilter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('')
                    setSelectedUnit('all')
                    setSelectedSubUnit('all')
                    setStatusFilter('all')
                  }}
                  className="flex items-center space-x-1"
                >
                  <X className="h-4 w-4" />
                  <span>Clear</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <p className="text-gray-600">Loading patrol beats...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Beats Content */}
      {!loading && (
        <>
          {/* Tabs */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList>
              <TabsTrigger value="beats">
                Patrol Beats ({filteredBeats.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="beats" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Patrol Beats Overview
                  </CardTitle>
                  <CardDescription>
                    Manage and monitor patrol beats across MIMAROPA region
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredBeats.length === 0 ? (
                    <div className="text-center py-12">
                      <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {searchTerm || selectedUnit !== 'all' || selectedSubUnit !== 'all' || statusFilter !== 'all' 
                          ? 'No beats match your filters' 
                          : 'No beats found'
                        }
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {searchTerm || selectedUnit !== 'all' || selectedSubUnit !== 'all' || statusFilter !== 'all' 
                          ? 'Try adjusting your search criteria or clear filters.' 
                          : 'Create your first patrol beat to get started.'
                        }
                      </p>
                      {searchTerm || selectedUnit !== 'all' || selectedSubUnit !== 'all' || statusFilter !== 'all' ? (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSearchTerm('')
                            setSelectedUnit('all')
                            setSelectedSubUnit('all')
                            setStatusFilter('all')
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Clear Filters
                        </Button>
                      ) : (
                        <Button onClick={() => setIsCreateBeatOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Your First Beat
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Beats Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-3 px-2 font-medium text-gray-700">
                                <button 
                                  className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                                  onClick={() => {
                                    if (sortBy === 'name') {
                                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                                    } else {
                                      setSortBy('name')
                                      setSortOrder('asc')
                                    }
                                  }}
                                >
                                  Beat Info
                                  {sortBy === 'name' && (
                                    sortOrder === 'asc' ? 
                                      <ChevronUp className="h-4 w-4" /> : 
                                      <ChevronDown className="h-4 w-4" />
                                  )}
                                </button>
                              </th>
                              <th className="text-left py-3 px-2 font-medium text-gray-700">Location</th>
                              <th className="text-left py-3 px-2 font-medium text-gray-700">
                                <button 
                                  className="flex items-center gap-1 hover:text-gray-900 transition-colors"
                                  onClick={() => {
                                    if (sortBy === 'status') {
                                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                                    } else {
                                      setSortBy('status')
                                      setSortOrder('asc')
                                    }
                                  }}
                                >
                                  Beat Status
                                  {sortBy === 'status' && (
                                    sortOrder === 'asc' ? 
                                      <ChevronUp className="h-4 w-4" /> : 
                                      <ChevronDown className="h-4 w-4" />
                                  )}
                                </button>
                              </th>
                              <th className="text-left py-3 px-2 font-medium text-gray-700">Personnel</th>
                              <th className="text-left py-3 px-2 font-medium text-gray-700">Duty Schedule</th>
                              <th className="text-center py-3 px-2 font-medium text-gray-700">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredBeats.map(beat => (
                              <BeatTableRow
                                key={beat.id}
                                beat={beat}
                                onEdit={() => {
                                  setBeatToEdit(beat)
                                  setIsEditBeatOpen(true)
                                }}
                                onView={() => setSelectedBeat(beat)}
                                onDelete={handleDeleteBeat}
                                onRefresh={handleRefresh}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                          <div className="flex items-center space-x-4">
                            <div className="text-sm text-gray-600">
                              Page {currentPage} of {totalPages}
                            </div>
                            <div className="text-sm text-gray-600">
                              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalBeats)} of {totalBeats} beats
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(1)}
                              disabled={currentPage === 1}
                            >
                              First
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={currentPage === 1}
                            >
                              Previous
                            </Button>
                            
                            <div className="flex items-center space-x-1">
                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNumber;
                                
                                if (totalPages <= 5) {
                                  pageNumber = i + 1;
                                } else if (currentPage <= 3) {
                                  pageNumber = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                  pageNumber = totalPages - 4 + i;
                                } else {
                                  pageNumber = currentPage - 2 + i;
                                }
                                
                                return (
                                  <Button
                                    key={pageNumber}
                                    variant={currentPage === pageNumber ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handlePageChange(pageNumber)}
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
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={currentPage === totalPages}
                            >
                              Next
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(totalPages)}
                              disabled={currentPage === totalPages}
                            >
                              Last
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Edit Beat Dialog */}
      {isEditBeatOpen && beatToEdit && (
        <EditBeatDialog 
          beat={beatToEdit}
          onClose={() => {
            setIsEditBeatOpen(false)
            setBeatToEdit(null)
          }}
          onBeatUpdated={handleRefresh}
        />
      )}

      {/* Beat Details Dialog */}
      {selectedBeat && (
        <BeatDetailsDialog 
          beat={selectedBeat!} 
          onClose={() => setSelectedBeat(null)}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  )
}

// Beat Table Row Component
function BeatTableRow({ 
  beat, 
  onEdit, 
  onView,
  onDelete,
  onRefresh 
}: { 
  beat: GeofenceBeat
  onEdit: () => void
  onView: () => void
  onDelete: (beatId: string, beatName: string) => void
  onRefresh?: () => void
}) {
  
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      {/* Beat Info */}
      <td className="py-4 px-2">
        <div>
          <div className="font-medium text-gray-900">{beat.name}</div>
          <div className="text-sm text-gray-500">{beat.unit} - {beat.subUnit}</div>
          <div className="text-xs text-gray-400">Radius: {beat.radius}m</div>
          <div className="text-xs text-blue-600 font-mono mt-1">
            📍 {beat.location.lat.toFixed(6)}, {beat.location.lng.toFixed(6)}
          </div>
        </div>
      </td>
      
      {/* Location */}
      <td className="py-4 px-2">
        <div>
          <div className="text-sm font-medium text-gray-900">{beat.province}</div>
          <div className="text-xs text-gray-500 max-w-48 truncate mb-1" title={beat.location.address}>
            {beat.location.address}
          </div>
          <div className="text-xs text-blue-600 font-mono bg-blue-50 px-2 py-1 rounded border">
            📍 {beat.location.lat.toFixed(4)}, {beat.location.lng.toFixed(4)}
          </div>
        </div>
      </td>
      
      {/* Status */}
      <td className="py-4 px-2">
        <div>
          <Badge className={`${getBeatStatusColor(beat.beatStatus)} border-0 flex items-center gap-1 text-xs w-fit`}>
            {getBeatStatusIcon(beat.beatStatus)}
            {beat.beatStatus === 'on_duty' ? 'On Duty' : beat.beatStatus.charAt(0).toUpperCase() + beat.beatStatus.slice(1)}
          </Badge>
        </div>
      </td>
      
      {/* Personnel */}
      <td className="py-4 px-2">
        <div>
          <div className="text-sm font-medium text-gray-900">
            {beat.assignedPersonnel.length} personnel
          </div>
          <div className="text-xs text-gray-500 space-y-1 mt-1">
            {beat.assignedPersonnel.slice(0, 2).map((person, index) => (
              <div key={index} className="flex items-center gap-1">
                <span>{person}</span>
                {beat.personnelAcceptance?.[person] && (
                  <Badge className={`text-xs px-1 py-0 ${
                    beat.personnelAcceptance[person].status === 'accepted' ? 'bg-green-100 text-green-700' :
                    beat.personnelAcceptance[person].status === 'declined' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {beat.personnelAcceptance[person].status}
                  </Badge>
                )}
              </div>
            ))}
            {beat.assignedPersonnel.length > 2 && (
              <div className="text-xs text-gray-400">
                +{beat.assignedPersonnel.length - 2} more
              </div>
            )}
          </div>
        </div>
      </td>
      
      {/* Duty Schedule */}
      <td className="py-4 px-2">
        {beat.dutyStartTime ? (
          <div>
            <div className="text-sm font-medium text-gray-900">
              {formatDutyTime(beat.dutyStartTime, beat.dutyEndTime)}
            </div>
            <div className="text-xs text-gray-500">
              Duration: {calculateDutyDuration(beat.dutyStartTime, beat.dutyEndTime)}
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-400">Not scheduled</div>
        )}
      </td>
      
      {/* Actions */}
      <td className="py-4 px-2">
        <div className="flex items-center justify-center gap-1">
          <Button variant="ghost" size="sm" onClick={onView} className="h-8 w-8 p-0">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0">
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
            onClick={() => onDelete(beat.id, beat.name)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

// Create Beat Dialog Component
function CreateBeatDialog({ onClose, onBeatCreated }: { onClose: () => void, onBeatCreated?: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    lat: '',
    lng: '',
    radius: '500',
    unit: '', // This will be the main province unit
    subUnit: '', // This will be the sub-unit
    dutyStartTime: '',
    dutyEndTime: '',
    selectedPersonnel: [] as string[]
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handle form submission
  const handleSubmit = async () => {
    if (!formData.name || !formData.unit || !formData.subUnit || !formData.lat || !formData.lng) {
      setError('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Get valid session for authentication
      const session = await useAuthStore.getState().getValidSession()
      if (!session) {
        setError('Authentication required. Please log in again.')
        setIsSubmitting(false)
        return
      }

      // Create the beat
      const beatResponse = await fetch('/api/beats', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          name: formData.name,
          center_lat: parseFloat(formData.lat),
          center_lng: parseFloat(formData.lng),
          radius: parseInt(formData.radius),
          unit: formData.unit,
          sub_unit: formData.subUnit,
          description: formData.address
        })
      })

      if (!beatResponse.ok) {
        throw new Error('Failed to create beat')
      }

      const createdBeat = await beatResponse.json()

      // If personnel selected, assign them to the beat
      if (formData.selectedPersonnel.length > 0) {
        const session = await useAuthStore.getState().getValidSession()
        if (!session) {
          throw new Error('Authentication required for personnel assignment')
        }

        // Assign each selected personnel to the beat
        const assignmentPromises = formData.selectedPersonnel.map(async (personnelId) => {
          const assignmentResponse = await fetch('/api/beat-personnel', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              beat_id: createdBeat.id,
              personnel_id: personnelId,
              acceptance_status: 'pending',
              assigned_at: new Date().toISOString()
            })
          })

          if (!assignmentResponse.ok) {
            console.error(`Failed to assign personnel ${personnelId} to beat`)
          }
          
          return assignmentResponse
        })

        // Wait for all assignments to complete
        await Promise.all(assignmentPromises)
        console.log(`Assigned ${formData.selectedPersonnel.length} personnel to beat ${createdBeat.id}`)
      }

      // Refresh parent data and close dialog
      onBeatCreated?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create beat')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Fetch personnel data from API for beat assignment
  const [personnelData, setPersonnelData] = useState<Array<{id: string, name: string, rank: string, unit: string, subUnit: string}>>([])
  
  React.useEffect(() => {
    const fetchPersonnel = async () => {
      try {
        const session = await useAuthStore.getState().getValidSession()
        if (!session) {
          console.error('No valid session for fetching personnel')
          return
        }

        const response = await fetch('/api/personnel/list', {
          headers: { 
            'Authorization': `Bearer ${session.access_token}` 
          }
        })
        if (response.ok) {
          const data = await response.json()
          const personnel = data.data
            .map((user: Record<string, unknown>) => ({
              id: user.id as string,
              name: user.full_name as string,
              rank: user.rank as string,
              unit: user.unit as string,
              subUnit: user.sub_unit as string
            }))
          setPersonnelData(personnel)
        } else {
          console.error('Failed to fetch personnel:', response.status, response.statusText)
        }
      } catch (error) {
        console.error('Failed to fetch personnel:', error)
      }
    }
    fetchPersonnel()
  }, [])

  const units = Object.keys(MIMAROPA_STRUCTURE) // Main units (provinces)
  
  // Get available sub-units based on selected unit
  const availableSubUnits = formData.unit ? MIMAROPA_STRUCTURE[formData.unit as keyof typeof MIMAROPA_STRUCTURE]?.subUnits || [] : []

  // Filter personnel based on selected unit and subunit
  const filteredPersonnel = personnelData.filter(person => {
    if (!formData.unit) return false
    if (person.unit !== formData.unit) return false
    if (formData.subUnit && person.subUnit !== formData.subUnit) return false
    return true
  })

  // Reset subUnit and personnel when unit changes
  const handleUnitChange = (value: string) => {
    setFormData({
      ...formData, 
      unit: value,
      subUnit: '',
      selectedPersonnel: [] // Clear selected personnel when unit changes
    })
  }

  // Reset personnel when subunit changes
  const handleSubUnitChange = (value: string) => {
    setFormData({
      ...formData,
      subUnit: value,
      selectedPersonnel: [] // Clear selected personnel when subunit changes
    })
  }

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create New Patrol Beat</DialogTitle>
        <DialogDescription>
          Define a geofenced area for personnel monitoring and assignment.
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Beat Name</Label>
              <Input
                id="name"
                placeholder="e.g., Beat 1, Alpha Beat, City Center Beat"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="radius">Radius (meters)</Label>
              <Input
                id="radius"
                type="number"
                placeholder="500"
                value={formData.radius}
                onChange={(e) => setFormData({...formData, radius: e.target.value})}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="address">Location Address</Label>
            <Input
              id="address"
              placeholder="e.g., Calapan City Proper, Oriental Mindoro"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lat">Latitude</Label>
              <Input
                id="lat"
                placeholder="13.4119"
                value={formData.lat}
                onChange={(e) => setFormData({...formData, lat: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="lng">Longitude</Label>
              <Input
                id="lng"
                placeholder="121.1805"
                value={formData.lng}
                onChange={(e) => setFormData({...formData, lng: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Unit Assignment */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Unit Assignment</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="unit">Unit</Label>
              <Select value={formData.unit} onValueChange={handleUnitChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map(unit => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="subunit">Sub-unit</Label>
              <Select 
                value={formData.subUnit} 
                onValueChange={handleSubUnitChange}
                disabled={!formData.unit}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.unit ? "Select Sub-unit" : "Select Unit first"} />
                </SelectTrigger>
                <SelectContent>
                  {availableSubUnits.map(subUnit => (
                    <SelectItem key={subUnit} value={subUnit}>
                      {subUnit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Duty Schedule */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Duty Schedule</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dutyStartTime">Start Time</Label>
              <Input
                id="dutyStartTime"
                type="time"
                value={formData.dutyStartTime}
                onChange={(e) => setFormData({...formData, dutyStartTime: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="dutyEndTime">End Time</Label>
              <Input
                id="dutyEndTime"
                type="time"
                value={formData.dutyEndTime}
                onChange={(e) => setFormData({...formData, dutyEndTime: e.target.value})}
              />
            </div>
          </div>
          {formData.dutyStartTime && formData.dutyEndTime && (
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-800">
                  Duration: {calculateDutyDuration(formData.dutyStartTime, formData.dutyEndTime)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Personnel Assignment */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Assign Personnel</h3>
          <div className="space-y-2">
            {!formData.unit ? (
              <div className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                Please select a unit first to see available personnel
              </div>
            ) : filteredPersonnel.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                No personnel available for the selected unit/sub-unit
              </div>
            ) : (
              <>
                <Label>Select Personnel for this Beat</Label>
                <div className="text-sm text-gray-600 mb-2">
                  Available personnel from <strong>{formData.unit}</strong>
                  {formData.subUnit && <span> - <strong>{formData.subUnit}</strong></span>}
                </div>
                <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                  {filteredPersonnel.map(person => (
                    <div key={person.id} className="flex items-center space-x-3 py-2">
                      <input
                        type="checkbox"
                        id={`person-${person.id}`}
                        checked={formData.selectedPersonnel.includes(person.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              selectedPersonnel: [...formData.selectedPersonnel, person.id]
                            })
                          } else {
                            setFormData({
                              ...formData,
                              selectedPersonnel: formData.selectedPersonnel.filter(id => id !== person.id)
                            })
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor={`person-${person.id}`} className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{person.name}</span>
                            <span className="text-sm text-gray-500 ml-2">({person.rank})</span>
                          </div>
                          <span className="text-sm text-gray-500">{person.subUnit}</span>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
                {formData.selectedPersonnel.length > 0 && (
                  <div className="text-sm text-gray-600 bg-green-50 p-2 rounded">
                    <span className="font-medium text-green-800">{formData.selectedPersonnel.length}</span> personnel selected
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      <DialogFooter className="pt-4">
        {error && (
          <div className="w-full mb-2 p-2 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
            {error}
          </div>
        )}
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!formData.name || !formData.unit || !formData.subUnit || !formData.lat || !formData.lng || isSubmitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating...
            </>
          ) : (
            'Create Beat'
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

// Beat Details Dialog Component
function BeatDetailsDialog({ 
  beat, 
  onClose,
  onRefresh 
}: { 
  beat: GeofenceBeat
  onClose: () => void
  onRefresh?: () => void
}) {
  const [isEditMode, setIsEditMode] = useState(false)

  if (isEditMode) {
    return (
      <EditBeatDialog 
        beat={beat}
        onClose={() => {
          setIsEditMode(false)
          onClose()
        }}
        onBeatUpdated={() => {
          setIsEditMode(false)
          onRefresh?.()
          onClose()
        }}
      />
    )
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {beat.name}
          </DialogTitle>
          <DialogDescription>{beat.location.address}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm text-gray-500">Beat Status</Label>
                <div className="mt-1">
                  <Badge className={`${getBeatStatusColor(beat.beatStatus)} border-0 flex items-center gap-1 w-fit`}>
                    {getBeatStatusIcon(beat.beatStatus)}
                    {beat.beatStatus === 'on_duty' ? 'On Duty' : beat.beatStatus.charAt(0).toUpperCase() + beat.beatStatus.slice(1)}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-sm text-gray-500">Radius</Label>
                <p className="font-medium">{beat.radius} meters</p>
              </div>
              <div>
                <Label className="text-sm text-gray-500">Created</Label>
                <p className="text-sm">{beat.createdAt}</p>
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Location & Beat Center</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                <Label className="text-sm font-medium text-blue-800">Beat Center Coordinates</Label>
              </div>
              <p className="font-mono text-lg font-bold text-blue-900 mb-1">
                📍 {beat.location.lat.toFixed(6)}, {beat.location.lng.toFixed(6)}
              </p>
              <p className="text-sm text-blue-700">
                Beat radius: <strong>{beat.radius}m</strong> from this center point
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-500">Unit</Label>
                <p className="font-medium">{beat.unit}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-500">Sub-unit</Label>
                <p className="font-medium">{beat.subUnit}</p>
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm text-gray-500">Address</Label>
                <p className="text-sm">{beat.location.address}</p>
              </div>
            </div>
          </div>

          {/* Duty Schedule */}
          {beat.dutyStartTime && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Duty Schedule</h3>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-blue-700">Schedule</Label>
                    <p className="font-medium text-blue-900">
                      {formatDutyTime(beat.dutyStartTime, beat.dutyEndTime)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-blue-700">Duration</Label>
                    <p className="font-medium text-blue-900">
                      {calculateDutyDuration(beat.dutyStartTime, beat.dutyEndTime)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Personnel */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Assigned Personnel</h3>
            <div className="space-y-3">
              {beat.assignedPersonnel.map((person, index) => {
                const acceptance = beat.personnelAcceptance?.[person]
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{person}</p>
                      <p className="text-sm text-gray-600">{beat.unit} - {beat.subUnit}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${
                        acceptance?.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        acceptance?.status === 'declined' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {acceptance?.status || 'pending'}
                      </Badge>
                      {acceptance?.timestamp && (
                        <span className="text-xs text-gray-500">{acceptance.timestamp}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => setIsEditMode(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Beat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Edit Beat Dialog Component
function EditBeatDialog({ 
  beat, 
  onClose, 
  onBeatUpdated 
}: { 
  beat: GeofenceBeat
  onClose: () => void
  onBeatUpdated?: () => void
}) {
  const [formData, setFormData] = useState({
    name: beat.name,
    address: beat.location.address,
    lat: beat.location.lat.toString(),
    lng: beat.location.lng.toString(),
    radius: beat.radius.toString(),
    unit: beat.unit,
    subUnit: beat.subUnit,
    dutyStartTime: beat.dutyStartTime || '',
    dutyEndTime: beat.dutyEndTime || '',
    selectedPersonnel: [] as string[]
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handle form submission
  const handleSubmit = async () => {
    if (!formData.name || !formData.unit || !formData.subUnit || !formData.lat || !formData.lng) {
      setError('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const session = await useAuthStore.getState().getValidSession()
      if (!session) {
        throw new Error('Authentication required')
      }

      // Update the beat
      const beatResponse = await fetch(`/api/beats/${beat.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          name: formData.name,
          center_lat: parseFloat(formData.lat),
          center_lng: parseFloat(formData.lng),
          radius: parseInt(formData.radius),
          unit: formData.unit,
          sub_unit: formData.subUnit,
          description: formData.address
        })
      })

      if (!beatResponse.ok) {
        throw new Error('Failed to update beat')
      }

      toast.success('Beat updated successfully')
      onBeatUpdated?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update beat')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Fetch personnel data from API for beat assignment
  const [personnelData, setPersonnelData] = useState<Array<{id: string, name: string, rank: string, unit: string, subUnit: string}>>([])
  
  React.useEffect(() => {
    const fetchPersonnel = async () => {
      try {
        const session = await useAuthStore.getState().getValidSession()
        if (!session) {
          console.error('No valid session for fetching personnel')
          return
        }

        const response = await fetch('/api/personnel/list', {
          headers: { 
            'Authorization': `Bearer ${session.access_token}` 
          }
        })
        if (response.ok) {
          const data = await response.json()
          const personnel = data.data
            .map((user: Record<string, unknown>) => ({
              id: user.id as string,
              name: user.full_name as string,
              rank: user.rank as string,
              unit: user.unit as string,
              subUnit: user.sub_unit as string
            }))
          setPersonnelData(personnel)
        } else {
          console.error('Failed to fetch personnel:', response.status, response.statusText)
        }
      } catch (error) {
        console.error('Failed to fetch personnel:', error)
      }
    }
    fetchPersonnel()
  }, [])

  const units = Object.keys(MIMAROPA_STRUCTURE) // Main units (provinces)
  
  // Get available sub-units based on selected unit
  const availableSubUnits = formData.unit ? MIMAROPA_STRUCTURE[formData.unit as keyof typeof MIMAROPA_STRUCTURE]?.subUnits || [] : []

  // Filter personnel based on selected unit and subunit
  const filteredPersonnel = personnelData.filter(person => {
    if (!formData.unit) return false
    if (person.unit !== formData.unit) return false
    if (formData.subUnit && person.subUnit !== formData.subUnit) return false
    return true
  })

  // Reset subUnit and personnel when unit changes
  const handleUnitChange = (value: string) => {
    setFormData({
      ...formData, 
      unit: value,
      subUnit: '',
      selectedPersonnel: [] // Clear selected personnel when unit changes
    })
  }

  // Reset personnel when subunit changes
  const handleSubUnitChange = (value: string) => {
    setFormData({
      ...formData,
      subUnit: value,
      selectedPersonnel: [] // Clear selected personnel when subunit changes
    })
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Beat: {beat.name}
          </DialogTitle>
          <DialogDescription>
            Update the beat information, location, and settings.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Beat Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Beat 1, Alpha Beat, City Center Beat"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="radius">Radius (meters)</Label>
                <Input
                  id="radius"
                  type="number"
                  placeholder="500"
                  value={formData.radius}
                  onChange={(e) => setFormData({...formData, radius: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="address">Location Address</Label>
              <Input
                id="address"
                placeholder="e.g., Calapan City Proper, Oriental Mindoro"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lat">Latitude</Label>
                <Input
                  id="lat"
                  placeholder="13.4119"
                  value={formData.lat}
                  onChange={(e) => setFormData({...formData, lat: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="lng">Longitude</Label>
                <Input
                  id="lng"
                  placeholder="121.1805"
                  value={formData.lng}
                  onChange={(e) => setFormData({...formData, lng: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Unit Assignment */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Unit Assignment</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Select value={formData.unit} onValueChange={handleUnitChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map(unit => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="subunit">Sub-unit</Label>
                <Select 
                  value={formData.subUnit} 
                  onValueChange={handleSubUnitChange}
                  disabled={!formData.unit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.unit ? "Select Sub-unit" : "Select Unit first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubUnits.map(subUnit => (
                      <SelectItem key={subUnit} value={subUnit}>
                        {subUnit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Duty Schedule */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Duty Schedule</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dutyStartTime">Start Time</Label>
                <Input
                  id="dutyStartTime"
                  type="time"
                  value={formData.dutyStartTime}
                  onChange={(e) => setFormData({...formData, dutyStartTime: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="dutyEndTime">End Time</Label>
                <Input
                  id="dutyEndTime"
                  type="time"
                  value={formData.dutyEndTime}
                  onChange={(e) => setFormData({...formData, dutyEndTime: e.target.value})}
                />
              </div>
            </div>
            {formData.dutyStartTime && formData.dutyEndTime && (
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">
                    Duration: {calculateDutyDuration(formData.dutyStartTime, formData.dutyEndTime)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Current Personnel */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Current Personnel Assignment</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-2">
                {beat.assignedPersonnel.length > 0 ? (
                  beat.assignedPersonnel.map((person, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div>
                        <span className="font-medium">{person}</span>
                        <span className="text-sm text-gray-500 ml-2">({beat.unit} - {beat.subUnit})</span>
                      </div>
                      {beat.personnelAcceptance?.[person] && (
                        <Badge className={`text-xs ${
                          beat.personnelAcceptance[person].status === 'accepted' ? 'bg-green-100 text-green-700' :
                          beat.personnelAcceptance[person].status === 'declined' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {beat.personnelAcceptance[person].status}
                        </Badge>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    No personnel currently assigned to this beat
                  </div>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>Note: Personnel assignment changes should be made through the Personnel Management section for proper tracking and notifications.</p>
            </div>
          </div>
        </div>
        
        <DialogFooter className="pt-4">
          {error && (
            <div className="w-full mb-2 p-2 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
              {error}
            </div>
          )}
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!formData.name || !formData.unit || !formData.subUnit || !formData.lat || !formData.lng || isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Updating...
              </>
            ) : (
              'Update Beat'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
