'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { AdminRole } from '@/lib/types/database'

export function AdminCreationForm() {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    rank: '',
    fullName: '',
    email: '',
    password: '',
    role: '' as AdminRole | '',
    isActive: true,
    assignedProvince: '',
    assignedUnit: '',
    assignedSubUnit: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.role) {
      toast.error('Please select a role')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rank: formData.rank,
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          isActive: formData.isActive,
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
              <Select value={formData.role} onValueChange={(value: AdminRole) => setFormData({ ...formData, role: value })}>
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

          {/* Assignment Fields - Show only for Provincial and Station roles */}
          {(formData.role === 'provincial' || formData.role === 'station') && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Assignment Information</h3>
              
              {formData.role === 'provincial' && (
                <div>
                  <Label htmlFor="assignedProvince">Assigned Province</Label>
                  <Select value={formData.assignedProvince} onValueChange={(value) => setFormData({ ...formData, assignedProvince: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select assigned province" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Oriental Mindoro PPO">Oriental Mindoro PPO</SelectItem>
                      <SelectItem value="Occidental Mindoro PPO">Occidental Mindoro PPO</SelectItem>
                      <SelectItem value="Marinduque PPO">Marinduque PPO</SelectItem>
                      <SelectItem value="Romblon PPO">Romblon PPO</SelectItem>
                      <SelectItem value="Palawan PPO">Palawan PPO</SelectItem>
                      <SelectItem value="Puerto Princesa CPO">Puerto Princesa CPO</SelectItem>
                      <SelectItem value="RMFB">RMFB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.role === 'station' && (
                <div>
                  <Label htmlFor="assignedSubUnit">Assigned Sub-Unit</Label>
                  <Input
                    id="assignedSubUnit"
                    value={formData.assignedSubUnit}
                    onChange={(e) => setFormData({ ...formData, assignedSubUnit: e.target.value })}
                    placeholder="e.g. Calapan CPS - Investigation Unit"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the specific sub-unit this admin will manage
                  </p>
                </div>
              )}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating...' : 'Create Admin Account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
