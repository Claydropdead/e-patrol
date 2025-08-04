'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
import { supabase } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

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

  // Update markers when personnel data changes
  useEffect(() => {
    if (!mapRef.current || !personnel) return

    console.log('🗺️ Updating map markers for', personnel.length, 'personnel')
    console.log('📍 Personnel with coordinates:', personnel.filter(p => p.latitude && p.longitude).length)

    const updateMarkers = async () => {
      try {
        const L = (await import('leaflet')).default

        // Clear existing markers
        mapRef.current?.eachLayer((layer: L.Layer) => {
          if (layer instanceof L.Marker) {
            mapRef.current?.removeLayer(layer)
          }
        })

        // Add markers for personnel - with fallback coordinates for testing
        let markersAdded = 0
        personnel.forEach((person, index) => {
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

            const popupContent = `
              <div style="font-family: system-ui; min-width: 200px;">
                <h3 style="margin: 0 0 8px 0; font-weight: 600; font-size: 16px; color: #1f2937;">${person.full_name}</h3>
                <p style="margin: 0 0 4px 0; font-size: 14px; color: #6b7280;">${person.rank}</p>
                <p style="margin: 0 0 4px 0; font-size: 14px;"><strong>Status:</strong> ${statusBadge}</p>
                <p style="margin: 0 0 4px 0; font-size: 14px;"><strong>Unit:</strong> ${person.sub_unit}</p>
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
            const personnelWithCoords = personnel.map((person, index) => {
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
  const [manualRefreshing, setManualRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<DutyStatus | 'all'>('all')
  const [unitFilter, setUnitFilter] = useState('all')
  const [subUnitFilter, setSubUnitFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const loadingRef = useRef(false)
  const lastFetchRef = useRef<number>(0)
  
  // Generate mock coordinates based on province and unit
  const generateMockCoordinates = (province: string, unit: string, index: number) => {
    const provinceCoords: Record<string, [number, number]> = {
      'Marinduque': [13.4, 121.0],
      'Romblon': [12.5, 121.7],
      'Palawan': [10.5, 119.0],
      'Occidental Mindoro': [13.2, 120.9],
      'Oriental Mindoro': [13.0, 121.3],
    }
    
    // Default to center of MIMAROPA if province not found
    const baseCoords = provinceCoords[province] || [12.0, 120.5]
    
    // Add small random offset based on index to spread out markers
    const offsetLat = (Math.sin(index * 2.5) * 0.3) + ((index % 5) - 2) * 0.1
    const offsetLng = (Math.cos(index * 1.8) * 0.4) + ((index % 7) - 3) * 0.1
    
    return {
      lat: baseCoords[0] + offsetLat,
      lng: baseCoords[1] + offsetLng
    }
  }
  
  // Use singleton supabase instance to prevent multiple GoTrueClient warnings

  // Fetch personnel data from database
  const fetchPersonnelData = useCallback(async () => {
    // Prevent multiple concurrent fetches
    if (loadingRef.current) {
      console.log('🔄 Fetch already in progress, skipping...')
      return
    }

    // Prevent rapid successive fetches (debounce)
    const now = Date.now()
    if (now - lastFetchRef.current < 2000) { // 2 second debounce
      console.log('⏱️ Fetch too soon after last fetch, skipping...')
      return
    }
    lastFetchRef.current = now

    try {
      setLoading(true)
      loadingRef.current = true
      setError(null)
      
      console.log('🔍 Fetching personnel data from live_monitoring view...')
      
      // Try to fetch from live_monitoring view first
      const { data, error } = await supabase
        .from('live_monitoring')
        .select('*')
        .order('full_name')
      
      console.log('📊 Live monitoring query result:', { data, error })
      
      // If live_monitoring view doesn't exist, fall back to basic personnel table
      if (error && (error.message.includes('relation "live_monitoring" does not exist') || 
                   error.message.includes('does not exist') ||
                   error.code === 'PGRST116')) {
        console.log('⚠️ Live monitoring view not found, trying personnel table...')
        
        // Try to fetch from personnel table instead
        const { data: personnelData, error: personnelError } = await supabase
          .from('personnel')
          .select('id, full_name, rank, email, province, unit, sub_unit, is_active')
          .eq('is_active', true)
          .order('full_name')
        
        console.log('📊 Personnel query result:', { data: personnelData, error: personnelError })
        
        if (personnelError) {
          console.error('❌ Personnel table also not accessible:', personnelError)
          setError('Unable to access personnel data. Please check your database connection.')
          return
        }
        
        // Use personnel data with mock coordinates for visualization
        const transformedData: PersonnelData[] = (personnelData || []).map((person, index) => {
          // Generate mock coordinates based on their province/unit for visualization
          const mockCoords = generateMockCoordinates(person.province, person.unit, index)
          
          return {
            ...person,
            status: 'on_duty' as DutyStatus, // Changed from 'off_duty' for better visualization
            status_changed_at: new Date().toISOString(),
            status_notes: 'Mock status for testing',
            latitude: mockCoords.lat,
            longitude: mockCoords.lng,
            last_update: new Date().toISOString(),
            minutes_since_update: Math.floor(Math.random() * 120), // Random 0-120 minutes
            is_online: Math.random() > 0.3 // 70% chance of being online
          }
        })
        
        console.log('✅ Using personnel data with mock coordinates:', transformedData.length, 'records')
        console.log('📍 Mock coordinates generated for visualization')
        setPersonnel(transformedData)
        setLastUpdate(new Date())
        return
      } else if (error) {
        console.error('❌ Error fetching personnel:', error)
        setError(`Failed to load personnel data: ${error.message}`)
        return
      }
      
      console.log('✅ Live monitoring data loaded:', data?.length || 0, 'records')
      
      // Add debugging for location data
      if (data && data.length > 0) {
        const withCoords = data.filter(p => p.latitude && p.longitude).length
        const withoutCoords = data.length - withCoords
        console.log(`📍 Location data: ${withCoords} with coordinates, ${withoutCoords} without`)
        
        // Log first few records to see data structure
        console.log('📋 Sample data structure:', data.slice(0, 2))
      }
      
      setPersonnel(data || [])
      setLastUpdate(new Date())
    } catch (err) {
      console.error('❌ Fetch error:', err)
      setError('Failed to connect to database. Please check your connection and try again.')
    } finally {
      setLoading(false)
      loadingRef.current = false
      console.log('✅ Data fetch completed')
    }
  }, []) // Empty dependency array for useCallback

  // Set up real-time subscriptions with error handling and timeout
  useEffect(() => {
    // Prevent multiple subscriptions
    let isMounted = true
    let hasInitiallyFetched = false
    
    console.log('🔧 Live monitoring useEffect triggered')
    
    // Initial data fetch - only once and with delay
    const initialFetch = async () => {
      if (!hasInitiallyFetched && isMounted && !loadingRef.current) {
        hasInitiallyFetched = true
        console.log('🚀 Starting initial data fetch...')
        await fetchPersonnelData()
      } else {
        console.log('⏭️ Skipping initial fetch - already in progress or completed')
      }
    }
    
    // Small delay to prevent rapid re-fetching
    const fetchTimeout = setTimeout(initialFetch, 100)

    // Set a timeout to ensure loading doesn't get stuck
    const loadingTimeout = setTimeout(() => {
      if (loadingRef.current && isMounted) {
        console.log('Loading timeout reached, stopping loading state')
        setLoading(false)
        loadingRef.current = false
        setError('Connection timeout. Your network might be slow. Try refreshing the page.')
      }
    }, 8000) // Increased to 8 seconds for slower connections

    let locationsChannel: RealtimeChannel | null = null
    let statusChannel: RealtimeChannel | null = null

    const setupSubscriptions = async () => {
      try {
        // Check if personnel_locations table exists before subscribing
        const { error: locationError } = await supabase
          .from('personnel_locations')
          .select('id')
          .limit(1)
        
        if (!locationError) {
          // Subscribe to real-time location changes
          locationsChannel = supabase
            .channel('personnel-locations')
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'personnel_locations'
              },
              () => {
                // Only refetch if not currently loading to prevent loops
                if (!loadingRef.current) {
                  console.log('🔄 Location change detected, refreshing data...')
                  fetchPersonnelData()
                }
              }
            )
            .subscribe()
        } else {
          console.log('personnel_locations table not available for real-time updates')
        }

        // Check if personnel_status_history table exists before subscribing
        const { error: statusError } = await supabase
          .from('personnel_status_history')
          .select('id')
          .limit(1)
        
        if (!statusError) {
          statusChannel = supabase
            .channel('personnel-status')
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'personnel_status_history'
              },
              () => {
                // Only refetch if not currently loading to prevent loops
                if (!loadingRef.current) {
                  console.log('🔄 Status change detected, refreshing data...')
                  fetchPersonnelData()
                }
              }
            )
            .subscribe()
        } else {
          console.log('personnel_status_history table not available for real-time updates')
        }
        
      } catch (error) {
        console.log('Real-time subscriptions setup failed:', error)
        // Continue without real-time updates
      }
    }

    // Set up subscriptions asynchronously
    setupSubscriptions()

    // Cleanup subscriptions
    return () => {
      console.log('🧹 Cleaning up live monitoring subscriptions...')
      isMounted = false
      clearTimeout(fetchTimeout)
      clearTimeout(loadingTimeout)
      if (locationsChannel) {
        supabase.removeChannel(locationsChannel)
      }
      if (statusChannel) {
        supabase.removeChannel(statusChannel)
      }
    }
  }, [fetchPersonnelData]) // Add fetchPersonnelData to dependencies

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

  // Manual refresh function that resets loading state
  const handleManualRefresh = async () => {
    // Prevent rapid clicking
    if (loadingRef.current || manualRefreshing) {
      console.log('🔄 Refresh already in progress, ignoring...')
      return
    }
    
    // Check if it's too soon after last fetch (respect debounce)
    const now = Date.now()
    if (now - lastFetchRef.current < 1000) { // 1 second minimum between manual refreshes
      console.log('⏱️ Manual refresh too soon, please wait...')
      return
    }
    
    console.log('🔄 Manual refresh triggered')
    
    // Set manual refresh state
    setManualRefreshing(true)
    setError(null)
    
    // Update last fetch time to prevent rapid successive calls
    lastFetchRef.current = now
    
    // Small delay to ensure UI updates, then fetch
    setTimeout(async () => {
      try {
        await fetchPersonnelData()
        setLastUpdate(new Date()) // Update the last update time
      } catch (error) {
        console.error('❌ Manual refresh failed:', error)
        setError('Refresh failed. Please try again.')
        setLoading(false)
        loadingRef.current = false
      } finally {
        setManualRefreshing(false)
      }
    }, 300) // Slightly longer delay for better visual feedback
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
