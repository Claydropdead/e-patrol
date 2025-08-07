'use client'

import React, { useState, useEffect, useRef } from 'react'
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
  XCircle,
  Timer,
  UserCheck,
  UserX,
  Bell,
  Activity,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MIMAROPA_STRUCTURE } from '@/lib/constants/mimaropa'

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

// Mock data
const mockBeats: GeofenceBeat[] = [
  {
    id: '1',
    name: 'Calapan City Center Beat',
    location: {
      lat: 13.4119,
      lng: 121.1805,
      address: 'Calapan City Proper, Oriental Mindoro'
    },
    radius: 500,
    province: 'Oriental Mindoro',
    unit: 'Oriental Mindoro PPO',
    subUnit: 'Calapan CPS',
    assignedPersonnel: ['PO1 Juan Cruz', 'PO2 Maria Santos'],
    status: 'active',
    createdAt: '2024-01-15',
    violations: 1,
    lastActivity: 'Just now',
    dutyStartTime: '00:00',
    dutyEndTime: '23:59',
    beatStatus: 'on_duty',
    acceptanceTime: 'Dec 28, 05:45 AM',
    personnelAcceptance: {
      'PO1 Juan Cruz': { status: 'accepted', timestamp: 'Dec 28, 05:40 AM' },
      'PO2 Maria Santos': { status: 'accepted', timestamp: 'Dec 28, 05:45 AM' }
    }
  },
  {
    id: '2',
    name: 'Puerto Princesa Airport Beat',
    location: {
      lat: 9.7419,
      lng: 118.7591,
      address: 'Puerto Princesa International Airport, Palawan'
    },
    radius: 800,
    province: 'Palawan',
    unit: 'Puerto Princesa CPO',
    subUnit: 'Airport Security',
    assignedPersonnel: ['SPO1 Carlos Reyes', 'PO3 Ana Lopez'],
    status: 'active',
    createdAt: '2024-02-01',
    violations: 0,
    lastActivity: '30 minutes ago',
    dutyStartTime: '00:00',
    dutyEndTime: '23:59',
    beatStatus: 'on_duty',
    acceptanceTime: 'Dec 28, 07:45 AM',
    personnelAcceptance: {
      'SPO1 Carlos Reyes': { status: 'accepted', timestamp: 'Dec 28, 07:30 AM' },
      'PO3 Ana Lopez': { status: 'accepted', timestamp: 'Dec 28, 07:45 AM' }
    }
  },
  {
    id: '3',
    name: 'Boac Municipal Hall Beat',
    location: {
      lat: 13.4526,
      lng: 121.8427,
      address: 'Boac Municipal Hall, Marinduque'
    },
    radius: 300,
    province: 'Marinduque',
    unit: 'Marinduque PPO',
    subUnit: 'Boac MPS',
    assignedPersonnel: ['PO1 Roberto Garcia'],
    status: 'active',
    createdAt: '2024-01-20',
    violations: 0,
    lastActivity: '2 hours ago',
    dutyStartTime: '00:00',
    dutyEndTime: '23:59',
    beatStatus: 'completed',
    acceptanceTime: 'Dec 28, 06:30 AM',
    personnelAcceptance: {
      'PO1 Roberto Garcia': { status: 'accepted', timestamp: 'Dec 28, 06:30 AM' }
    }
  },
  {
    id: '4',
    name: 'Romblon Port Beat',
    location: {
      lat: 12.5808,
      lng: 122.2691,
      address: 'Romblon Port Area, Romblon'
    },
    radius: 400,
    province: 'Romblon',
    unit: 'Romblon PPO',
    subUnit: 'Romblon MPS',
    assignedPersonnel: ['PO2 Lisa Morales', 'PO1 Mark Dela Cruz'],
    status: 'active',
    createdAt: '2024-02-10',
    violations: 2,
    lastActivity: '1 hour ago',
    dutyStartTime: '00:00',
    dutyEndTime: '23:59',
    beatStatus: 'pending',
    acceptanceTime: 'Pending full acceptance',
    personnelAcceptance: {
      'PO2 Lisa Morales': { status: 'accepted', timestamp: 'Dec 28, 05:30 AM' },
      'PO1 Mark Dela Cruz': { status: 'pending', timestamp: undefined }
    }
  }
]

