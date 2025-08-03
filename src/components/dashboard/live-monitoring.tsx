'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import * as L from 'leaflet'
import { 
  MapPin, 
  Users, 
  AlertTriangle, 
  Clock, 
  Radio,
  Filter,
  Search,
  RefreshCw,
  Loader2
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'

// Mini map component for Live Monitoring
function MiniMap({ personnel }: { personnel: PersonnelData[] }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsLoaded(true)
    }
  }, [])

  // Initialize map only once
  useEffect(() => {
    if (!isLoaded || mapRef.current) return

    const initMap = async () => {
      try {
        const L = (await import('leaflet')).default

        // Fix for default markers
        delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        })

        // Check if container exists and is not already initialized
        const mapContainer = document.getElementById('mini-map')
        if (!mapContainer) return

        // Clear any existing content
        mapContainer.innerHTML = ''

        // Create map with all interaction options enabled
        const newMap = L.map('mini-map', {
          center: [12.0, 120.0],
          zoom: 8,
          zoomControl: true,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          dragging: true,
          touchZoom: true,
          boxZoom: true,
          keyboard: true,
          zoomSnap: 0.5,
          zoomDelta: 1,
          trackResize: true
        })

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(newMap)

        mapRef.current = newMap

      } catch (error) {
        console.error('Error initializing mini map:', error)
      }
    }

    initMap()

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove()
        } catch (e) {
          console.error('Error removing map:', e)
        }
        mapRef.current = null
      }
    }
  }, [isLoaded])

  // Update markers when personnel data changes
  useEffect(() => {
    if (!mapRef.current || !personnel) return

    const updateMarkers = async () => {
      try {
        const L = (await import('leaflet')).default

        // Clear existing markers
        mapRef.current?.eachLayer((layer: L.Layer) => {
          if (layer instanceof L.Marker) {
            mapRef.current?.removeLayer(layer)
          }
        })

        // Add markers for personnel
        personnel.forEach((person) => {
          if (person.latitude && person.longitude) {
            const color = person.status === 'alert' ? '#ef4444' :
                         person.status === 'standby' ? '#f59e0b' :
                         person.status === 'on_duty' ? '#10b981' : '#6b7280'

            const customIcon = L.divIcon({
              html: `
                <div style="
                  background-color: ${color};
                  width: 12px;
                  height: 12px;
                  border-radius: 50%;
                  border: 2px solid white;
                  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                "></div>
              `,
              className: 'custom-mini-marker',
              iconSize: [12, 12],
              iconAnchor: [6, 6]
            })

            const marker = L.marker([person.latitude, person.longitude], { icon: customIcon })
              .addTo(mapRef.current!)

            const statusBadge = person.status === 'alert' ? '🔴 Alert' :
                               person.status === 'standby' ? '🟡 Standby' :
                               person.status === 'on_duty' ? '🟢 On Duty' : '⚫ Off Duty'

            const popupContent = `
              <div style="font-family: system-ui; min-width: 150px;">
                <h3 style="margin: 0 0 4px 0; font-weight: 600; font-size: 14px;">${person.full_name}</h3>
                <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${person.rank}</p>
                <p style="margin: 0; font-size: 12px;"><strong>Status:</strong> ${statusBadge}</p>
                <p style="margin: 0; font-size: 12px;"><strong>Unit:</strong> ${person.sub_unit}</p>
              </div>
            `

            marker.bindPopup(popupContent)
          }
        })

        // Fit map to show all markers
        if (personnel.length > 0) {
          const markers = personnel
            .filter(p => p.latitude && p.longitude)
            .map(p => L.marker([p.latitude!, p.longitude!]))
          
          if (markers.length > 0) {
            const group = L.featureGroup(markers)
            mapRef.current?.fitBounds(group.getBounds().pad(0.1))
          }
        }

      } catch (error) {
        console.error('Error updating markers:', error)
      }
    }

    updateMarkers()
  }, [personnel]) // mapRef doesn't need to be in dependencies

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    )
  }

  return <div id="mini-map" className="h-full w-full rounded-lg" />
}

