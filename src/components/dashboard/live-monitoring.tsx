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
  Loader2,
  Navigation
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Mini map component for Live Monitoring
function MiniMap({ personnel, beats, onMapReady }: { 
  personnel: PersonnelData[], 
  beats: Record<string, unknown>[], 
  onMapReady?: (map: L.Map) => void 
}) {
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
        // Small delay to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 100))
        
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
        if (!mapContainer || mapContainer.offsetWidth === 0 || mapContainer.offsetHeight === 0) {
          console.warn('Map container not ready, retrying...')
          setTimeout(initMap, 100)
          return
        }

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

        // Define multiple terrain layers
        const baseLayers = {
          'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
            maxZoom: 18,
            minZoom: 6
          }),
          'Satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
            maxZoom: 18,
            minZoom: 6
          }),
          'Terrain': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors',
            maxZoom: 17,
            minZoom: 6
          }),
          'Dark Mode': L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.carto.com/">CARTO</a>',
            maxZoom: 18,
            minZoom: 6
          }),
          'Light Mode': L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.carto.com/">CARTO</a>',
            maxZoom: 18,
            minZoom: 6
          })
        }

        // Add default layer (OpenStreetMap)
        baseLayers['OpenStreetMap'].addTo(newMap)

        // Add layer control for switching between terrains - positioned on left side
        const layerControl = L.control.layers(baseLayers, {}, { 
          position: 'topleft',
          collapsed: false 
        }).addTo(newMap)

        // Add custom styling to the layer control
        const styleElement = document.createElement('style')
        styleElement.textContent = `
          .leaflet-control-layers {
            margin-top: 10px !important;
            margin-left: 10px !important;
            background: rgba(255, 255, 255, 0.95) !important;
            border-radius: 8px !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
            padding: 8px !important;
            font-size: 12px !important;
            max-width: 200px !important;
          }
          .leaflet-control-layers-base label {
            margin: 4px 0 !important;
            font-weight: 500 !important;
            cursor: pointer !important;
            display: flex !important;
            align-items: center !important;
          }
          .leaflet-control-layers-base input {
            margin-right: 6px !important;
          }
        `
        document.head.appendChild(styleElement)

        // Add fullscreen control
        const FullscreenControl = L.Control.extend({
          options: {
            position: 'topleft'
          },
          
          onAdd: function(map: L.Map) {
            const div = L.DomUtil.create('div', 'leaflet-control-fullscreen')
            div.innerHTML = `
              <button type="button" class="leaflet-control-fullscreen-button" title="Toggle Fullscreen" style="
                background: white;
                border: 2px solid rgba(0,0,0,0.2);
                border-radius: 4px;
                width: 30px;
                height: 30px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                box-shadow: 0 1px 5px rgba(0,0,0,0.4);
              ">
                ⛶
              </button>
            `

            const button = div.querySelector('.leaflet-control-fullscreen-button') as HTMLButtonElement
            
            button?.addEventListener('click', () => {
              const mapContainer = document.getElementById('mini-map')
              if (!mapContainer) return

              if (!document.fullscreenElement) {
                // Enter fullscreen
                mapContainer.requestFullscreen().then(() => {
                  mapContainer.style.position = 'fixed'
                  mapContainer.style.top = '0'
                  mapContainer.style.left = '0'
                  mapContainer.style.width = '100vw'
                  mapContainer.style.height = '100vh'
                  mapContainer.style.zIndex = '9999'
                  button.innerHTML = '⛷'
                  button.title = 'Exit Fullscreen'
                  
                  // Invalidate map size to refresh
                  setTimeout(() => {
                    if (newMap && newMap.getContainer()) {
                      try {
                        newMap.invalidateSize()
                      } catch (error) {
                        console.error('Error invalidating map size:', error)
                      }
                    }
                  }, 100)
                }).catch(err => {
                  console.error('Error entering fullscreen:', err)
                })
              } else {
                // Exit fullscreen
                document.exitFullscreen().then(() => {
                  mapContainer.style.position = ''
                  mapContainer.style.top = ''
                  mapContainer.style.left = ''
                  mapContainer.style.width = ''
                  mapContainer.style.height = ''
                  mapContainer.style.zIndex = ''
                  button.innerHTML = '⛶'
                  button.title = 'Toggle Fullscreen'
                  
                  // Invalidate map size to refresh
                  setTimeout(() => {
                    if (newMap && newMap.getContainer()) {
                      try {
                        newMap.invalidateSize()
                      } catch (error) {
                        console.error('Error invalidating map size:', error)
                      }
                    }
                  }, 100)
                }).catch(err => {
                  console.error('Error exiting fullscreen:', err)
                })
              }
            })

            return div
          }
        })

        const fullscreenControl = new FullscreenControl()

        fullscreenControl.addTo(newMap)

        // Handle fullscreen change events (ESC key, etc.)
        document.addEventListener('fullscreenchange', () => {
          const mapContainer = document.getElementById('mini-map')
          const button = document.querySelector('.leaflet-control-fullscreen-button') as HTMLButtonElement
          
          if (!document.fullscreenElement && mapContainer && button) {
            // Reset styles when exiting fullscreen
            mapContainer.style.position = ''
            mapContainer.style.top = ''
            mapContainer.style.left = ''
            mapContainer.style.width = ''
            mapContainer.style.height = ''
            mapContainer.style.zIndex = ''
            button.innerHTML = '⛶'
            button.title = 'Toggle Fullscreen'
            
            // Invalidate map size to refresh
            setTimeout(() => {
              if (newMap && newMap.getContainer()) {
                try {
                  newMap.invalidateSize()
                } catch (error) {
                  console.error('Error invalidating map size:', error)
                }
              }
            }, 100)
          }
        })

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

        // Ensure map size is correct after initialization
        setTimeout(() => {
          try {
            if (newMap && newMap.getContainer() && newMap.getContainer().offsetWidth > 0) {
              newMap.invalidateSize()
            }
          } catch (e) {
            console.error('Error calling invalidateSize:', e)
          }
        }, 300) // Increased delay to ensure DOM is fully ready

        // Notify parent component that map is ready
        if (onMapReady) {
          onMapReady(newMap)
        }

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

        // First, add all beats to the map with dynamic coloring based on personnel compliance
        if (beats && beats.length > 0) {
          beats.forEach((beat) => {
            const beatLat = beat.center_lat as number
            const beatLng = beat.center_lng as number
            const beatRadius = (beat.radius_meters as number) || 500

            // Check if any on-duty personnel assigned to this beat are outside the radius
            const assignedPersonnel = personnel.filter(person => 
              person.status === 'on_duty' && 
              person.beat_location &&
              person.beat_location.center_lat === beatLat &&
              person.beat_location.center_lng === beatLng
            )

            let isViolated = false
            const violatingPersonnel: Record<string, unknown>[] = []
            
            if (assignedPersonnel.length > 0) {
              // Check if any assigned personnel are outside the beat radius and collect them
              assignedPersonnel.forEach(person => {
                if (!person.latitude || !person.longitude) return
                
                // Calculate distance between personnel and beat center
                const R = 6371e3; // Earth's radius in meters
                const φ1 = (beatLat * Math.PI) / 180
                const φ2 = (person.latitude * Math.PI) / 180
                const Δφ = ((person.latitude - beatLat) * Math.PI) / 180
                const Δλ = ((person.longitude - beatLng) * Math.PI) / 180

                const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                         Math.cos(φ1) * Math.cos(φ2) *
                         Math.sin(Δλ/2) * Math.sin(Δλ/2)
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
                const distance = R * c

                if (distance > beatRadius) {
                  isViolated = true
                  violatingPersonnel.push({
                    ...person,
                    distance: Math.round(distance)
                  })
                }
              })
            }

            // Dynamic colors based on compliance
            const beatColor = isViolated ? '#ef4444' : '#3b82f6' // Red if violated, blue if compliant
            const statusText = isViolated ? 'PERSONNEL OUT OF BOUNDS' : 'COMPLIANT'

            // Create beat center marker (blue circle or red if violated)
            const beatIcon = L.divIcon({
              html: `
                <div style="
                  background-color: ${beatColor};
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

            // Add beat radius circle with dynamic color
            const beatCircle = L.circle([beatLat, beatLng], {
              radius: beatRadius,
              color: beatColor,
              fillColor: beatColor,
              fillOpacity: isViolated ? 0.15 : 0.1,
              weight: isViolated ? 3 : 2,
              dashArray: '5, 5'
            }).addTo(mapRef.current!)

            const beatPopupContent = `
              <div style="font-family: system-ui; min-width: 250px;">
                <h3 style="margin: 0 0 8px 0; font-weight: 600; font-size: 16px; color: #1f2937;">📍 ${beat.name}</h3>
                <p style="margin: 0 0 4px 0; font-size: 14px; color: #6b7280;"><strong>Beat Center Location</strong></p>
                <p style="margin: 0 0 4px 0; font-size: 14px;"><strong>Unit:</strong> ${beat.unit} - ${beat.sub_unit}</p>
                <p style="margin: 0 0 4px 0; font-size: 14px;"><strong>Radius:</strong> ${beatRadius}m</p>
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #374151;">${beat.address || 'Beat area'}</p>
                <div style="margin: 8px 0; padding: 6px; background: ${isViolated ? '#fef2f2' : '#eff6ff'}; border: 1px solid ${isViolated ? '#fecaca' : '#bfdbfe'}; border-radius: 4px;">
                  <p style="margin: 0; font-size: 12px; font-weight: 600; color: ${isViolated ? '#dc2626' : '#2563eb'};">
                    ${isViolated ? '⚠️' : '✅'} ${statusText}
                  </p>
                  ${assignedPersonnel.length > 0 ? `<p style="margin: 2px 0 0 0; font-size: 11px; color: #6b7280;">Assigned Personnel: ${assignedPersonnel.length}</p>` : ''}
                  ${violatingPersonnel.length > 0 ? `
                    <div style="margin: 8px 0 0 0; padding: 6px; background: #fee2e2; border: 1px solid #fca5a5; border-radius: 3px;">
                      <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #dc2626;">Personnel Out of Bounds:</p>
                      ${violatingPersonnel.map(person => `
                        <div style="margin: 2px 0; padding: 3px; background: white; border-radius: 2px;">
                          <p style="margin: 0; font-size: 11px; color: #1f2937; font-weight: 500;">${(person as Record<string, unknown>).rank} ${(person as Record<string, unknown>).full_name}</p>
                          <p style="margin: 0; font-size: 10px; color: #6b7280;">Distance: ${(person as Record<string, unknown>).distance}m (${((person as Record<string, unknown>).distance as number) - beatRadius}m over limit)</p>
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
                <p style="margin: 0; font-size: 12px; color: #9ca3af; font-family: monospace;"><strong>Coordinates:</strong> ${beatLat.toFixed(6)}, ${beatLng.toFixed(6)}</p>
              </div>
            `

            beatMarker.bindPopup(beatPopupContent)
            beatCircle.bindPopup(beatPopupContent)
            
            console.log(`🎯 Added beat location for ${beat.name} at ${beatLat}, ${beatLng} - Status: ${statusText}`)
          })
        }

        // Then add personnel markers
        personnel.filter(person => person.status === 'on_duty').forEach((person) => {
          const lat = person.latitude
          const lng = person.longitude
          
          // Only show personnel with valid coordinates from database
          if (lat && lng) {
            const color = person.status === 'alert' ? '#ef4444' :
                         person.status === 'standby' ? '#f59e0b' :
                         person.status === 'on_duty' ? '#10b981' : '#6b7280'

            const customIcon = L.divIcon({
              html: `
                <div style="
                  background-color: ${color};
                  width: 24px;
                  height: 24px;
                  border-radius: 50%;
                  border: 2px solid white;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                  position: relative;
                  z-index: 1000;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 14px;
                ">👮</div>
              `,
              className: 'custom-mini-marker',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
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
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0 0 2px 0; font-size: 12px; color: #9ca3af;">📍 ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
                  ${person.accuracy !== null ? 
                    `<p style="margin: 0; font-size: 12px; color: ${person.accuracy <= 10 ? '#059669' : person.accuracy <= 50 ? '#d97706' : '#dc2626'};">
                      🎯 Accuracy: ±${person.accuracy.toFixed(1)}m ${person.accuracy <= 10 ? '(Good)' : person.accuracy <= 50 ? '(Fair)' : '(Poor)'}
                    </p>` : 
                    '<p style="margin: 0; font-size: 12px; color: #9ca3af;">🎯 Accuracy: Unknown</p>'
                  }
                </div>
              </div>
            `

            marker.bindPopup(popupContent)
          }
        })

        console.log('✅ Added', markersAdded, 'markers to map')

        // Don't auto-zoom - let user control map navigation
        // Users can click on personnel cards to focus on specific locations

      } catch (error) {
        console.error('Error updating markers:', error)
      }
    }

    updateMarkers()
  }, [personnel, beats]) // onMapReady is optional and should be stable

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    )
  }

  return <div id="mini-map" className="h-full w-full rounded-lg" />
}