const mockViolations: Violation[] = [
  {
    id: '1',
    beatId: '1',
    beatName: 'Calapan City Center Beat',
    personnelName: 'PO1 Juan Cruz',
    personnelId: 'p001',
    type: 'exit',
    timestamp: '2024-12-28 14:30:00',
    location: { lat: 13.4120, lng: 121.1810 },
    status: 'pending',
    distanceFromCenter: 650, // 650m from center (beat radius is 500m)
    responseTime: 300,
    notificationSent: true
  },
  {
    id: '2',
    beatId: '4',
    beatName: 'Romblon Port Beat',
    personnelName: 'PO2 Lisa Morales',
    personnelId: 'p002',
    type: 'exit',
    timestamp: '2024-12-28 13:15:00',
    location: { lat: 12.5815, lng: 122.2700 },
    status: 'acknowledged',
    acknowledgedAt: '2024-12-28 13:45:00',
    distanceFromCenter: 520, // 520m from center (beat radius is 400m)
    responseTime: 1800,
    notificationSent: true
  },
  {
    id: '3',
    beatId: '4',
    beatName: 'Romblon Port Beat',
    personnelName: 'PO1 Mark Dela Cruz',
    personnelId: 'p003',
    type: 'exit',
    timestamp: '2024-12-28 12:00:00',
    location: { lat: 12.5820, lng: 122.2705 },
    status: 'resolved',
    resolvedAt: '2024-12-28 12:30:00',
    distanceFromCenter: 580, // 580m from center (beat radius is 400m)
    responseTime: 1800,
    notificationSent: true
  }
]

// Helper functions
const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800'
    case 'inactive': return 'bg-red-100 text-red-800'
    case 'maintenance': return 'bg-yellow-100 text-yellow-800'
    case 'pending': return 'bg-orange-100 text-orange-800'
    case 'resolved': return 'bg-green-100 text-green-800'
    case 'ignored': return 'bg-gray-100 text-gray-800'
    case 'acknowledged': return 'bg-blue-100 text-blue-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

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
  
  // Handle simple time format (HH:MM)
  const formatTime = (timeStr: string) => {
    if (timeStr.includes(':') && !timeStr.includes(' ')) {
      // Simple format like "06:00"
      const [hours, minutes] = timeStr.split(':')
      const hour = parseInt(hours)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      return `${displayHour}:${minutes} ${ampm}`
    }
    
    // Handle full datetime format
    try {
      const date = new Date(timeStr)
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })
    } catch {
      return timeStr
    }
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
  
  // Handle simple time format (HH:MM)
  if (startTime.includes(':') && !startTime.includes(' ')) {
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)
    
    const startMinutes = startHour * 60 + startMin
    let endMinutes = endHour * 60 + endMin
    
    // Special case for 24-hour duty (00:00 to 23:59)
    if (startTime === '00:00' && endTime === '23:59') {
      return '24h 0m'
    }
    
    // Handle overnight shifts
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60
    }
    
    const diffMinutes = endMinutes - startMinutes
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    
    return `${hours}h ${minutes}m`
  }
  
  // Handle full datetime format (fallback)
  try {
    const start = new Date(startTime)
    const end = new Date(endTime)
    const diffMs = end.getTime() - start.getTime()
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  } catch {
    return 'N/A'
  }
}

// Helper function to get violation details for a specific beat
const getViolationDetailsForBeat = (beatId: string, violations: Violation[]): Violation[] => {
  return violations.filter(violation => violation.beatId === beatId)
}

