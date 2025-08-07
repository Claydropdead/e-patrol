'use client'

import React, { useState, useEffect, useRef } from 'react'
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

// Mini map component for Live Monitoring
function MiniMap({ personnel, beats }: { personnel: PersonnelData[], beats: any[] }) {
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

        // Add tile layer with better contrast
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
          maxZoom: 18,
          minZoom: 6
        }).addTo(newMap)

        // Add custom CSS for markers
        const style = document.createElement('style')
        style.textContent = `
          .custom-mini-marker {
            z-index: 1000 !important;
          }
          .custom-mini-marker div {
            transition: all 0.2s ease;
          }
          .custom-mini-marker:hover div {
            transform: scale(1.2);
            box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
          }
        `
        document.head.appendChild(style)

        mapRef.current = newMap
        console.log('🗺️ Mini map initialized successfully')

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

  // Update markers when personnel data or beats change
  useEffect(() => {
    if (!mapRef.current || !personnel) return

    console.log('🗺️ Updating map markers for', personnel.length, 'total personnel')
    console.log('📍 On-duty personnel with coordinates:', personnel.filter(p => p.latitude && p.longitude && p.status === 'on_duty').length)

    const updateMarkers = async () => {
      try {
        const L = (await import('leaflet')).default

        // Clear existing markers and circles
        mapRef.current?.eachLayer((layer: L.Layer) => {
          if (layer instanceof L.Marker || layer instanceof L.Circle) {
            mapRef.current?.removeLayer(layer)
          }
        })

        // Add markers for personnel - only show on_duty status
        let markersAdded = 0

        // First, add all beats to the map
        if (beats && beats.length > 0) {
          beats.forEach((beat) => {
            const beatLat = beat.center_lat
            const beatLng = beat.center_lng
            const beatRadius = beat.radius_meters || 500

            // Create beat center marker (blue circle)
            const beatIcon = L.divIcon({
              html: `
                <div style="
                  background-color: #3b82f6;
                  width: 12px;
                  height: 12px;
                  border-radius: 50%;
                  border: 2px solid white;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                  position: relative;
                  z-index: 999;
                "></div>
              `,
              className: 'beat-center-marker',
              iconSize: [12, 12],
              iconAnchor: [6, 6]
            })

            const beatMarker = L.marker([beatLat, beatLng], { icon: beatIcon })
              .addTo(mapRef.current!)

            // Add beat radius circle
            const beatCircle = L.circle([beatLat, beatLng], {
              radius: beatRadius,
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.1,
              weight: 2,
              dashArray: '5, 5'
            }).addTo(mapRef.current!)

            const beatPopupContent = `
              <div style="font-family: system-ui; min-width: 250px;">
                <h3 style="margin: 0 0 8px 0; font-weight: 600; font-size: 16px; color: #1f2937;">📍 ${beat.name}</h3>
                <p style="margin: 0 0 4px 0; font-size: 14px; color: #6b7280;"><strong>Beat Center Location</strong></p>
                <p style="margin: 0 0 4px 0; font-size: 14px;"><strong>Unit:</strong> ${beat.unit} - ${beat.sub_unit}</p>
                <p style="margin: 0 0 4px 0; font-size: 14px;"><strong>Radius:</strong> ${beatRadius}m</p>
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #374151;">${beat.address || 'Beat area'}</p>
                <p style="margin: 0; font-size: 12px; color: #9ca3af; font-family: monospace;"><strong>Coordinates:</strong> ${beatLat.toFixed(6)}, ${beatLng.toFixed(6)}</p>
              </div>
            `

            beatMarker.bindPopup(beatPopupContent)
            beatCircle.bindPopup(beatPopupContent)
            
            console.log(`🎯 Added beat location for ${beat.name} at ${beatLat}, ${beatLng}`)
          })
        }

        // Then add personnel markers
        personnel.filter(person => person.status === 'on_duty').forEach((person, index) => {
          let lat = person.latitude
          let lng = person.longitude
          
          // For testing: Add mock coordinates if none exist
          if (!lat || !lng) {
            // Spread personnel across MIMAROPA region
            const baseCoords = [
              [13.4, 121.0], // Marinduque area
              [12.5, 121.7], // Romblon area  
              [11.5, 120.0], // Palawan north
              [9.5, 118.7],  // Palawan south
              [13.2, 120.9], // Occidental Mindoro
              [13.0, 121.3], // Oriental Mindoro
            ]
            const baseIndex = index % baseCoords.length
            lat = baseCoords[baseIndex][0] + (Math.random() - 0.5) * 0.2
            lng = baseCoords[baseIndex][1] + (Math.random() - 0.5) * 0.2
            
            console.log(`📍 Adding mock coordinates for ${person.full_name}: ${lat}, ${lng}`)
          }

          if (lat && lng) {
            const color = person.status === 'alert' ? '#ef4444' :
                         person.status === 'standby' ? '#f59e0b' :
                         person.status === 'on_duty' ? '#10b981' : '#6b7280'

            const customIcon = L.divIcon({
              html: `
                <div style="
                  background-color: ${color};
                  width: 16px;
                  height: 16px;
                  border-radius: 50%;
                  border: 3px solid white;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                  position: relative;
                  z-index: 1000;
                "></div>
              `,
              className: 'custom-mini-marker',
              iconSize: [16, 16],
              iconAnchor: [8, 8]
            })

            const marker = L.marker([lat, lng], { icon: customIcon })
              .addTo(mapRef.current!)

            markersAdded++

            const statusBadge = person.status === 'alert' ? '🔴 Alert' :
                               person.status === 'standby' ? '🟡 Standby' :
                               person.status === 'on_duty' ? '🟢 On Duty' : '⚫ Off Duty'

            const beatInfo = person.beat_name && person.status === 'on_duty' ? `
              <div style="margin: 8px 0; padding: 8px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px;">
                <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #1e40af;">📍 ${person.beat_name}</p>
                <p style="margin: 0 0 2px 0; font-size: 12px; color: #1e40af;">${person.unit} - ${person.sub_unit}</p>
                <p style="margin: 0 0 2px 0; font-size: 12px; color: #1e40af;">Radius: ${person.beat_radius}m</p>
                <p style="margin: 0; font-size: 12px; color: #374151;">${person.beat_location?.description}</p>
              </div>
            ` : ''

            const popupContent = `
              <div style="font-family: system-ui; min-width: 200px;">
                <h3 style="margin: 0 0 8px 0; font-weight: 600; font-size: 16px; color: #1f2937;">${person.full_name}</h3>
                <p style="margin: 0 0 4px 0; font-size: 14px; color: #6b7280;">${person.rank}</p>
                <p style="margin: 0 0 4px 0; font-size: 14px;"><strong>Status:</strong> ${statusBadge}</p>
                <p style="margin: 0 0 4px 0; font-size: 14px;"><strong>Unit:</strong> ${person.unit} - ${person.sub_unit}</p>
                ${beatInfo}
                <p style="margin: 0; font-size: 12px; color: #9ca3af;">Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}</p>
              </div>
            `

            marker.bindPopup(popupContent)
          }
        })

        console.log('✅ Added', markersAdded, 'markers to map')

        // Fit map to show all markers after a short delay
        if (markersAdded > 0) {
          setTimeout(() => {
            const personnelWithCoords = personnel.filter(person => person.status === 'on_duty').map((person, index) => {
              let lat = person.latitude
              let lng = person.longitude
              
              if (!lat || !lng) {
                const baseCoords = [
                  [13.4, 121.0], [12.5, 121.7], [11.5, 120.0], 
                  [9.5, 118.7], [13.2, 120.9], [13.0, 121.3]
                ]
                const baseIndex = index % baseCoords.length
                lat = baseCoords[baseIndex][0] + (Math.random() - 0.5) * 0.2
                lng = baseCoords[baseIndex][1] + (Math.random() - 0.5) * 0.2
              }
              
              return L.latLng(lat!, lng!)
            })
            
            if (personnelWithCoords.length > 0) {
              const bounds = L.latLngBounds(personnelWithCoords)
              mapRef.current?.fitBounds(bounds.pad(0.1))
              console.log('🎯 Map fitted to bounds with', personnelWithCoords.length, 'points')
            }
          }, 500)
        }

      } catch (error) {
        console.error('Error updating markers:', error)
      }
    }

    updateMarkers()
  }, [personnel, beats]) // mapRef doesn't need to be in dependencies

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    )
  }

  return <div id="mini-map" className="h-full w-full rounded-lg" />
}

