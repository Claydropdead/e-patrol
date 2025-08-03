'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  MapPin, 
  Users, 
  AlertTriangle, 
  Clock, 
  Radio,
  Filter,
  Search,
  RefreshCw
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Mock data for demonstration - Using correct MIMAROPA structure
const mockPersonnel = [
  // Oriental Mindoro PPO
  {
    id: '1',
    name: 'PO1 Juan Dela Cruz',
    rank: 'PO1',
    badge: 'B12345',
    status: 'alert',
    province: 'Oriental Mindoro PPO',
    unit: 'Oriental Mindoro PPO',
    subUnit: 'Calapan CPS',
    lastUpdate: '2 mins ago',
    location: { lat: 13.4117, lng: 121.1803 }
  },
  {
    id: '6',
    name: 'PO2 Ana Reyes',
    rank: 'PO2',
    badge: 'B12350',
    status: 'on_duty',
    province: 'Oriental Mindoro PPO',
    unit: 'Oriental Mindoro PPO',
    subUnit: '1st PMFC',
    lastUpdate: '4 mins ago',
    location: { lat: 13.1533, lng: 121.4247 }
  },
  {
    id: '9',
    name: 'SPO1 Ricardo Torres',
    rank: 'SPO1',
    badge: 'B12353',
    status: 'standby',
    province: 'Oriental Mindoro PPO',
    unit: 'Oriental Mindoro PPO',
    subUnit: 'Baco MPS',
    lastUpdate: '3 mins ago',
    location: { lat: 12.9617, lng: 121.3144 }
  },
  
  // Occidental Mindoro PPO
  {
    id: '5',
    name: 'PO1 Miguel Rivera',
    rank: 'PO1',
    badge: 'B12349',
    status: 'standby',
    province: 'Occidental Mindoro PPO',
    unit: 'Occidental Mindoro PPO',
    subUnit: 'Mamburao MPS',
    lastUpdate: '7 mins ago',
    location: { lat: 13.2186, lng: 120.5947 }
  },
  {
    id: '10',
    name: 'PO3 Lisa Fernandez',
    rank: 'PO3',
    badge: 'B12354',
    status: 'on_duty',
    province: 'Occidental Mindoro PPO',
    unit: 'Occidental Mindoro PPO',
    subUnit: 'San Jose MPS',
    lastUpdate: '6 mins ago',
    location: { lat: 12.3528, lng: 121.0686 }
  },
  
  // Palawan PPO
  {
    id: '2', 
    name: 'PO2 Maria Santos',
    rank: 'PO2',
    badge: 'B12346',
    status: 'on_duty',
    province: 'Palawan PPO',
    unit: 'Palawan PPO',
    subUnit: 'El Nido MPS',
    lastUpdate: '5 mins ago',
    location: { lat: 9.7392, lng: 118.7353 }
  },
  {
    id: '8',
    name: 'SPO2 Elena Vasquez',
    rank: 'SPO2',
    badge: 'B12352',
    status: 'on_duty',
    province: 'Palawan PPO',
    unit: 'Palawan PPO',
    subUnit: 'Coron MPS',
    lastUpdate: '8 mins ago',
    location: { lat: 11.1949, lng: 119.4094 }
  },
  {
    id: '11',
    name: 'PO1 Benjamin Castro',
    rank: 'PO1',
    badge: 'B12355',
    status: 'alert',
    province: 'Palawan PPO',
    unit: 'Palawan PPO',
    subUnit: 'Brooke\'s Point MPS',
    lastUpdate: '1 min ago',
    location: { lat: 12.0033, lng: 120.2069 }
  },
  
  // Puerto Princesa CPO
  {
    id: '7',
    name: 'PO3 Carlos Mendoza',
    rank: 'PO3',
    badge: 'B12351',
    status: 'standby',
    province: 'Puerto Princesa CPO',
    unit: 'Puerto Princesa CPO',
    subUnit: 'Police Station 1 (Mendoza)',
    lastUpdate: '6 mins ago',
    location: { lat: 9.7500, lng: 118.7500 }
  },
  {
    id: '12',
    name: 'PO2 Grace Morales',
    rank: 'PO2',
    badge: 'B12356',
    status: 'on_duty',
    province: 'Puerto Princesa CPO',
    unit: 'Puerto Princesa CPO',
    subUnit: 'Police Station 3',
    lastUpdate: '9 mins ago',
    location: { lat: 9.7800, lng: 118.7600 }
  },
  
  // Romblon PPO
  {
    id: '3',
    name: 'PO3 Roberto Garcia',
    rank: 'PO3', 
    badge: 'B12347',
    status: 'standby',
    province: 'Romblon PPO',
    unit: 'Romblon PPO',
    subUnit: 'Romblon MPS',
    lastUpdate: '1 min ago',
    location: { lat: 12.5778, lng: 122.2681 }
  },
  {
    id: '13',
    name: 'SPO1 Antonio Delgado',
    rank: 'SPO1',
    badge: 'B12357',
    status: 'alert',
    province: 'Romblon PPO',
    unit: 'Romblon PPO',
    subUnit: 'Odiongan MPS',
    lastUpdate: '5 mins ago',
    location: { lat: 12.4042, lng: 122.1925 }
  },
  
  // Marinduque PPO
  {
    id: '4',
    name: 'SPO1 Carmen Lopez',
    rank: 'SPO1',
    badge: 'B12348', 
    status: 'alert',
    province: 'Marinduque PPO',
    unit: 'Marinduque PPO',
    subUnit: 'Boac MPS',
    lastUpdate: '3 mins ago',
    location: { lat: 13.4548, lng: 121.8431 }
  },
  {
    id: '14',
    name: 'PO1 Sandra Villanueva',
    rank: 'PO1',
    badge: 'B12358',
    status: 'standby',
    province: 'Marinduque PPO',
    unit: 'Marinduque PPO',
    subUnit: 'Gasan MPS',
    lastUpdate: '12 mins ago',
    location: { lat: 13.3200, lng: 121.8500 }
  },
  
  // RMFB (Regional Mobile Force Battalion)
  {
    id: '15',
    name: 'SPO2 Mark Johnson',
    rank: 'SPO2',
    badge: 'B12359',
    status: 'on_duty',
    province: 'RMFB',
    unit: 'RMFB',
    subUnit: '401st Company',
    lastUpdate: '2 mins ago',
    location: { lat: 13.4000, lng: 121.0000 }
  },
  {
    id: '16',
    name: 'PO3 Diana Cruz',
    rank: 'PO3',
    badge: 'B12360',
    status: 'standby',
    province: 'RMFB',
    unit: 'RMFB',
    subUnit: '402nd Company',
    lastUpdate: '4 mins ago',
    location: { lat: 13.5000, lng: 121.1000 }
  }
]

