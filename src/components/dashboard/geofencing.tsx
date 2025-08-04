'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Shield, 
  MapPin, 
  Plus, 
  Search, 
  Filter,
  Users,
  AlertTriangle,
  Settings,
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
  Play,
  Pause,
  Square
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
  beatStatus: 'pending' | 'accepted' | 'declined' | 'in_progress' | 'completed'
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
    unit: 'Calapan CPS',
    subUnit: 'Beat 1',
    assignedPersonnel: ['PO1 Juan Cruz', 'PO2 Maria Santos'],
    status: 'active',
    createdAt: '2024-01-15',
    violations: 1,
    lastActivity: 'Just now',
    dutyStartTime: '06:00',
    dutyEndTime: '18:00',
    beatStatus: 'in_progress',
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
    dutyStartTime: '08:00',
    dutyEndTime: '20:00',
    beatStatus: 'in_progress',
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
    unit: 'Boac MPS',
    subUnit: 'Government District',
    assignedPersonnel: ['PO1 Roberto Garcia'],
    status: 'active',
    createdAt: '2024-01-20',
    violations: 0,
    lastActivity: '2 hours ago',
    dutyStartTime: '07:00',
    dutyEndTime: '19:00',
    beatStatus: 'accepted',
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
    unit: 'Romblon MPS',
    subUnit: 'Port Security',
    assignedPersonnel: ['PO2 Lisa Morales', 'PO1 Mark Dela Cruz'],
    status: 'active',
    createdAt: '2024-02-10',
    violations: 2,
    lastActivity: '1 hour ago',
    dutyStartTime: '06:00',
    dutyEndTime: '18:00',
    beatStatus: 'accepted',
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
    case 'accepted': return 'bg-green-100 text-green-800'
    case 'declined': return 'bg-red-100 text-red-800'
    case 'in_progress': return 'bg-blue-100 text-blue-800'
    case 'completed': return 'bg-purple-100 text-purple-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getBeatStatusIcon = (status: string) => {
  switch (status) {
    case 'pending': return <Timer className="h-4 w-4" />
    case 'accepted': return <UserCheck className="h-4 w-4" />
    case 'declined': return <UserX className="h-4 w-4" />
    case 'in_progress': return <Activity className="h-4 w-4" />
    case 'completed': return <CheckCircle className="h-4 w-4" />
    default: return <Clock className="h-4 w-4" />
  }
}

const getViolationTypeIcon = (type: string) => {
  // Only exit violations are tracked for notifications
  if (type === 'exit') {
    return <XCircle className="h-4 w-4 text-red-500" />
  }
  return <AlertTriangle className="h-4 w-4 text-red-500" />
}

