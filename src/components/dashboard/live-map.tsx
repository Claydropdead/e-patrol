'use client'

import { useEffect, useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  MapPin, 
  RefreshCw, 
  Loader2, 
  AlertTriangle,
  Users,
  Clock,
  Radio
} from 'lucide-react'

// Types for map data
interface PersonnelLocation {
  id: string
  full_name: string
  rank: string
  province: string
  unit: string
  sub_unit: string
  status: string
  latitude: number
  longitude: number
  last_update: string | null
  minutes_since_update: number | null
  is_online: boolean
  accuracy?: number
}

// MIMAROPA region bounds for initial map view
const MIMAROPA_BOUNDS = {
  center: [12.0, 120.0] as [number, number], // Center of MIMAROPA
  zoom: 8
}

// Status color mapping
const getStatusColor = (status: string) => {
  switch (status) {
    case 'alert': return '#ef4444'     // red
    case 'standby': return '#f59e0b'   // amber  
    case 'on_duty': return '#10b981'   // green
    default: return '#6b7280'          // gray
  }
}

// Map component that only renders on client side
function MapComponent({ personnel, filteredPersonnel }: { personnel: PersonnelLocation[], filteredPersonnel: PersonnelLocation[] }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const mapRef = useRef<any>(null)

  useEffect(() => {
    // Only load map on client side
    if (typeof window !== 'undefined') {
      setIsLoaded(true)
    }
  }, [])

  if (!isLoaded) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-blue-500" />
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <LeafletMap personnel={personnel} filteredPersonnel={filteredPersonnel} />
    </div>
  )
}

// Separate Leaflet map component
function LeafletMap({ personnel, filteredPersonnel }: { personnel: PersonnelLocation[], filteredPersonnel: PersonnelLocation[] }) {
  const mapRef = useRef<any>(null)

  useEffect(() => {
    let map: any = null
    let L: any = null

    const initMap = async () => {
      try {
        // Dynamic import of Leaflet
        L = (await import('leaflet')).default
        const { MapContainer, TileLayer, Marker, Popup } = await import('react-leaflet')

        // Fix for default markers
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        })

        // Create map
        map = L.map('live-map').setView(MIMAROPA_BOUNDS.center, MIMAROPA_BOUNDS.zoom)

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map)

        // Add markers for personnel
        filteredPersonnel.forEach((person) => {
          if (person.latitude && person.longitude) {
            const color = getStatusColor(person.status)
            const opacity = person.is_online ? 1 : 0.5

            const customIcon = L.divIcon({
              html: `
                <div style="
                  background-color: ${color};
                  width: 16px;
                  height: 16px;
                  border-radius: 50%;
                  border: 3px solid white;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                  opacity: ${opacity};
                  display: flex;
                  align-items: center;
                  justify-content: center;
                ">
                  <div style="
                    width: 6px;
                    height: 6px;
                    background-color: white;
                    border-radius: 50%;
                  "></div>
                </div>
              `,
              className: 'custom-marker',
              iconSize: [16, 16],
              iconAnchor: [8, 8]
            })

            const marker = L.marker([person.latitude, person.longitude], { icon: customIcon })
              .addTo(map)

            const statusBadge = person.status === 'alert' ? '🔴 Alert' :
                               person.status === 'standby' ? '🟡 Standby' :
                               person.status === 'on_duty' ? '🟢 On Duty' : '⚫ Off Duty'

            const onlineStatus = person.is_online ? '🟢 Online' : '🔴 Offline'

            const popupContent = `
              <div style="min-width: 200px; font-family: system-ui;">
                <div style="margin-bottom: 8px;">
                  <h3 style="margin: 0; font-weight: 600; color: #1f2937;">${person.full_name}</h3>
                  <p style="margin: 0; font-size: 14px; color: #6b7280;">${person.rank}</p>
                </div>
                
                <div style="font-size: 14px; line-height: 1.4;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="color: #6b7280;">Status:</span>
                    <span style="font-weight: 500;">${statusBadge}</span>
                  </div>
                  
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="color: #6b7280;">Online:</span>
                    <span style="font-weight: 500;">${onlineStatus}</span>
                  </div>
                  
                  <div style="margin-bottom: 4px;">
                    <p style="margin: 0; color: #6b7280;">Unit: <span style="font-weight: 500; color: #1f2937;">${person.unit}</span></p>
                    <p style="margin: 0; color: #6b7280;">Sub-unit: <span style="font-weight: 500; color: #1f2937;">${person.sub_unit}</span></p>
                  </div>
                  
                  ${person.last_update ? `
                    <div style="display: flex; align-items: center; color: #6b7280; font-size: 12px; margin-top: 8px;">
                      <span>⏱️ Last update: ${Math.round(person.minutes_since_update || 0)} mins ago</span>
                    </div>
                  ` : ''}
                  
                  ${person.accuracy ? `
                    <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 12px;">
                      Accuracy: ±${person.accuracy}m
                    </p>
                  ` : ''}
                </div>
              </div>
            `

            marker.bindPopup(popupContent)
          }
        })

        mapRef.current = map

      } catch (error) {
        console.error('Error initializing map:', error)
      }
    }

    initMap()

    return () => {
      if (map) {
        map.remove()
      }
    }
  }, [filteredPersonnel])

  return <div id="live-map" className="h-full w-full" />
}