type DutyStatus = 'alert' | 'standby' | 'on_duty'

interface PersonnelStats {
  total: number
  alert: number
  standby: number
  onDuty: number
}

export function LiveMonitoring() {
  const [personnel] = useState(mockPersonnel)
  const [statusFilter, setStatusFilter] = useState<DutyStatus | 'all'>('all')
  const [unitFilter, setUnitFilter] = useState('all')
  const [subUnitFilter, setSubUnitFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [lastUpdate, setLastUpdate] = useState(new Date())

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
    const matchesSubUnit = subUnitFilter === 'all' || person.subUnit === subUnitFilter
    const matchesSearch = person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         person.badge.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         person.unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         person.subUnit.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesStatus && matchesUnit && matchesSubUnit && matchesSearch
  })

  // Get unique units and subunits
  const units = [...new Set(personnel.map(p => p.unit))]
  const subUnits = [...new Set(personnel.map(p => p.subUnit))]

  // Get all available units (no province filtering)
  const availableUnits = units

  // Get sub-units filtered by selected unit only
  const availableSubUnits = unitFilter === 'all' 
    ? subUnits 
    : [...new Set(personnel.filter(p => p.unit === unitFilter).map(p => p.subUnit))]

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
              <div className="h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">Interactive Map</p>
                  <p className="text-sm text-gray-400">Personnel locations will be displayed here</p>
                  <div className="mt-4 flex justify-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Alert</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Standby</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">On Duty</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Personnel List (1/3 width) */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Personnel Status
              </CardTitle>
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
                  <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
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
                        "{searchTerm}"
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[400px] overflow-y-auto">
                {filteredPersonnel.length === 0 ? (
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
                                <p className="font-medium text-gray-900 text-sm">{person.name}</p>
                                <p className="text-xs text-gray-600">{person.badge} • {person.rank}</p>
                              </div>
                            </div>
                            <StatusIcon className={`h-4 w-4 ${statusConfig.textColor}`} />
                          </div>
                          
                          <div className="mt-2 text-xs text-gray-600">
                            <p className="font-medium">{person.unit}</p>
                            <p className="text-gray-500">{person.subUnit}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span>{person.lastUpdate}</span>
                              <Badge variant="outline" className="text-xs">
                                {statusConfig.label}
                              </Badge>
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