// Types for mock data
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
  // Beat information
  beat_name?: string
  beat_radius?: number // in meters
  beat_location?: {
    center_lat: number
    center_lng: number
    description: string
  }
}

type DutyStatus = 'alert' | 'standby' | 'on_duty'

interface PersonnelStats {
  total: number
  alert: number
  standby: number
  onDuty: number
}

// Mock personnel data
const mockPersonnelData: PersonnelData[] = [
  {
    id: '1',
    full_name: 'PO1 Juan Cruz',
    rank: 'PO1',
    email: 'juan.cruz@pnp.gov.ph',
    province: 'Oriental Mindoro',
    unit: 'Oriental Mindoro PPO',
    sub_unit: 'Calapan CPS',
    status: 'on_duty',
    status_changed_at: '2024-12-28T08:30:00Z',
    status_notes: 'On patrol',
    latitude: 13.4119,
    longitude: 121.1805,
    last_update: '2024-12-28T08:30:00Z',
    minutes_since_update: 5,
    is_online: true,
    beat_name: 'Calapan Downtown Beat',
    beat_radius: 500,
    beat_location: {
      center_lat: 13.4119,
      center_lng: 121.1805,
      description: 'Central business district including city hall, market area, and main commercial streets'
    }
  },
  {
    id: '2',
    full_name: 'PO2 Maria Santos',
    rank: 'PO2',
    email: 'maria.santos@pnp.gov.ph',
    province: 'Oriental Mindoro',
    unit: 'Oriental Mindoro PPO',
    sub_unit: 'Baco MPS',
    status: 'on_duty',
    status_changed_at: '2024-12-28T08:15:00Z',
    status_notes: 'Traffic duty',
    latitude: 13.4125,
    longitude: 121.1810,
    last_update: '2024-12-28T08:28:00Z',
    minutes_since_update: 7,
    is_online: true,
    beat_name: 'Baco Highway Beat',
    beat_radius: 800,
    beat_location: {
      center_lat: 13.4125,
      center_lng: 121.1810,
      description: 'Major highway intersection with traffic control and vehicle checkpoints'
    }
  },
  {
    id: '3',
    full_name: 'SPO1 Carlos Reyes',
    rank: 'SPO1',
    email: 'carlos.reyes@pnp.gov.ph',
    province: 'Palawan',
    unit: 'Puerto Princesa CPO',
    sub_unit: 'Airport Security',
    status: 'alert',
    status_changed_at: '2024-12-28T08:00:00Z',
    status_notes: 'Emergency response',
    latitude: 9.7419,
    longitude: 118.7591,
    last_update: '2024-12-28T08:25:00Z',
    minutes_since_update: 10,
    is_online: true
  },
  {
    id: '4',
    full_name: 'PO1 Roberto Garcia',
    rank: 'PO1',
    email: 'roberto.garcia@pnp.gov.ph',
    province: 'Marinduque',
    unit: 'Marinduque PPO',
    sub_unit: 'Boac MPS',
    status: 'standby',
    status_changed_at: '2024-12-28T07:45:00Z',
    status_notes: 'Station duty',
    latitude: 13.4526,
    longitude: 121.8427,
    last_update: '2024-12-28T08:20:00Z',
    minutes_since_update: 15,
    is_online: true
  },
  {
    id: '5',
    full_name: 'PO2 Lisa Morales',
    rank: 'PO2',
    email: 'lisa.morales@pnp.gov.ph',
    province: 'Romblon',
    unit: 'Romblon PPO',
    sub_unit: 'Romblon MPS',
    status: 'on_duty',
    status_changed_at: '2024-12-28T07:30:00Z',
    status_notes: 'Harbor patrol',
    latitude: 12.5808,
    longitude: 122.2691,
    last_update: '2024-12-28T08:15:00Z',
    minutes_since_update: 20,
    is_online: true,
    beat_name: 'Romblon Port Beat',
    beat_radius: 600,
    beat_location: {
      center_lat: 12.5808,
      center_lng: 122.2691,
      description: 'Port area including ferry terminal, cargo facilities, and waterfront security'
    }
  },
  {
    id: '6',
    full_name: 'PO3 Mark Santos',
    rank: 'PO3',
    email: 'mark.santos@pnp.gov.ph',
    province: 'Occidental Mindoro',
    unit: 'Occidental Mindoro PPO',
    sub_unit: 'Mamburao MPS',
    status: 'on_duty',
    status_changed_at: '2024-12-28T07:00:00Z',
    status_notes: 'Road patrol',
    latitude: 13.2200,
    longitude: 120.6089,
    last_update: '2024-12-28T08:10:00Z',
    minutes_since_update: 25,
    is_online: true,
    beat_name: 'Mamburao Coastal Beat',
    beat_radius: 900,
    beat_location: {
      center_lat: 13.2200,
      center_lng: 120.6089,
      description: 'Coastal highway patrol covering main road network and beach area security'
    }
  },
  {
    id: '7',
    full_name: 'SPO2 Elena Cruz',
    rank: 'SPO2',
    email: 'elena.cruz@pnp.gov.ph',
    province: 'Palawan',
    unit: 'Palawan PPO',
    sub_unit: 'Brookes Point MPS',
    status: 'alert',
    status_changed_at: '2024-12-28T06:45:00Z',
    status_notes: 'Incident response',
    latitude: 8.7833,
    longitude: 117.8333,
    last_update: '2024-12-28T08:05:00Z',
    minutes_since_update: 30,
    is_online: false
  },
  {
    id: '8',
    full_name: 'PO1 Jose Reyes',
    rank: 'PO1',
    email: 'jose.reyes@pnp.gov.ph',
    province: 'Romblon',
    unit: 'Romblon PPO',
    sub_unit: 'Odiongan MPS',
    status: 'on_duty',
    status_changed_at: '2024-12-28T06:30:00Z',
    status_notes: 'Community patrol',
    latitude: 12.4028,
    longitude: 121.9694,
    last_update: '2024-12-28T08:00:00Z',
    minutes_since_update: 35,
    is_online: true,
    beat_name: 'Odiongan Town Center Beat',
    beat_radius: 750,
    beat_location: {
      center_lat: 12.4028,
      center_lng: 121.9694,
      description: 'Town center including municipal hall, church, school zone, and residential areas'
    }
  }
]