// Personnel data types
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
  accuracy: number | null // GPS accuracy in meters
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

export function LiveMonitoring() {
  const [personnel, setPersonnel] = useState<PersonnelData[]>([])
  const [beats, setBeats] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [manualRefreshing, setManualRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<DutyStatus | 'all'>('all')
  const [unitFilter, setUnitFilter] = useState('all')
  const [subUnitFilter, setSubUnitFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number, accuracy: number} | null>(null)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const mapInstance = useRef<L.Map | null>(null)

  // Function to focus map on specific personnel location
  const focusOnPersonnel = (person: PersonnelData) => {
    if (!mapInstance.current) return
    
    const lat = person.latitude
    const lng = person.longitude
    
    // Only focus if personnel has valid coordinates from database
    if (lat && lng) {
      mapInstance.current.setView([lat, lng], 15, {
        animate: true,
        duration: 1
      })
      console.log(`🎯 Focused map on ${person.full_name} at ${lat}, ${lng}`)
    } else {
      console.log(`⚠️ No coordinates available for ${person.full_name}`)
    }
  }

  // Handle map ready callback
  const handleMapReady = (map: L.Map) => {
    mapInstance.current = map
  }

  // Fetch personnel data from API
  const fetchPersonnelData = async () => {
    try {
      setError(null)
      
      // Fetch personnel, locations, beat assignments, and all beats
      const [personnelResponse, locationsResponse, beatPersonnelResponse, beatsResponse] = await Promise.all([
        fetch('/api/personnel'),
        fetch('/api/personnel/locations'),
        fetch('/api/beat-personnel'),
        fetch('/api/beats')
      ])
      
      if (!personnelResponse.ok || !locationsResponse.ok || !beatPersonnelResponse.ok || !beatsResponse.ok) {
        throw new Error('Failed to fetch personnel data')
      }
      
      const personnelData = await personnelResponse.json()
      const locationData = await locationsResponse.json()
      const beatPersonnelData = await beatPersonnelResponse.json()
      const beatsData = await beatsResponse.json()
      
      // Store beats data for map display
      setBeats(beatsData)
      
      // Combine personnel, location, and beat assignment data
      const combinedData: PersonnelData[] = personnelData.map((person: Record<string, unknown>) => {
        const location = locationData.find((loc: Record<string, unknown>) => loc.personnel_id === person.id)
        const beatAssignment = beatPersonnelData.find((bp: Record<string, unknown>) => bp.personnel_id === person.id)
        
        return {
          id: person.id as string,
          full_name: person.full_name as string,
          rank: person.rank as string,
          email: (person.email as string) || `${(person.full_name as string).toLowerCase().replace(/\s+/g, '.')}@pnp.gov.ph`,
          province: (person.unit as string)?.includes('PPO') ? (person.unit as string).replace(' PPO', '') : 'MIMAROPA',
          unit: person.unit as string,
          sub_unit: person.sub_unit as string,
          // Frontend-managed status: default to 'on_duty' if they have recent location, otherwise 'standby'
          status: location?.latitude && location?.longitude && location?.updated_at && 
            (Date.now() - new Date(location.updated_at as string).getTime()) < 15 * 60 * 1000 ? 'on_duty' : 'standby',
          status_changed_at: location?.updated_at || null,
          status_notes: location?.latitude && location?.longitude ? 'Active GPS tracking' : 'No GPS data',
          latitude: (location?.latitude as number) || null,
          longitude: (location?.longitude as number) || null,
          accuracy: (location?.accuracy as number) || null,
          last_update: (location?.updated_at as string) || null,
          minutes_since_update: location?.updated_at ? 
            Math.floor((Date.now() - new Date(location.updated_at as string).getTime()) / (1000 * 60)) : null,
          // STRICT: Only online if has actual GPS coordinates AND recent timestamp
          is_online: !!(location?.latitude && location?.longitude && location?.updated_at && 
            (Date.now() - new Date(location.updated_at as string).getTime()) < 15 * 60 * 1000), // 15 minutes
          // Beat information from beat assignment
          beat_name: (beatAssignment as Record<string, unknown>)?.beats ? 
            ((beatAssignment as Record<string, unknown>).beats as Record<string, unknown>).name as string : null,
          beat_radius: (beatAssignment as Record<string, unknown>)?.beats ? 
            ((beatAssignment as Record<string, unknown>).beats as Record<string, unknown>).radius_meters as number : null,
          beat_location: (beatAssignment as Record<string, unknown>)?.beats ? {
            center_lat: ((beatAssignment as Record<string, unknown>).beats as Record<string, unknown>).center_lat as number,
            center_lng: ((beatAssignment as Record<string, unknown>).beats as Record<string, unknown>).center_lng as number,
            description: (((beatAssignment as Record<string, unknown>).beats as Record<string, unknown>).address as string) || 'Beat area'
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

  // Update time calculations more frequently for real-time accuracy
  useEffect(() => {
    const interval = setInterval(() => {
      setPersonnel(prev => prev.map(person => ({
        ...person,
        minutes_since_update: person.last_update ? 
          Math.floor((Date.now() - new Date(person.last_update).getTime()) / (1000 * 60)) : null,
        // Only set online if there's actual location data AND it's recent
        is_online: person.last_update && person.latitude && person.longitude ? 
          (Date.now() - new Date(person.last_update).getTime()) < 15 * 60 * 1000 : false
      })))
    }, 10000) // Update every 10 seconds for more accurate time display

    return () => clearInterval(interval)
  }, [])

  // Auto-refresh data every 5 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPersonnelData()
    }, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [])

  // Calculate statistics
  const stats: PersonnelStats = {
    total: personnel.length,
    alert: personnel.filter(p => p.status === 'alert').length,
    standby: personnel.filter(p => p.status === 'standby').length,
    onDuty: personnel.filter(p => p.status === 'on_duty').length
  }

  // Filter personnel - Only show those with active GPS location (online)
  const filteredPersonnel = personnel.filter(person => {
    if (!person || !person.id || !person.full_name) return false
    
    // FIRST: Must be online (have recent GPS location data)
    if (!person.is_online) return false
    
    // THEN: Apply other filters
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

  // Manual refresh function
  const handleManualRefresh = async () => {
    if (manualRefreshing) return
    
    setManualRefreshing(true)
    setError(null)
    
    // Refresh data from database
    await fetchPersonnelData()
    setManualRefreshing(false)
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
                      onMapReady={handleMapReady}
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
                          <span className="text-gray-700">Beat Center (Compliant)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full border border-white shadow-sm"></div>
                          <span className="text-gray-700">Beat Center (Out of Bounds)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-1 border-2 border-blue-500 border-dashed"></div>
                          <span className="text-gray-700">Beat Radius (Normal)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-1 border-2 border-red-500 border-dashed"></div>
                          <span className="text-gray-700">Beat Radius (Violated)</span>
                        </div>
                        <hr className="my-2 border-gray-200" />
                        <div className="text-gray-600">
                          <p className="font-medium mb-1">Map Controls:</p>
                          <p className="text-xs">• Layer switcher (top-left)</p>
                          <p className="text-xs">• Fullscreen toggle (⛶)</p>
                          <p className="text-xs">• 5 terrain options available</p>
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
                  Online Personnel
                  <span className="ml-2 text-xs text-gray-500 font-normal">(Active GPS location sharing)</span>
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
                    <p className="font-medium">No online personnel</p>
                    <p className="text-xs text-gray-400 mt-1">No personnel are currently sharing GPS location</p>
                  </div>
                ) : (
                  <div className="space-y-2 p-4">
                    {filteredPersonnel.map((person, index) => {
                      const statusConfig = getStatusConfig(person.status)
                      const StatusIcon = statusConfig.icon
                      const isOnDuty = person.status === 'on_duty'
                      
                      return (
                        <div
                          key={person.id || `person-${index}`}
                          className={`p-3 rounded-lg border ${statusConfig.bgColor} ${statusConfig.borderColor} transition-all duration-200 ${
                            isOnDuty 
                              ? 'hover:shadow-md hover:scale-[1.02] cursor-pointer' 
                              : 'cursor-default'
                          }`}
                          onClick={isOnDuty ? () => focusOnPersonnel(person) : undefined}
                          title={isOnDuty ? "Click to focus map on this personnel location" : "Only on-duty personnel can be focused on map"}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {/* Dot color based on LOCATION STATUS, not duty status */}
                              <div className={`w-3 h-3 rounded-full ${
                                person.is_online ? 'bg-green-500' : 'bg-gray-400'
                              }`}></div>
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
                            {person.is_online && person.accuracy !== null && (
                              <div className="mt-1 text-xs">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                  person.accuracy <= 10 
                                    ? 'bg-green-100 text-green-700' 
                                    : person.accuracy <= 50 
                                    ? 'bg-yellow-100 text-yellow-700' 
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  🎯 ±{person.accuracy.toFixed(1)}m
                                </span>
                              </div>
                            )}
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