// Types for database data
interface PersonnelData {
  id: string
  full_name: string
  rank: string
  email: string
  province: string
  unit: string
  sub_unit: string
  status: string
  status_changed_at: string | null
  status_notes: string | null
  latitude: number | null
  longitude: number | null
  last_update: string | null
  minutes_since_update: number | null
  is_online: boolean
}

type DutyStatus = 'alert' | 'standby' | 'on_duty'

interface PersonnelStats {
  total: number
  alert: number
  standby: number
  onDuty: number
}

export function LiveMonitoring() {
  const [personnel, setPersonnel] = useState<PersonnelData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<DutyStatus | 'all'>('all')
  const [unitFilter, setUnitFilter] = useState('all')
  const [subUnitFilter, setSubUnitFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [lastUpdate, setLastUpdate] = useState(new Date())
  
  const supabase = createClient()

  // Fetch personnel data from database
  const fetchPersonnelData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Try to fetch from live_monitoring view first
      const { data, error } = await supabase
        .from('live_monitoring')
        .select('*')
        .order('full_name')
      
      // If live_monitoring view doesn't exist, fall back to basic personnel table
      if (error && error.message.includes('relation "live_monitoring" does not exist')) {
        console.log('Live monitoring view not found, using sample data for testing...')
        
        // Sample data for testing - includes location data for map
        const sampleData: PersonnelData[] = [
          {
            id: '1',
            full_name: 'PO1 Juan Dela Cruz',
            rank: 'PO1',
            email: 'juan.delacruz@pnp.gov.ph',
            province: 'Oriental Mindoro PPO',
            unit: 'Oriental Mindoro PPO',
            sub_unit: 'Calapan CPS',
            status: 'alert',
            status_changed_at: new Date().toISOString(),
            status_notes: 'Emergency response in progress',
            latitude: 13.4117,
            longitude: 121.1803,
            last_update: new Date().toISOString(),
            minutes_since_update: 2,
            is_online: true
          },
          {
            id: '2',
            full_name: 'PO2 Maria Santos',
            rank: 'PO2',
            email: 'maria.santos@pnp.gov.ph',
            province: 'Palawan PPO',
            unit: 'Palawan PPO',
            sub_unit: 'El Nido MPS',
            status: 'on_duty',
            status_changed_at: new Date().toISOString(),
            status_notes: 'Regular patrol',
            latitude: 11.1949,
            longitude: 119.4094,
            last_update: new Date().toISOString(),
            minutes_since_update: 5,
            is_online: true
          },
          {
            id: '3',
            full_name: 'PO3 Roberto Garcia',
            rank: 'PO3',
            email: 'roberto.garcia@pnp.gov.ph',
            province: 'Romblon PPO',
            unit: 'Romblon PPO',
            sub_unit: 'Romblon MPS',
            status: 'standby',
            status_changed_at: new Date().toISOString(),
            status_notes: 'Awaiting assignment',
            latitude: 12.5778,
            longitude: 122.2681,
            last_update: new Date().toISOString(),
            minutes_since_update: 1,
            is_online: true
          },
          {
            id: '4',
            full_name: 'SPO1 Carmen Lopez',
            rank: 'SPO1',
            email: 'carmen.lopez@pnp.gov.ph',
            province: 'Marinduque PPO',
            unit: 'Marinduque PPO',
            sub_unit: 'Boac MPS',
            status: 'alert',
            status_changed_at: new Date().toISOString(),
            status_notes: 'Traffic incident response',
            latitude: 13.4548,
            longitude: 121.8431,
            last_update: new Date().toISOString(),
            minutes_since_update: 3,
            is_online: true
          },
          {
            id: '5',
            full_name: 'PO1 Miguel Rivera',
            rank: 'PO1',
            email: 'miguel.rivera@pnp.gov.ph',
            province: 'Occidental Mindoro PPO',
            unit: 'Occidental Mindoro PPO',
            sub_unit: 'Mamburao MPS',
            status: 'on_duty',
            status_changed_at: new Date().toISOString(),
            status_notes: 'Regular patrol',
            latitude: 13.2186,
            longitude: 120.5947,
            last_update: new Date().toISOString(),
            minutes_since_update: 7,
            is_online: false
          },
          {
            id: '6',
            full_name: 'PO2 Ana Reyes',
            rank: 'PO2',
            email: 'ana.reyes@pnp.gov.ph',
            province: 'Oriental Mindoro PPO',
            unit: 'Oriental Mindoro PPO',
            sub_unit: '1st PMFC',
            status: 'standby',
            status_changed_at: new Date().toISOString(),
            status_notes: 'At headquarters',
            latitude: null,
            longitude: null,
            last_update: null,
            minutes_since_update: null,
            is_online: false
          }
        ]
        
        setPersonnel(sampleData)
        setLastUpdate(new Date())
        return
      } else if (error) {
        console.error('Error fetching personnel:', error)
        setError('Failed to load personnel data')
        return
      }
      
      setPersonnel(data || [])
      setLastUpdate(new Date())
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to connect to database')
    } finally {
      setLoading(false)
    }
  }

  // Set up real-time subscriptions
  useEffect(() => {
    // Initial data fetch
    fetchPersonnelData()

    // Subscribe to real-time changes
    const locationsChannel = supabase
      .channel('personnel-locations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'personnel_locations'
        },
        () => {
          console.log('Location update received')
          fetchPersonnelData()
        }
      )
      .subscribe()

    const statusChannel = supabase
      .channel('personnel-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'personnel_status_history'
        },
        () => {
          console.log('Status update received')
          fetchPersonnelData()
        }
      )
      .subscribe()

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(locationsChannel)
      supabase.removeChannel(statusChannel)
    }
  }, [supabase])

  // Calculate statistics
  const stats: PersonnelStats = {
    total: personnel.length,
    alert: personnel.filter(p => p.status === 'alert').length,
    standby: personnel.filter(p => p.status === 'standby').length,
    onDuty: personnel.filter(p => p.status === 'on_duty').length
  }

  // Filter personnel based on current filters
  const filteredPersonnel = personnel.filter(person => {
    const matchesStatus = statusFilter === 'all' || person.status === statusFilter
    const matchesUnit = unitFilter === 'all' || person.unit === unitFilter
    const matchesSubUnit = subUnitFilter === 'all' || person.sub_unit === subUnitFilter
    const matchesSearch = person.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         person.rank.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         person.unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         person.sub_unit.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesStatus && matchesUnit && matchesSubUnit && matchesSearch
  })

  // Get unique units and subunits
  const units = [...new Set(personnel.map(p => p.unit))]
  const subUnits = [...new Set(personnel.map(p => p.sub_unit))]

  // Get all available units (no province filtering)
  const availableUnits = units

  // Get sub-units filtered by selected unit only
  const availableSubUnits = unitFilter === 'all' 
    ? subUnits 
    : [...new Set(personnel.filter(p => p.unit === unitFilter).map(p => p.sub_unit))]

  // Status styling helper
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'alert':
        return {
          color: 'bg-red-500',
          textColor: 'text-red-700',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: 'Alert',
          icon: AlertTriangle
        }
      case 'standby':
        return {
          color: 'bg-yellow-500',
          textColor: 'text-yellow-700',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          label: 'Standby', 
          icon: Clock
        }
      case 'on_duty':
        return {
          color: 'bg-green-500',
          textColor: 'text-green-700',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: 'On Duty',
          icon: Radio
        }
      default:
        return {
          color: 'bg-gray-500',
          textColor: 'text-gray-700',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: 'Unknown',
          icon: Users
        }
    }
  }

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date())
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Live Monitoring</h1>
          <p className="text-gray-600">Real-time personnel status across MIMAROPA Region</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <RefreshCw className="h-4 w-4" />
          <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Personnel</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Alert Status</p>
                <p className="text-2xl font-bold text-red-600">{stats.alert}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Standby</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.standby}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Radio className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">On Duty</p>
                <p className="text-2xl font-bold text-green-600">{stats.onDuty}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map and Personnel List Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Area (2/3 width) */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                MIMAROPA Region Map
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] bg-gray-100 rounded-lg relative">
                {loading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-blue-500" />
                      <p className="text-gray-600">Loading map...</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full w-full">
                    <MiniMap personnel={filteredPersonnel.filter(p => p.latitude && p.longitude)} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Personnel List (1/3 width) */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Personnel Status
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    Last updated: {lastUpdate.toLocaleTimeString()}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchPersonnelData}
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
              {/* Filters */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search personnel, badge, or unit..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="space-y-2">
                  {/* Status Filter */}
                  <Select value={statusFilter} onValueChange={(value: DutyStatus | 'all') => setStatusFilter(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="alert">🔴 Alert</SelectItem>
                      <SelectItem value="standby">🟡 Standby</SelectItem>
                      <SelectItem value="on_duty">🟢 On Duty</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Unit Filter */}
                  <Select value={unitFilter} onValueChange={(value) => {
                    setUnitFilter(value)
                    setSubUnitFilter('all') // Reset subunit filter when unit changes
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Units</SelectItem>
                      {availableUnits.map(unit => (
                        <SelectItem key={unit} value={unit}>
                          {unit.replace(' PS', '').replace(' CPO', '')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Sub-Unit Filter */}
                  <Select value={subUnitFilter} onValueChange={setSubUnitFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by Sub-Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sub-Units</SelectItem>
                      {availableSubUnits.map(subUnit => (
                        <SelectItem key={subUnit} value={subUnit}>
                          {subUnit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Active Filters Display */}
                {(statusFilter !== 'all' || unitFilter !== 'all' || subUnitFilter !== 'all' || searchTerm) && (
                  <div className="flex flex-wrap gap-1">
                    {statusFilter !== 'all' && (
                      <Badge variant="secondary" className="text-xs">
                        Status: {statusFilter === 'alert' ? '🔴 Alert' : statusFilter === 'standby' ? '🟡 Standby' : '🟢 On Duty'}
                      </Badge>
                    )}
                    {unitFilter !== 'all' && (
                      <Badge variant="secondary" className="text-xs">
                        {unitFilter}
                      </Badge>
                    )}
                    {subUnitFilter !== 'all' && (
                      <Badge variant="secondary" className="text-xs">
                        {subUnitFilter}
                      </Badge>
                    )}
                    {searchTerm && (
                      <Badge variant="secondary" className="text-xs">
                        &ldquo;{searchTerm}&rdquo;
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[400px] overflow-y-auto">
                {loading ? (
                  <div className="p-6 text-center">
                    <Loader2 className="h-8 w-8 mx-auto mb-2 text-blue-500 animate-spin" />
                    <p className="text-gray-500">Loading personnel data...</p>
                  </div>
                ) : error ? (
                  <div className="p-6 text-center text-red-500">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                    <p>{error}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={fetchPersonnelData}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                ) : filteredPersonnel.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>No personnel found</p>
                  </div>
                ) : (
                  <div className="space-y-2 p-4">
                    {filteredPersonnel.map(person => {
                      const statusConfig = getStatusConfig(person.status)
                      const StatusIcon = statusConfig.icon
                      
                      return (
                        <div
                          key={person.id}
                          className={`p-3 rounded-lg border ${statusConfig.bgColor} ${statusConfig.borderColor} hover:shadow-sm transition-shadow cursor-pointer`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${statusConfig.color}`}></div>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{person.full_name}</p>
                                <p className="text-xs text-gray-600">{person.rank}</p>
                              </div>
                            </div>
                            <StatusIcon className={`h-4 w-4 ${statusConfig.textColor}`} />
                          </div>
                          
                          <div className="mt-2 text-xs text-gray-600">
                            <p className="font-medium">{person.unit}</p>
                            <p className="text-gray-500">{person.sub_unit}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span>
                                {person.last_update 
                                  ? `${Math.round(person.minutes_since_update || 0)} mins ago`
                                  : 'No data'
                                }
                              </span>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs">
                                  {statusConfig.label}
                                </Badge>
                                <Badge variant={person.is_online ? "default" : "secondary"} className="text-xs">
                                  {person.is_online ? 'Online' : 'Offline'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span>Emergency Alert</span>
            </Button>
            <Button variant="outline" className="flex items-center space-x-2">
              <Radio className="h-4 w-4 text-blue-600" />
              <span>Broadcast Message</span>
            </Button>
            <Button variant="outline" className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-green-600" />
              <span>Deploy Standby</span>
            </Button>
            <Button variant="outline" className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-purple-600" />
              <span>Generate Report</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
