// User roles in the system
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_accounts: {
        Row: {
          id: string
          rank: string
          full_name: string
          email: string
          role: 'superadmin' | 'regional' | 'provincial' | 'station'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          rank: string
          full_name: string
          email: string
          role: 'superadmin' | 'regional' | 'provincial' | 'station'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          rank?: string
          full_name?: string
          email?: string
          role?: 'superadmin' | 'regional' | 'provincial' | 'station'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      personnel: {
        Row: {
          id: string
          rank: string
          full_name: string
          email: string
          contact_number: string | null
          province: string
          unit: string
          sub_unit: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          rank: string
          full_name: string
          email: string
          contact_number?: string | null
          province: string
          unit: string
          sub_unit: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          rank?: string
          full_name?: string
          email?: string
          contact_number?: string | null
          province?: string
          unit?: string
          sub_unit?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      personnel_assignment_history: {
        Row: {
          id: string
          personnel_id: string
          previous_unit: string | null
          previous_sub_unit: string | null
          previous_province: string | null
          new_unit: string | null
          new_sub_unit: string | null
          new_province: string | null
          changed_by: string | null
          changed_at: string
          reason: string | null
        }
        Insert: {
          id?: string
          personnel_id: string
          previous_unit?: string | null
          previous_sub_unit?: string | null
          previous_province?: string | null
          new_unit?: string | null
          new_sub_unit?: string | null
          new_province?: string | null
          changed_by?: string | null
          changed_at?: string
          reason?: string | null
        }
        Update: {
          id?: string
          personnel_id?: string
          previous_unit?: string | null
          previous_sub_unit?: string | null
          previous_province?: string | null
          new_unit?: string | null
          new_sub_unit?: string | null
          new_province?: string | null
          changed_by?: string | null
          changed_at?: string
          reason?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      admin_role: 'superadmin' | 'regional' | 'provincial' | 'station'
    }
  }
}

export type AdminAccount = Database['public']['Tables']['admin_accounts']['Row']
export type Personnel = Database['public']['Tables']['personnel']['Row']
export type PersonnelAssignmentHistory = Database['public']['Tables']['personnel_assignment_history']['Row']
export type AdminRole = Database['public']['Enums']['admin_role']

// Personnel status types
export type PersonnelStatus = 'patrolling' | 'active' | 'alert' | 'standby'

// Province/unit types in MIMAROPA
export type ProvinceUnit = 
  | 'Oriental Mindoro PPO'
  | 'Occidental Mindoro PPO'
  | 'Marinduque PPO'
  | 'Romblon PPO'
  | 'Palawan PPO'
  | 'Puerto Princesa CPO'
  | 'RMFB'

// Database types

export interface LocationTracking {
  id: string
  personnel_id: string
  latitude: number
  longitude: number
  accuracy: number
  timestamp: string
  status: PersonnelStatus
  battery_level?: number
  speed?: number
  heading?: number
  device_info?: Record<string, unknown>
  assignment_id?: string
}

export interface Assignment {
  id: string
  title: string
  description: string
  assignment_type: 'patrol' | 'incident' | 'checkpoint' | 'escort' | 'investigation' | 'community'
  created_by: string
  assigned_to: string
  created_at: string
  scheduled_start: string
  scheduled_end: string
  actual_start?: string
  actual_end?: string
  patrol_area?: Record<string, unknown> // GeoJSON
  route_points?: Array<{ lat: number; lng: number }> // Array of coordinates
  checkpoints?: Array<{ name: string; lat: number; lng: number; description?: string }> // Array of checkpoint objects
  base_location?: Record<string, unknown> // GeoJSON point
  priority: 'low' | 'medium' | 'high' | 'urgent'
  expected_duration?: string
  special_instructions?: string
  required_equipment?: string[]
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'
  completion_notes?: string
  supervisor_notes?: string
  distance_covered?: number
  checkpoints_completed?: number
  incidents_reported?: number
}