export function LiveMonitoring() {
  const [personnel, setPersonnel] = useState<PersonnelData[]>([])
  const [beats, setBeats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [manualRefreshing, setManualRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<DutyStatus | 'all'>('all')
  const [unitFilter, setUnitFilter] = useState('all')
  const [subUnitFilter, setSubUnitFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // Fetch personnel data from API
  const fetchPersonnelData = async () => {
    try {
      setError(null)
      
      // Fetch personnel status, locations, beat assignments, and all beats
      const [statusResponse, locationsResponse, beatPersonnelResponse, beatsResponse] = await Promise.all([
        fetch('/api/personnel/status'),
        fetch('/api/personnel/locations'),
        fetch('/api/beat-personnel'),
        fetch('/api/beats')
      ])
      
      if (!statusResponse.ok || !locationsResponse.ok || !beatPersonnelResponse.ok || !beatsResponse.ok) {
        throw new Error('Failed to fetch personnel data')
      }
      
      const statusData = await statusResponse.json()
      const locationData = await locationsResponse.json()
      const beatPersonnelData = await beatPersonnelResponse.json()
      const beatsData = await beatsResponse.json()
      
      // Store beats data for map display
      setBeats(beatsData)
      
      // Combine status, location, and beat assignment data
      const combinedData: PersonnelData[] = statusData.map((status: any) => {
        const location = locationData.find((loc: any) => loc.personnel_id === status.personnel_id)
        const beatAssignment = beatPersonnelData.find((bp: any) => bp.personnel_id === status.personnel_id)
        const personnel = status.personnel
        
        return {
          id: personnel.id,
          full_name: personnel.full_name,
          rank: personnel.rank,
          email: personnel.email || `${personnel.full_name.toLowerCase().replace(/\s+/g, '.')}@pnp.gov.ph`,
          province: personnel.unit?.includes('PPO') ? personnel.unit.replace(' PPO', '') : 'MIMAROPA',
          unit: personnel.unit,
          sub_unit: personnel.sub_unit,
          status: status.status,
          status_changed_at: status.status_changed_at,
          status_notes: status.status_notes,
          latitude: location?.latitude || null,
          longitude: location?.longitude || null,
          last_update: location?.updated_at || null,
          minutes_since_update: location?.updated_at ? 
            Math.floor((Date.now() - new Date(location.updated_at).getTime()) / (1000 * 60)) : null,
          is_online: !!location && location.updated_at && 
            (Date.now() - new Date(location.updated_at).getTime()) < 15 * 60 * 1000, // 15 minutes
          // Beat information from beat assignment
          beat_name: beatAssignment?.beats?.name || null,
          beat_radius: beatAssignment?.beats?.radius_meters || null,
          beat_location: beatAssignment?.beats ? {
            center_lat: beatAssignment.beats.center_lat,
            center_lng: beatAssignment.beats.center_lng,
            description: beatAssignment.beats.address || 'Beat area'
          } : undefined
        }
      })
      
      setPersonnel(combinedData)
      setLastUpdate(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  // Initial data load
  useEffect(() => {
    fetchPersonnelData()
  }, [])

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPersonnel(prev => prev.map(person => ({
        ...person,
        minutes_since_update: person.last_update ? 
          Math.floor((Date.now() - new Date(person.last_update).getTime()) / (1000 * 60)) : null,
        is_online: person.last_update ? 
          (Date.now() - new Date(person.last_update).getTime()) < 15 * 60 * 1000 : false
      })))
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPersonnelData()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // Manual refresh function
  const handleRefresh = async () => {
    setManualRefreshing(true)
    await fetchPersonnelData()
    setManualRefreshing(false)
  }

  // Calculate statistics
  const stats: PersonnelStats = {
    total: personnel.length,
    alert: personnel.filter(p => p.status === 'alert').length,
    standby: personnel.filter(p => p.status === 'standby').length,
    onDuty: personnel.filter(p => p.status === 'on_duty').length
  }

  // Filter personnel based on current filters
  const filteredPersonnel = personnel.filter(person => {
    if (!person || !person.id || !person.full_name) return false
    
    const matchesStatus = statusFilter === 'all' || person.status === statusFilter
    const matchesUnit = unitFilter === 'all' || person.unit === unitFilter
    const matchesSubUnit = subUnitFilter === 'all' || person.sub_unit === subUnitFilter
    const matchesSearch = (person.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (person.rank || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (person.unit || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (person.sub_unit || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesStatus && matchesUnit && matchesSubUnit && matchesSearch
  })

  // Get unique units and subunits
  const units = [...new Set(personnel.map(p => p.unit).filter(Boolean))]
  const subUnits = [...new Set(personnel.map(p => p.sub_unit).filter(Boolean))]

  // Get all available units
  const availableUnits = units

  // Get sub-units filtered by selected unit only
  const availableSubUnits = unitFilter === 'all' 
    ? subUnits 
    : [...new Set(personnel.filter(p => p.unit === unitFilter).map(p => p.sub_unit).filter(Boolean))]

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

  // Manual refresh function (mock)
  const handleManualRefresh = async () => {
    if (manualRefreshing) return
    
    setManualRefreshing(true)
    setError(null)
    
    // Simulate loading delay
    setTimeout(() => {
      // Simulate some random status changes
      setPersonnel(prev => prev.map(person => {
        const shouldChangeStatus = Math.random() > 0.8 // 20% chance
        if (shouldChangeStatus) {
          const statuses = ['alert', 'standby', 'on_duty']
          const currentIndex = statuses.indexOf(person.status)
          const newStatus = statuses[(currentIndex + 1) % statuses.length]
          
          // Define beat assignments for when personnel go on duty
          const beatAssignments: Record<string, { name: string, radius: number, description: string }> = {
            '1': { name: 'Calapan Downtown Beat', radius: 500, description: 'Central business district including city hall, market area, and main commercial streets' },
            '2': { name: 'Baco Highway Beat', radius: 800, description: 'Major highway intersection with traffic control and vehicle checkpoints' },
            '3': { name: 'Airport Security Perimeter', radius: 1000, description: 'Airport terminal and runway security with passenger screening areas' },
            '4': { name: 'Boac Municipal Beat', radius: 550, description: 'Municipal center including government offices and public market area' },
            '5': { name: 'Romblon Port Beat', radius: 600, description: 'Port area including ferry terminal, cargo facilities, and waterfront security' },
            '6': { name: 'Mamburao Coastal Beat', radius: 900, description: 'Coastal highway patrol covering main road network and beach area security' },
            '7': { name: 'Brookes Point Border Beat', radius: 750, description: 'Border security and checkpoint operations with rural patrol areas' },
            '8': { name: 'Odiongan Town Center Beat', radius: 750, description: 'Town center including municipal hall, church, school zone, and residential areas' }
          }

          const updatedPerson = {
            ...person,
            status: newStatus,
            status_changed_at: new Date().toISOString(),
            minutes_since_update: 0
          }

          // Add or remove beat information based on new status
          if (newStatus === 'on_duty' && person.latitude && person.longitude) {
            const beatInfo = beatAssignments[person.id]
            if (beatInfo) {
              updatedPerson.beat_name = beatInfo.name
              updatedPerson.beat_radius = beatInfo.radius
              updatedPerson.beat_location = {
                center_lat: person.latitude,
                center_lng: person.longitude,
                description: beatInfo.description
              }
            }
          } else if (newStatus !== 'on_duty') {
            // Remove beat information when not on duty
            delete updatedPerson.beat_name
            delete updatedPerson.beat_radius
            delete updatedPerson.beat_location
          }

          return updatedPerson
        }
        return person
      }))
      
      setLastUpdate(new Date())
      setManualRefreshing(false)
    }, 1000)
  }

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
                  <div className="h-full w-full relative">
                    <MiniMap 
                      personnel={filteredPersonnel.filter(p => p.latitude && p.longitude && p.status === 'on_duty')} 
                      beats={beats}
                    />
                    {/* Map Legend */}
                    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg border p-3 z-[1000]">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Map Legend</h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                          <span className="text-gray-700">Personnel Location</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full border border-white shadow-sm"></div>
                          <span className="text-gray-700">Beat Center</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-1 border-2 border-blue-500 border-dashed"></div>
                          <span className="text-gray-700">Beat Radius</span>
                        </div>
                      </div>
                    </div>
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
                  Personnel Live Location Tracking
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    Last updated: {lastUpdate.toLocaleTimeString()}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManualRefresh}
                    disabled={loading || manualRefreshing}
                    title={manualRefreshing ? "Refreshing..." : "Refresh personnel data"}
                  >
                    <RefreshCw className={`h-4 w-4 ${(loading || manualRefreshing) ? 'animate-spin' : ''}`} />
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
                      {availableUnits.map((unit, index) => (
                        <SelectItem key={unit || `unit-${index}`} value={unit || ''}>
                          {unit ? unit.replace(' PS', '').replace(' CPO', '') : 'Unknown Unit'}
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
                      {availableSubUnits.map((subUnit, index) => (
                        <SelectItem key={subUnit || `subunit-${index}`} value={subUnit || ''}>
                          {subUnit || 'Unknown Sub-Unit'}
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
                    <div className="space-y-2">
                      <p className="font-medium">{error}</p>
                      <p className="text-sm text-gray-500">
                        This can happen due to slow internet, database connection issues, or server problems.
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={handleManualRefresh}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                  </div>
                ) : filteredPersonnel.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>No personnel found</p>
                  </div>
                ) : (
                  <div className="space-y-2 p-4">
                    {filteredPersonnel.map((person, index) => {
                      const statusConfig = getStatusConfig(person.status)
                      const StatusIcon = statusConfig.icon
                      
                      return (
                        <div
                          key={person.id || `person-${index}`}
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
                            {person.beat_name && person.status === 'on_duty' && (
                              <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded text-blue-700">
                                <p className="font-semibold flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {person.beat_name}
                                </p>
                                <p className="text-xs">Radius: {person.beat_radius}m</p>
                                {person.beat_location && (
                                  <p className="text-xs font-mono bg-blue-100 px-1 py-0.5 rounded mt-1">
                                    📍 Beat Center: {person.beat_location.center_lat.toFixed(6)}, {person.beat_location.center_lng.toFixed(6)}
                                  </p>
                                )}
                                <p className="text-xs">{person.beat_location?.description}</p>
                              </div>
                            )}
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
                                  {person.is_online ? 'Location Sharing' : 'No Location'}
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
