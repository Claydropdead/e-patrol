'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { MIMAROPA_STRUCTURE } from '@/lib/constants/mimaropa'

export function PersonnelCreationForm() {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    rank: '',
    fullName: '',
    email: '',
    password: '',
    contactNumber: '',
    province: '',
    unit: '',
    subUnit: '',
    isActive: true
  })

  const handleProvinceChange = (province: string) => {
    setFormData({
      ...formData,
      province,
      unit: province, // Unit is same as province
      subUnit: '' // Reset sub-unit when province changes
    })
  }

  const getSubUnits = (): readonly string[] => {
    if (!formData.province) return []
    const provinceData = MIMAROPA_STRUCTURE[formData.province as keyof typeof MIMAROPA_STRUCTURE]
    return provinceData?.subUnits || []
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setLoading(true)
    try {
      // Get the current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        throw new Error('Authentication failed - please login again')
      }
      
      const response = await fetch('/api/personnel/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          rank: formData.rank,
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          contactNumber: formData.contactNumber,
          province: formData.province,
          unit: formData.unit,
          subUnit: formData.subUnit,
          isActive: formData.isActive
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create personnel account')
      }

      toast.success('Personnel account created successfully!')
      
      // Reset form
      setFormData({
        rank: '',
        fullName: '',
        email: '',
        password: '',
        contactNumber: '',
        province: '',
        unit: '',
        subUnit: '',
        isActive: true
      })

    } catch (error) {
      console.error('Error creating personnel account:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create personnel account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Personnel Account</CardTitle>
        <CardDescription>
          Create a new personnel account for field officers in MIMAROPA region
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rank">Rank</Label>
              <Input
                id="rank"
                value={formData.rank}
                onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                placeholder="e.g. Police Officer III"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Enter full name"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="personnel@pnp.gov.ph"
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter secure password"
                required
                minLength={6}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="contactNumber">Contact Number</Label>
            <Input
              id="contactNumber"
              value={formData.contactNumber}
              onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
              placeholder="09XX-XXX-XXXX"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="province">Province/Unit</Label>
              <Select value={formData.province} onValueChange={handleProvinceChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(MIMAROPA_STRUCTURE)
                    .filter(province => province && province.trim() !== '')
                    .map((province) => (
                    <SelectItem key={province} value={province}>
                      {province}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subUnit">Sub-Unit</Label>
              <Select 
                value={formData.subUnit} 
                onValueChange={(value) => setFormData({ ...formData, subUnit: value })}
                disabled={!formData.province}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sub-unit" />
                </SelectTrigger>
                <SelectContent>
                  {getSubUnits()
                    .filter(subUnit => subUnit && subUnit.trim() !== '')
                    .map((subUnit) => (
                    <SelectItem key={subUnit} value={subUnit}>
                      {subUnit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4"
            />
            <Label htmlFor="isActive">Active Account</Label>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating...' : 'Create Personnel Account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