const formatDutyTime = (startTime?: string, endTime?: string) => {
  if (!startTime) return 'Not scheduled'
  
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
    
    let startMinutes = startHour * 60 + startMin
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

// Helper function to check if all personnel have accepted
const checkAllPersonnelAccepted = (beat: GeofenceBeat): boolean => {
  if (!beat.personnelAcceptance) return false
  
  return beat.assignedPersonnel.every(person => 
    beat.personnelAcceptance?.[person]?.status === 'accepted'
  )
}

// Helper function to get violation details for a specific beat
const getViolationDetailsForBeat = (beatId: string, violations: Violation[]): Violation[] => {
  return violations.filter(violation => violation.beatId === beatId)
}

export function GeofencingContent() {
  const [selectedTab, setSelectedTab] = useState('beats')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProvince, setSelectedProvince] = useState('all')
  const [isCreateBeatOpen, setIsCreateBeatOpen] = useState(false)
  const [selectedBeat, setSelectedBeat] = useState<GeofenceBeat | null>(null)
  const [beats, setBeats] = useState<GeofenceBeat[]>(mockBeats)
  const [violations, setViolations] = useState<Violation[]>(mockViolations)
  const [notifications, setNotifications] = useState<string[]>([])

  // Simulate real-time violation detection - ONLY for radius exit notifications
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate random radius exit detection for notification purposes
      if (Math.random() > 0.95) { // Reduced frequency since it's only for exit notifications
        const activeBeat = beats.find(b => b.beatStatus === 'in_progress')
        if (activeBeat && activeBeat.assignedPersonnel.length > 0) {
          // Calculate a position outside the beat radius
          const radiusInDegrees = activeBeat.radius / 111000 // Rough conversion to degrees
          const exitDistance = activeBeat.radius + Math.floor(Math.random() * 200) + 50 // At least 50m outside radius
          
          const newViolation: Violation = {
            id: `v_${Date.now()}`,
            beatId: activeBeat.id,
            beatName: activeBeat.name,
            personnelName: activeBeat.assignedPersonnel[Math.floor(Math.random() * activeBeat.assignedPersonnel.length)],
            personnelId: `p_${Date.now()}`,
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
          
          setViolations(prev => [newViolation, ...prev])
          setNotifications(prev => [
            `🚨 RADIUS EXIT ALERT: ${newViolation.personnelName} has left ${activeBeat.name} (${exitDistance}m from center)`,
            ...prev.slice(0, 4) // Keep only last 5 notifications
          ])
          
          // Update beat violation count
          setBeats(prevBeats => prevBeats.map(beat => 
            beat.id === activeBeat.id 
              ? { ...beat, violations: beat.violations + 1 }
              : beat
          ))
        }
      }
    }, 20000) // Check every 20 seconds for exit notifications

    return () => clearInterval(interval)
  }, [beats])

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

  // Function to update beat status (simulating mobile actions)
  const updateBeatStatus = (beatId: string, newStatus: GeofenceBeat['beatStatus'], reason?: string) => {
    setBeats(prev => prev.map(beat => {
      if (beat.id === beatId) {
        const updates: Partial<GeofenceBeat> = { beatStatus: newStatus }
        
        if (newStatus === 'accepted') {
          updates.acceptanceTime = new Date().toLocaleString()
          
          // Check if all personnel have accepted to auto-start
          if (checkAllPersonnelAccepted(beat)) {
            updates.beatStatus = 'in_progress'
            updates.acceptanceTime = 'Auto-started when all accepted'
          }
        } else if (newStatus === 'declined') {
          updates.declineReason = reason || 'No reason provided'
        } else if (newStatus === 'in_progress') {
          updates.dutyStartTime = new Date().toISOString()
        } else if (newStatus === 'completed') {
          updates.dutyEndTime = new Date().toISOString()
        }
        
        return { ...beat, ...updates }
      }
      return beat
    }))
  }

  // Function to handle individual personnel acceptance (simulating mobile actions)
  const updatePersonnelAcceptance = (beatId: string, personnelName: string, status: 'accepted' | 'declined', reason?: string) => {
    setBeats(prev => prev.map(beat => {
      if (beat.id === beatId) {
        const updatedAcceptance = {
          ...beat.personnelAcceptance,
          [personnelName]: {
            status,
            timestamp: new Date().toLocaleString(),
            reason: status === 'declined' ? reason : undefined
          }
        }
        
        const updatedBeat = {
          ...beat,
          personnelAcceptance: updatedAcceptance
        }
        
        // Check if all personnel have now accepted
        const allAccepted = beat.assignedPersonnel.every(person => 
          updatedAcceptance[person]?.status === 'accepted'
        )
        
        // Auto-start if all accepted
        if (allAccepted && beat.beatStatus === 'accepted') {
          updatedBeat.beatStatus = 'in_progress'
          updatedBeat.acceptanceTime = 'Auto-started when all accepted'
        }
        
        return updatedBeat
      }
      return beat
    }))
  }

  // Get unique provinces from MIMAROPA structure
  const provinces = Object.keys(MIMAROPA_STRUCTURE)

  const filteredBeats = beats.filter(beat => {
    const matchesSearch = beat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         beat.location.address.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesProvince = selectedProvince === 'all' || beat.province === selectedProvince
    return matchesSearch && matchesProvince
  })

  const filteredViolations = violations.filter(violation =>
    violation.beatName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    violation.personnelName.toLowerCase().includes(searchTerm.toLowerCase())
  )

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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Beats</p>
                <p className="text-2xl font-bold text-gray-900">{beats.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Beats</p>
                <p className="text-2xl font-bold text-gray-900">
                  {beats.filter(b => b.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Activity className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">On Duty</p>
                <p className="text-2xl font-bold text-gray-900">
                  {beats.filter(b => b.beatStatus === 'in_progress').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Assigned Personnel</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(beats.flatMap(b => b.assignedPersonnel)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search beats, locations, or personnel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
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
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="beats">Patrol Beats</TabsTrigger>
          <TabsTrigger value="duty">Duty Management</TabsTrigger>
          <TabsTrigger value="map">Map View</TabsTrigger>
        </TabsList>

        <TabsContent value="beats" className="space-y-4">
          <div className="grid gap-4">
            {filteredBeats.map(beat => (
              <BeatCard 
                key={beat.id} 
                beat={beat} 
                violations={violations}
                onEdit={() => setSelectedBeat(beat)}
                onView={() => setSelectedBeat(beat)}
              />
            ))}
            {filteredBeats.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No beats found</h3>
                  <p className="text-gray-600">Try adjusting your search criteria or create a new beat.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="duty" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Beat Assignment & Duty Status
                </CardTitle>
                <CardDescription>
                  Monitor personnel duty acceptance and track active assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {beats.map(beat => (
                    <DutyStatusCard 
                      key={beat.id} 
                      beat={beat} 
                      onUpdateStatus={updateBeatStatus}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="map" className="space-y-4">
          <Card>
            <CardContent className="p-8 text-center">
              <MapPin className="h-24 w-24 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Interactive Map</h3>
              <p className="text-gray-600 mb-4">
                Real-time map view showing all patrol beats and personnel locations.
                Beat radii will also appear on the Live Monitoring page for real-time tracking.
              </p>
              <div className="space-y-2">
                <Button variant="outline">
                  <MapPin className="h-4 w-4 mr-2" />
                  Open Full Map
                </Button>
                <p className="text-sm text-gray-500">
                  Note: Geofence radii are automatically displayed on the Live Monitoring page
                  when personnel are actively tracking within beats.
                </p>
              </div>
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

// Beat Card Component
function BeatCard({ 
  beat, 
  violations,
  onEdit, 
  onView 
}: { 
  beat: GeofenceBeat
  violations: Violation[]
  onEdit: () => void
  onView: () => void 
}) {
  // Get violations for this specific beat
  const beatViolations = getViolationDetailsForBeat(beat.id, violations)
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{beat.name}</h3>
              <Badge className={`${getStatusColor(beat.status)} border-0`}>
                {beat.status}
              </Badge>
              <Badge className={`${getBeatStatusColor(beat.beatStatus)} border-0 flex items-center gap-1`}>
                {getBeatStatusIcon(beat.beatStatus)}
                {beat.beatStatus.replace('_', ' ')}
              </Badge>
            </div>
            
            <p className="text-gray-600 mb-3">{beat.location.address}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-4">
              <div>
                <p className="text-gray-500">Province</p>
                <p className="font-medium">{beat.province}</p>
              </div>
              <div>
                <p className="text-gray-500">Unit</p>
                <p className="font-medium">{beat.unit}</p>
              </div>
              <div>
                <p className="text-gray-500">Radius</p>
                <p className="font-medium">{beat.radius}m</p>
              </div>
              <div>
                <p className="text-gray-500">Personnel</p>
                <p className="font-medium">{beat.assignedPersonnel.length}</p>
              </div>
              <div>
                <p className="text-gray-500">Duty Duration</p>
                <p className="font-medium">{calculateDutyDuration(beat.dutyStartTime, beat.dutyEndTime)}</p>
              </div>
            </div>

            {/* Duty Time Information */}
            {beat.dutyStartTime && (
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Duty Schedule</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Time: </span>
                    <span className="font-medium">{formatDutyTime(beat.dutyStartTime, beat.dutyEndTime)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Auto-started: </span>
                    <span className="font-medium text-green-600">
                      {beat.beatStatus === 'in_progress' ? 'Yes' : 'Pending acceptance'}
                    </span>
                  </div>
                </div>
                {beat.declineReason && (
                  <div className="mt-2 text-sm">
                    <span className="text-red-600 font-medium">Decline Reason: </span>
                    <span className="text-gray-700">{beat.declineReason}</span>
                  </div>
                )}
              </div>
            )}

            {/* Personnel Acceptance Details */}
            <div className="mb-3">
              <p className="text-sm text-gray-500 mb-2">Personnel Acceptance Status:</p>
              <div className="space-y-2">
                {beat.assignedPersonnel.map((person, index) => {
                  const acceptance = beat.personnelAcceptance?.[person]
                  return (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {person}
                        </Badge>
                        <Badge className={`text-xs ${
                          acceptance?.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          acceptance?.status === 'declined' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {acceptance?.status || 'pending'}
                        </Badge>
                      </div>
                      {acceptance?.timestamp && (
                        <span className="text-xs text-gray-500">{acceptance.timestamp}</span>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="mt-2 text-xs text-gray-600">
                <span className="font-medium">
                  {Object.values(beat.personnelAcceptance || {}).filter(a => a.status === 'accepted').length}
                </span> of <span className="font-medium">{beat.assignedPersonnel.length}</span> personnel accepted
                {beat.beatStatus === 'in_progress' && (
                  <span className="text-green-600 ml-2">• Auto-started when all accepted</span>
                )}
              </div>
            </div>

            {/* Radius Exit Violation Details */}
            {beatViolations.length > 0 && (
              <div className="mb-3">
                <p className="text-sm text-red-600 font-medium mb-2">Radius Exit Notifications:</p>
                <div className="space-y-1">
                  {beatViolations.map(violation => (
                    <div key={violation.id} className={`text-xs text-gray-600 p-2 rounded ${
                      violation.status === 'pending' ? 'bg-red-50' :
                      violation.status === 'acknowledged' ? 'bg-orange-50' :
                      'bg-green-50'
                    }`}>
                      <div className="flex items-center gap-1">
                        <XCircle className="h-3 w-3 text-red-500" />
                        <span className={`font-medium ${
                          violation.status === 'pending' ? 'text-red-700' :
                          violation.status === 'acknowledged' ? 'text-orange-700' :
                          'text-green-700'
                        }`}>
                          {violation.personnelName}
                        </span>
                        <span className="text-gray-600">
                          exited beat radius ({violation.distanceFromCenter}m from center, radius: {beat.radius}m)
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                        <span>{new Date(violation.timestamp).toLocaleString()}</span>
                        <span className={`px-2 py-1 rounded ${
                          violation.status === 'pending' ? 'bg-red-100 text-red-700' :
                          violation.status === 'acknowledged' ? 'bg-orange-100 text-orange-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {violation.status === 'pending' ? 'Awaiting Response' :
                           violation.status === 'acknowledged' ? 'Acknowledged' :
                           'Resolved'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
              <span>Created: {beat.createdAt}</span>
              <span>Last activity: {beat.lastActivity}</span>
            </div>
          </div>
          
          <div className="flex flex-col space-y-2 ml-4">
            <Button variant="ghost" size="sm" onClick={onView}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Violation Card Component - Only for radius exit notifications
function ViolationCard({ violation }: { violation: Violation }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <XCircle className="h-4 w-4 text-red-500 mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-gray-900">{violation.personnelName}</h4>
                <Badge className={`${getStatusColor(violation.status)} border-0 text-xs`}>
                  {violation.status}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mb-2">{violation.beatName}</p>
              <p className="text-sm text-red-700 mb-2 font-medium">
                🚨 Exited beat radius - Notification sent
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-500">
                <div>
                  <span>Detected: </span>
                  <span>{new Date(violation.timestamp).toLocaleString()}</span>
                </div>
                <div>
                  <span>Distance from center: </span>
                  <span className="font-medium text-red-600">{violation.distanceFromCenter}m</span>
                </div>
                {violation.responseTime && (
                  <div>
                    <span>Response Time: </span>
                    <span className="font-medium">{Math.floor(violation.responseTime / 60)}m {violation.responseTime % 60}s</span>
                  </div>
                )}
                {violation.acknowledgedAt && (
                  <div>
                    <span>Acknowledged: </span>
                    <span>{new Date(violation.acknowledgedAt).toLocaleString()}</span>
                  </div>
                )}
                {violation.resolvedAt && (
                  <div>
                    <span>Resolved: </span>
                    <span>{new Date(violation.resolvedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col space-y-1 ml-4">
            {violation.status === 'pending' && (
              <>
                <Button variant="outline" size="sm" className="text-xs">
                  <Bell className="h-3 w-3 mr-1" />
                  Re-notify
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Resolve
                </Button>
              </>
            )}
            {violation.status === 'acknowledged' && (
              <Button variant="outline" size="sm" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Resolve
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-xs">
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
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
    
    let startMinutes = startHour * 60 + startMin
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
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{beat.name}</DialogTitle>
          <DialogDescription>{beat.location.address}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm text-gray-500">Status</Label>
              <Badge className={`${getStatusColor(beat.status)} border-0`}>
                {beat.status}
              </Badge>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Radius</Label>
              <p className="font-medium">{beat.radius} meters</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Province</Label>
              <p className="font-medium">{beat.province}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Unit</Label>
              <p className="font-medium">{beat.unit}</p>
            </div>
          </div>
          
          <div>
            <Label className="text-sm text-gray-500 mb-2 block">Assigned Personnel</Label>
            <div className="flex flex-wrap gap-2">
              {beat.assignedPersonnel.map((person, index) => (
                <Badge key={index} variant="secondary">
                  {person}
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-gray-500">Coordinates</Label>
              <p className="font-mono text-sm">
                {beat.location.lat}, {beat.location.lng}
              </p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Created</Label>
              <p className="text-sm">{beat.createdAt}</p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 pt-4">
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

// Duty Status Card Component
function DutyStatusCard({ 
  beat, 
  onUpdateStatus 
}: { 
  beat: GeofenceBeat
  onUpdateStatus: (beatId: string, status: GeofenceBeat['beatStatus'], reason?: string) => void 
}) {
  const handleAcceptBeat = () => {
    // Simulate mobile acceptance
    onUpdateStatus(beat.id, 'accepted')
  }

  const handleDeclineBeat = () => {
    // Simulate mobile decline
    const reason = 'Personnel unavailable due to other assignment'
    onUpdateStatus(beat.id, 'declined', reason)
  }

  const handleStartDuty = () => {
    // Start duty time
    onUpdateStatus(beat.id, 'in_progress')
  }

  const handleEndDuty = () => {
    // End duty time
    onUpdateStatus(beat.id, 'completed')
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-semibold text-gray-900">{beat.name}</h4>
            <Badge className={`${getBeatStatusColor(beat.beatStatus)} border-0 flex items-center gap-1`}>
              {getBeatStatusIcon(beat.beatStatus)}
              {beat.beatStatus.replace('_', ' ')}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-3">
            <div>
              <span className="text-gray-500">Personnel: </span>
              <span className="font-medium">{beat.assignedPersonnel.join(', ')}</span>
            </div>
            <div>
              <span className="text-gray-500">Location: </span>
              <span className="font-medium">{beat.location.address}</span>
            </div>
            <div>
              <span className="text-gray-500">Unit: </span>
              <span className="font-medium">{beat.unit} - {beat.subUnit}</span>
            </div>
          </div>

          {beat.dutyStartTime && (
            <div className="bg-blue-50 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Duty Information</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-blue-700">Scheduled: </span>
                  <span className="font-medium text-blue-900">{formatDutyTime(beat.dutyStartTime, beat.dutyEndTime)}</span>
                </div>
                <div>
                  <span className="text-blue-700">Duration: </span>
                  <span className="font-medium text-blue-900">{calculateDutyDuration(beat.dutyStartTime, beat.dutyEndTime)}</span>
                </div>
              </div>
              {beat.acceptanceTime && (
                <div className="mt-2 text-sm">
                  <span className="text-blue-700">Accepted at: </span>
                  <span className="font-medium text-blue-900">
                    {new Date(beat.acceptanceTime).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}

          {beat.declineReason && (
            <div className="bg-red-50 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">Declined</span>
              </div>
              <p className="text-sm text-red-700">{beat.declineReason}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 ml-4">
          {/* Mobile Acceptance Simulation Buttons */}
          {beat.beatStatus === 'pending' && (
            <>
              <Button onClick={handleAcceptBeat} size="sm" className="text-xs">
                <UserCheck className="h-3 w-3 mr-1" />
                Accept (Mobile)
              </Button>
              <Button onClick={handleDeclineBeat} variant="outline" size="sm" className="text-xs">
                <UserX className="h-3 w-3 mr-1" />
                Decline (Mobile)
              </Button>
            </>
          )}
          
          {/* Duty Control Buttons */}
          {beat.beatStatus === 'accepted' && (
            <Button onClick={handleStartDuty} size="sm" className="text-xs">
              <Play className="h-3 w-3 mr-1" />
              Start Duty
            </Button>
          )}
          
          {beat.beatStatus === 'in_progress' && (
            <Button onClick={handleEndDuty} variant="outline" size="sm" className="text-xs">
              <Square className="h-3 w-3 mr-1" />
              End Duty
            </Button>
          )}

          {/* Notification Button for radius exit violations */}
          {beat.violations > 0 && (
            <Button variant="destructive" size="sm" className="text-xs">
              <Bell className="h-3 w-3 mr-1" />
              Radius Exits ({beat.violations})
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
