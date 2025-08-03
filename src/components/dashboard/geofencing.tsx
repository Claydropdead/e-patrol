'use client'

import { useState } from 'react'
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
  XCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
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
}

interface Violation {
  id: string
  beatId: string
  beatName: string
  personnelName: string
  type: 'exit' | 'enter' | 'unauthorized'
  timestamp: string
  location: {
    lat: number
    lng: number
  }
  status: 'pending' | 'resolved' | 'ignored'
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
    violations: 3,
    lastActivity: '2 hours ago'
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
    violations: 1,
    lastActivity: '30 minutes ago'
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
    status: 'maintenance',
    createdAt: '2024-01-20',
    violations: 0,
    lastActivity: '1 day ago'
  }
]

const mockViolations: Violation[] = [
  {
    id: '1',
    beatId: '1',
    beatName: 'Calapan City Center Beat',
    personnelName: 'PO1 Juan Cruz',
    type: 'exit',
    timestamp: '2024-08-03 14:30:00',
    location: { lat: 13.4120, lng: 121.1810 },
    status: 'pending'
  },
  {
    id: '2',
    beatId: '2',
    beatName: 'Puerto Princesa Airport Beat',
    personnelName: 'SPO1 Carlos Reyes',
    type: 'unauthorized',
    timestamp: '2024-08-03 13:15:00',
    location: { lat: 9.7425, lng: 118.7595 },
    status: 'resolved'
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
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getViolationTypeIcon = (type: string) => {
  switch (type) {
    case 'exit': return <XCircle className="h-4 w-4 text-red-500" />
    case 'enter': return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'unauthorized': return <AlertTriangle className="h-4 w-4 text-orange-500" />
    default: return <Clock className="h-4 w-4 text-gray-500" />
  }
}

export function GeofencingContent() {
  const [selectedTab, setSelectedTab] = useState('beats')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProvince, setSelectedProvince] = useState('all')
  const [isCreateBeatOpen, setIsCreateBeatOpen] = useState(false)
  const [selectedBeat, setSelectedBeat] = useState<GeofenceBeat | null>(null)

  // Get unique provinces from MIMAROPA structure
  const provinces = Object.keys(MIMAROPA_STRUCTURE)

  const filteredBeats = mockBeats.filter(beat => {
    const matchesSearch = beat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         beat.location.address.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesProvince = selectedProvince === 'all' || beat.province === selectedProvince
    return matchesSearch && matchesProvince
  })

  const filteredViolations = mockViolations.filter(violation =>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Beats</p>
                <p className="text-2xl font-bold text-gray-900">{mockBeats.length}</p>
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
                  {mockBeats.filter(b => b.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Violations</p>
                <p className="text-2xl font-bold text-gray-900">
                  {mockViolations.filter(v => v.status === 'pending').length}
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
                  {new Set(mockBeats.flatMap(b => b.assignedPersonnel)).size}
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
          <TabsTrigger value="violations">Violations</TabsTrigger>
          <TabsTrigger value="map">Map View</TabsTrigger>
        </TabsList>

        <TabsContent value="beats" className="space-y-4">
          <div className="grid gap-4">
            {filteredBeats.map(beat => (
              <BeatCard 
                key={beat.id} 
                beat={beat} 
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

        <TabsContent value="violations" className="space-y-4">
          <div className="space-y-4">
            {filteredViolations.map(violation => (
              <ViolationCard key={violation.id} violation={violation} />
            ))}
            {filteredViolations.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No violations found</h3>
                  <p className="text-gray-600">All personnel are within their assigned beats.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="map" className="space-y-4">
          <Card>
            <CardContent className="p-8 text-center">
              <MapPin className="h-24 w-24 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Interactive Map</h3>
              <p className="text-gray-600 mb-4">
                Real-time map view showing all patrol beats and personnel locations.
              </p>
              <Button variant="outline">
                <MapPin className="h-4 w-4 mr-2" />
                Open Full Map
              </Button>
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
  onEdit, 
  onView 
}: { 
  beat: GeofenceBeat
  onEdit: () => void
  onView: () => void 
}) {
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
            </div>
            
            <p className="text-gray-600 mb-3">{beat.location.address}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
            </div>
            
            <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
              <span>Created: {beat.createdAt}</span>
              <span>Last activity: {beat.lastActivity}</span>
              {beat.violations > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {beat.violations} violations
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex space-x-2 ml-4">
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

// Violation Card Component
function ViolationCard({ violation }: { violation: Violation }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getViolationTypeIcon(violation.type)}
            <div>
              <h4 className="font-medium text-gray-900">{violation.personnelName}</h4>
              <p className="text-sm text-gray-600">{violation.beatName}</p>
            </div>
          </div>
          
          <div className="text-right">
            <Badge className={`${getStatusColor(violation.status)} border-0 mb-1`}>
              {violation.status}
            </Badge>
            <p className="text-xs text-gray-500">{violation.timestamp}</p>
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
    subUnit: '' // This will be the sub-unit
  })

  const units = Object.keys(MIMAROPA_STRUCTURE) // Main units (provinces)
  
  // Get available sub-units based on selected unit
  const availableSubUnits = formData.unit ? MIMAROPA_STRUCTURE[formData.unit as keyof typeof MIMAROPA_STRUCTURE]?.subUnits || [] : []

  // Reset subUnit when unit changes
  const handleUnitChange = (value: string) => {
    setFormData({
      ...formData, 
      unit: value,
      subUnit: ''
    })
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Create New Patrol Beat</DialogTitle>
        <DialogDescription>
          Define a geofenced area for personnel monitoring and assignment.
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4">
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
              onValueChange={(value) => setFormData({...formData, subUnit: value})}
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
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onClose} disabled={!formData.name || !formData.unit || !formData.subUnit}>
          Create Beat
        </Button>
      </div>
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
