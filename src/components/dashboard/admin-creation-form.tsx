'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { AdminRole } from '@/lib/types/database'
import { MIMAROPA_STRUCTURE, getProvinceSubUnits } from '@/lib/constants/mimaropa'

export function AdminCreationForm() {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    rank: '',
    fullName: '',
    email: '',
    password: '',
    role: '' as AdminRole | '',
    isActive: true,
    assignedRegion: '',
    assignedProvince: '',
    assignedUnit: '',
    assignedSubUnit: ''
  })

  // Helper function to handle role change and reset assignment fields
  const handleRoleChange = (role: AdminRole) => {
    setFormData(prev => ({
      ...prev,
      role,
      // Reset assignment fields when role changes
      assignedRegion: role === 'superadmin' ? '' : (role === 'regional' ? 'MIMAROPA' : ''),
      assignedProvince: '',
      assignedUnit: '',
      assignedSubUnit: ''
    }))
  }

  // Helper function to handle province change and reset sub-fields
  const handleProvinceChange = (province: string) => {
    setFormData(prev => ({
      ...prev,
      assignedProvince: province,
      assignedUnit: '',
      assignedSubUnit: ''
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.role) {
      toast.error('Please select a role')
      return
    }

    // Validate role-specific requirements
    if (formData.role === 'station') {
      if (!formData.assignedProvince) {
        toast.error('Station admins must have an assigned province/unit')
        return
      }
      if (!formData.assignedSubUnit) {
        toast.error('Station admins must have an assigned sub-unit')
        return
      }
    }

    if (formData.role === 'provincial' && !formData.assignedProvince) {
      toast.error('Provincial admins must have an assigned province/unit')
      return
    }

    setLoading(true)
    try {
      // Get the current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        throw new Error('Authentication failed - please login again')
      }
      
      const response = await fetch('/api/admin/create', {
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
          role: formData.role,
          isActive: formData.isActive,
          assignedRegion: formData.assignedRegion,
          assignedProvince: formData.assignedProvince,
          assignedUnit: formData.assignedUnit,
          assignedSubUnit: formData.assignedSubUnit
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create admin account')
      }

      toast.success('Admin account created successfully!')
      
      // Reset form
      setFormData({
        rank: '',
        fullName: '',
        email: '',
        password: '',
        role: '' as AdminRole | '',
        isActive: true,
        assignedRegion: '',
        assignedProvince: '',
        assignedUnit: '',
        assignedSubUnit: ''
      })

    } catch (error) {
      console.error('Error creating admin account:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create admin account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Admin Account</CardTitle>
        <CardDescription>
          Create a new admin account with superadmin, regional, provincial, or station roles
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
                placeholder="e.g. Police Colonel"
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
                placeholder="admin@pnp.gov.ph"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="role">Admin Role</Label>
              <Select value={formData.role} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select admin role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="superadmin">Superadmin</SelectItem>
                  <SelectItem value="regional">Regional</SelectItem>
                  <SelectItem value="provincial">Provincial</SelectItem>
                  <SelectItem value="station">Station</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="isActive">Active Account</Label>
            </div>
          </div>

          {/* Assignment Fields - Show based on role hierarchy */}
          {formData.role && formData.role !== 'superadmin' && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Assignment Information</h3>
              
              {/* Regional Role - Shows MIMAROPA region (auto-selected) */}
              {formData.role === 'regional' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="assignedRegion">Assigned Region</Label>
                    <Input
                      id="assignedRegion"
                      value="MIMAROPA"
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Regional admins manage the entire MIMAROPA region
                    </p>
                  </div>
                </div>
              )}

              {/* Provincial Role - Select region and province */}
              {formData.role === 'provincial' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="assignedRegion">Assigned Region</Label>
                    <Input
                      id="assignedRegion"
                      value="MIMAROPA"
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="assignedProvince">Assigned Province/Unit</Label>
                    <Select 
                      value={formData.assignedProvince} 
                      onValueChange={handleProvinceChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select assigned province/unit" />
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
                    <p className="text-xs text-gray-500 mt-1">
                      Provincial admins manage a specific province or unit within MIMAROPA
                    </p>
                  </div>
                </div>
              )}

              {/* Station Role - Select region, province, and sub-unit */}
              {formData.role === 'station' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="assignedRegion">Assigned Region</Label>
                    <Input
                      id="assignedRegion"
                      value="MIMAROPA"
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="assignedProvince">Assigned Province/Unit <span className="text-red-500">*</span></Label>
                    <Select 
                      value={formData.assignedProvince} 
                      onValueChange={handleProvinceChange}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select assigned province/unit" />
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
                    <p className="text-xs text-gray-500 mt-1">
                      Select the province or unit this station admin will manage
                    </p>
                  </div>
                  {formData.assignedProvince && (
                    <div>
                      <Label htmlFor="assignedSubUnit">Assigned Sub-Unit <span className="text-red-500">*</span></Label>
                      <Select 
                        value={formData.assignedSubUnit} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, assignedSubUnit: value }))}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select assigned sub-unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {getProvinceSubUnits(formData.assignedProvince as keyof typeof MIMAROPA_STRUCTURE)
                            .filter(subUnit => subUnit && subUnit.trim() !== '')
                            .map((subUnit) => (
                            <SelectItem key={subUnit} value={subUnit}>
                              {subUnit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        <strong>Required:</strong> Station admins must be assigned to a specific sub-unit
                      </p>
                    </div>
                  )}
                  {formData.role === 'station' && !formData.assignedSubUnit && formData.assignedProvince && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <p className="text-sm text-amber-700">
                        ⚠️ Please select a sub-unit. Station admins must be assigned to a specific sub-unit within their province.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <Button 
            type="submit" 
            disabled={
              loading || 
              !formData.role || 
              (formData.role === 'station' && (!formData.assignedProvince || !formData.assignedSubUnit)) ||
              (formData.role === 'provincial' && !formData.assignedProvince)
            } 
            className="w-full"
          >
            {loading ? 'Creating...' : 'Create Admin Account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