export function GeofencingContent() {
  const [selectedTab, setSelectedTab] = useState('beats')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProvince, setSelectedProvince] = useState('all')
  const [sortBy, setSortBy] = useState<'name' | 'province' | 'status'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [isCreateBeatOpen, setIsCreateBeatOpen] = useState(false)
  const [selectedBeat, setSelectedBeat] = useState<GeofenceBeat | null>(null)
  const [beats, setBeats] = useState<GeofenceBeat[]>(mockBeats)
  const [violations, setViolations] = useState<Violation[]>(mockViolations)

  // Use refs to avoid stale closures and prevent infinite loops
  const beatsRef = useRef(beats)
  const violationsRef = useRef(violations)
  const violationCounterRef = useRef(0)
  
  // Keep refs updated
  useEffect(() => {
    beatsRef.current = beats
  }, [beats])
  
  useEffect(() => {
    violationsRef.current = violations
  }, [violations])
  // Simulate real-time violation detection - ONLY for radius exit notifications
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate random radius exit detection for notification purposes
      if (Math.random() > 0.95) { // Reduced frequency since it's only for exit notifications
        setBeats(currentBeats => {
          const activeBeat = currentBeats.find(b => b.beatStatus === 'on_duty')
          if (activeBeat && activeBeat.assignedPersonnel.length > 0) {
            // Calculate a position outside the beat radius
            const radiusInDegrees = activeBeat.radius / 111000 // Rough conversion to degrees
            const exitDistance = activeBeat.radius + Math.floor(Math.random() * 200) + 50 // At least 50m outside radius
            
            const newViolation: Violation = {
              id: `v_${Date.now()}_${++violationCounterRef.current}`,
              beatId: activeBeat.id,
              beatName: activeBeat.name,
              personnelName: activeBeat.assignedPersonnel[Math.floor(Math.random() * activeBeat.assignedPersonnel.length)],
              personnelId: `p_${Date.now()}_${violationCounterRef.current}`,
              type: 'exit', // Only exit violations for notifications
              timestamp: new Date().toISOString(),
              location: {
                lat: activeBeat.location.lat + (Math.random() - 0.5) * radiusInDegrees * 2,
                lng: activeBeat.location.lng + (Math.random() - 0.5) * radiusInDegrees * 2
              },
              status: 'pending',
              distanceFromCenter: exitDistance,
              notificationSent: true
            }
            
            // Update all state in batch to prevent cascading re-renders
            setViolations(prev => [newViolation, ...prev])
            
            // Update beat violation count and return updated beats
            return currentBeats.map(beat => 
              beat.id === activeBeat.id 
                ? { ...beat, violations: beat.violations + 1 }
                : beat
            )
          }
          return currentBeats // Return unchanged if no active beat
        })
      }
    }, 20000) // Check every 20 seconds for exit notifications

    return () => clearInterval(interval)
  }, []) // ✅ FIXED: Empty dependency array

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update last activity timestamps randomly
      setBeats(prev => prev.map(beat => ({
        ...beat,
        lastActivity: Math.random() > 0.7 ? 'Just now' : beat.lastActivity
      })))
    }, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [])

  // Get unique provinces from MIMAROPA structure with error handling
  const provinces = React.useMemo(() => {
    try {
      return Object.keys(MIMAROPA_STRUCTURE || {})
    } catch (error) {
      console.error('Error accessing MIMAROPA_STRUCTURE:', error)
      return []
    }
  }, [])

  const filteredBeats = React.useMemo(() => {
    try {
      const filtered = beats.filter(beat => {
        const matchesSearch = beat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             beat.location.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             beat.assignedPersonnel.some(person => person.toLowerCase().includes(searchTerm.toLowerCase()))
        const matchesProvince = selectedProvince === 'all' || beat.province === selectedProvince
        
        // Status filtering
        let matchesStatus = true
        if (statusFilter === 'on-duty') {
          matchesStatus = beat.beatStatus === 'on_duty'
        } else if (statusFilter === 'pending') {
          matchesStatus = beat.beatStatus === 'pending'
        } else if (statusFilter === 'completed') {
          matchesStatus = beat.beatStatus === 'completed'
        }
        
        return matchesSearch && matchesProvince && matchesStatus
      })

      // Sort beats
      const sorted = [...filtered].sort((a, b) => {
        let aValue: string | number, bValue: string | number
        
        switch (sortBy) {
          case 'name':
            aValue = a.name.toLowerCase()
            bValue = b.name.toLowerCase()
            break
          case 'province':
            aValue = a.province.toLowerCase()
            bValue = b.province.toLowerCase()
            break
          case 'status':
            aValue = a.status
            bValue = b.status
            break
          default:
            aValue = a.name.toLowerCase()
            bValue = b.name.toLowerCase()
        }
        
        if (sortOrder === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
        }
      })

      return sorted
    } catch (error) {
      console.error('Error filtering beats:', error)
      return beats
    }
  }, [beats, searchTerm, selectedProvince, statusFilter, sortBy, sortOrder])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Geofencing Management</h1>
          <p className="text-gray-600">Manage patrol beats and monitor personnel movement</p>
        </div>
        <Dialog open={isCreateBeatOpen} onOpenChange={setIsCreateBeatOpen}>
          <DialogTrigger asChild>
            <Button className="mt-4 sm:mt-0">
              <Plus className="h-4 w-4 mr-2" />
              Create Beat
            </Button>
          </DialogTrigger>
          <CreateBeatDialog onClose={() => setIsCreateBeatOpen(false)} />
        </Dialog>
      </div>

      {/* Search and Filters */}
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
          <Select value={selectedProvince} onValueChange={setSelectedProvince}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Provinces" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Provinces</SelectItem>
              {provinces.map(province => (
                <SelectItem key={province} value={province}>
                  {province}
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
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="beats">Patrol Beats</TabsTrigger>
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No beats found</h3>
                  <p className="text-gray-600">Try adjusting your search criteria or create a new beat.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-2 font-medium text-gray-700">
                          <button 
                            className="flex items-center gap-1 hover:text-gray-900"
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
                            className="flex items-center gap-1 hover:text-gray-900"
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
                          onEdit={() => setSelectedBeat(beat)}
                          onView={() => setSelectedBeat(beat)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Beat Details Dialog */}
      {selectedBeat && (
        <BeatDetailsDialog 
          beat={selectedBeat} 
          onClose={() => setSelectedBeat(null)} 
        />
      )}
    </div>
  )
}

// Beat Table Row Component
function BeatTableRow({ 
  beat, 
  onEdit, 
  onView 
}: { 
  beat: GeofenceBeat
  onEdit: () => void
  onView: () => void 
}) {
  
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      {/* Beat Info */}
      <td className="py-4 px-2">
        <div>
          <div className="font-medium text-gray-900">{beat.name}</div>
          <div className="text-sm text-gray-500">{beat.unit} - {beat.subUnit}</div>
          <div className="text-xs text-gray-400">Radius: {beat.radius}m</div>
        </div>
      </td>
      
      {/* Location */}
      <td className="py-4 px-2">
        <div>
          <div className="text-sm text-gray-900">{beat.province}</div>
          <div className="text-xs text-gray-500 max-w-48 truncate" title={beat.location.address}>
            {beat.location.address}
          </div>
          <div className="text-xs text-gray-400 font-mono">
            {beat.location.lat.toFixed(4)}, {beat.location.lng.toFixed(4)}
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
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this beat?')) {
                // Handle delete logic here
                console.log('Deleting beat:', beat.id)
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

// Create Beat Dialog Component
function CreateBeatDialog({ onClose }: { onClose: () => void }) {
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

  // Mock personnel data - in real app, fetch from database
  const mockPersonnel = [
    { id: '1', name: 'PO1 Juan Cruz', rank: 'PO1', unit: 'Oriental Mindoro PPO', subUnit: 'Calapan CPS' },
    { id: '2', name: 'PO2 Maria Santos', rank: 'PO2', unit: 'Calapan CPS', subUnit: 'Beat 1' },
    { id: '3', name: 'SPO1 Carlos Reyes', rank: 'SPO1', unit: 'Puerto Princesa CPO', subUnit: 'Airport Security' },
    { id: '4', name: 'PO3 Ana Lopez', rank: 'PO3', unit: 'Puerto Princesa CPO', subUnit: 'Airport Security' },
    { id: '5', name: 'PO1 Roberto Garcia', rank: 'PO1', unit: 'Boac MPS', subUnit: 'Government District' },
    { id: '6', name: 'PO2 Lisa Morales', rank: 'PO2', unit: 'Romblon MPS', subUnit: 'Port Security' },
    { id: '7', name: 'PO1 Mark Santos', rank: 'PO1', unit: 'Calapan CPS', subUnit: 'Traffic Unit' },
    { id: '8', name: 'SPO2 Elena Cruz', rank: 'SPO2', unit: 'Puerto Princesa CPO', subUnit: 'City Patrol' },
  ]

  const units = Object.keys(MIMAROPA_STRUCTURE) // Main units (provinces)
  
  // Get available sub-units based on selected unit
  const availableSubUnits = formData.unit ? MIMAROPA_STRUCTURE[formData.unit as keyof typeof MIMAROPA_STRUCTURE]?.subUnits || [] : []

  // Filter personnel based on selected unit and subunit
  const filteredPersonnel = mockPersonnel.filter(person => {
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

  // Calculate duty duration
  const calculateDutyDuration = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return ''
    
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)
    
    const startMinutes = startHour * 60 + startMin
    let endMinutes = endHour * 60 + endMin
    
    // Handle overnight shifts
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60
    }
    
    const diffMinutes = endMinutes - startMinutes
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    
    return `${hours}h ${minutes}m`
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
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          onClick={onClose} 
          disabled={!formData.name || !formData.unit || !formData.subUnit || !formData.dutyStartTime || !formData.dutyEndTime}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Create Beat
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

// Beat Details Dialog Component
function BeatDetailsDialog({ 
  beat, 
  onClose 
}: { 
  beat: GeofenceBeat
  onClose: () => void 
}) {
  const beatViolations = getViolationDetailsForBeat(beat.id, mockViolations)
  
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
            <h3 className="text-lg font-medium text-gray-900 mb-3">Location</h3>
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
              <div className="md:col-span-2">
                <Label className="text-sm text-gray-500">Coordinates</Label>
                <p className="font-mono text-sm">
                  {beat.location.lat}, {beat.location.lng}
                </p>
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
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            Edit Beat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