export function LiveMap() {
  const [personnel, setPersonnel] = useState<PersonnelLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [unitFilter, setUnitFilter] = useState<string>('all')
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const mapRef = useRef<any>(null)
  
  const supabase = createClientComponentClient()

  // Fetch personnel location data
  const fetchPersonnelLocations = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Try to fetch from live_monitoring view first
      let { data, error } = await supabase
        .from('live_monitoring')
        .select('*')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
      
      // Fallback to basic data if view doesn't exist, or use sample data for testing
      if (error && error.message.includes('relation "live_monitoring" does not exist')) {
        console.log('Live monitoring view not found, using sample data for testing...')
        
        // Sample data for testing the map
        const sampleData: PersonnelLocation[] = [
          {
            id: '1',
            full_name: 'PO1 Juan Dela Cruz',
            rank: 'PO1',
            province: 'Oriental Mindoro PPO',
            unit: 'Oriental Mindoro PPO',
            sub_unit: 'Calapan CPS',
            status: 'alert',
            latitude: 13.4117,
            longitude: 121.1803,
            last_update: new Date().toISOString(),
            minutes_since_update: 2,
            is_online: true,
            accuracy: 10
          },
          {
            id: '2',
            full_name: 'PO2 Maria Santos',
            rank: 'PO2',
            province: 'Palawan PPO',
            unit: 'Palawan PPO',
            sub_unit: 'El Nido MPS',
            status: 'on_duty',
            latitude: 11.1949,
            longitude: 119.4094,
            last_update: new Date().toISOString(),
            minutes_since_update: 5,
            is_online: true,
            accuracy: 15
          },
          {
            id: '3',
            full_name: 'PO3 Roberto Garcia',
            rank: 'PO3',
            province: 'Romblon PPO',
            unit: 'Romblon PPO',
            sub_unit: 'Romblon MPS',
            status: 'standby',
            latitude: 12.5778,
            longitude: 122.2681,
            last_update: new Date().toISOString(),
            minutes_since_update: 1,
            is_online: true,
            accuracy: 8
          },
          {
            id: '4',
            full_name: 'SPO1 Carmen Lopez',
            rank: 'SPO1',
            province: 'Marinduque PPO',
            unit: 'Marinduque PPO',
            sub_unit: 'Boac MPS',
            status: 'alert',
            latitude: 13.4548,
            longitude: 121.8431,
            last_update: new Date().toISOString(),
            minutes_since_update: 3,
            is_online: true,
            accuracy: 12
          },
          {
            id: '5',
            full_name: 'PO1 Miguel Rivera',
            rank: 'PO1',
            province: 'Occidental Mindoro PPO',
            unit: 'Occidental Mindoro PPO',
            sub_unit: 'Mamburao MPS',
            status: 'on_duty',
            latitude: 13.2186,
            longitude: 120.5947,
            last_update: new Date().toISOString(),
            minutes_since_update: 7,
            is_online: false,
            accuracy: 20
          }
        ]
        
        setPersonnel(sampleData)
        setLastUpdate(new Date())
        return
      } else if (error) {
        console.error('Error fetching personnel locations:', error)
        setError('Failed to load personnel locations')
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
    fetchPersonnelLocations()

    // Subscribe to location updates
    const locationsChannel = supabase
      .channel('map-locations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'personnel_locations'
        },
        () => {
          console.log('Location update received - refreshing map')
          fetchPersonnelLocations()
        }
      )
      .subscribe()

    const statusChannel = supabase
      .channel('map-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'personnel_status_history'
        },
        () => {
          console.log('Status update received - refreshing map')
          fetchPersonnelLocations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(locationsChannel)
      supabase.removeChannel(statusChannel)
    }
  }, [supabase])

  // Filter personnel based on current filters
  const filteredPersonnel = personnel.filter(person => {
    const matchesStatus = statusFilter === 'all' || person.status === statusFilter
    const matchesUnit = unitFilter === 'all' || person.unit === unitFilter
    return matchesStatus && matchesUnit
  })

  // Get unique units for filter
  const units = [...new Set(personnel.map(p => p.unit))]

  // Calculate statistics
  const stats = {
    total: filteredPersonnel.length,
    online: filteredPersonnel.filter(p => p.is_online).length,
    alert: filteredPersonnel.filter(p => p.status === 'alert').length,
    onDuty: filteredPersonnel.filter(p => p.status === 'on_duty').length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Live Personnel Map</h2>
          <p className="text-gray-600">Real-time location tracking across MIMAROPA Region</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPersonnelLocations}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <MapPin className="h-5 w-5 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm text-gray-600">On Map</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Radio className="h-5 w-5 text-green-600" />
              <div className="ml-2">
                <p className="text-sm text-gray-600">Online</p>
                <p className="text-xl font-bold text-green-600">{stats.online}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div className="ml-2">
                <p className="text-sm text-gray-600">Alert</p>
                <p className="text-xl font-bold text-red-600">{stats.alert}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm text-gray-600">On Duty</p>
                <p className="text-xl font-bold text-blue-600">{stats.onDuty}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="alert">🔴 Alert</SelectItem>
              <SelectItem value="standby">🟡 Standby</SelectItem>
              <SelectItem value="on_duty">🟢 On Duty</SelectItem>
              <SelectItem value="off_duty">⚫ Off Duty</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
          <Select value={unitFilter} onValueChange={setUnitFilter}>
            <SelectTrigger className="w-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Units</SelectItem>
              {units.map(unit => (
                <SelectItem key={unit} value={unit}>{unit}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Map */}
      <Card>
        <CardContent className="p-0">
          <div className="h-[600px] relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-blue-500" />
                  <p className="text-gray-600">Loading map data...</p>
                </div>
              </div>
            ) : error ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="text-center text-red-500">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                  <p className="mb-2">{error}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchPersonnelLocations}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              </div>
            ) : (
              <MapComponent personnel={personnel} filteredPersonnel={filteredPersonnel} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Map Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow"></div>
              <span className="text-sm">Alert Status</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-amber-500 border-2 border-white shadow"></div>
              <span className="text-sm">Standby Status</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow"></div>
              <span className="text-sm">On Duty Status</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-gray-500 border-2 border-white shadow opacity-50"></div>
              <span className="text-sm">Offline Personnel</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
