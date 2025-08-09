import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/database/client';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/utils/rate-limit';

// Helper function to validate authentication and get user
async function validateAuthAndGetUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing or invalid Authorization header', status: 401 }
  }

  const token = authHeader.replace('Bearer ', '')
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  
  if (error || !user) {
    return { error: 'Invalid or expired token', status: 401 }
  }

  return { user, supabase: supabaseAdmin }
}

// Helper function to validate user permissions
async function validateUserPermissions(supabase: any, userId: string, requiredRoles: string[] = ['superadmin']) {
  const { data: profile, error } = await supabase
    .from('admin_accounts')
    .select('role')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    return { error: 'User profile not found', status: 403 }
  }

  if (!requiredRoles.includes(profile.role)) {
    return { error: 'Insufficient permissions', status: 403 }
  }

  return { profile }
}

// Input validation helper
function validateBeatData(data: any): string[] {
  const errors: string[] = []
  
  if (data.name && (typeof data.name !== 'string' || data.name.trim().length < 1 || data.name.length > 100)) {
    errors.push('Beat name must be a string between 1 and 100 characters')
  }
  
  if (data.center_lat !== undefined) {
    if (typeof data.center_lat !== 'number' || data.center_lat < -90 || data.center_lat > 90) {
      errors.push('Latitude must be a number between -90 and 90')
    }
  }
  
  if (data.center_lng !== undefined) {
    if (typeof data.center_lng !== 'number' || data.center_lng < -180 || data.center_lng > 180) {
      errors.push('Longitude must be a number between -180 and 180')
    }
  }
  
  if (data.radius !== undefined) {
    if (typeof data.radius !== 'number' || data.radius < 10 || data.radius > 10000) {
      errors.push('Radius must be a number between 10 and 10000 meters')
    }
  }
  
  if (data.unit && (typeof data.unit !== 'string' || data.unit.trim().length < 1)) {
    errors.push('Unit must be a non-empty string')
  }
  
  if (data.sub_unit && (typeof data.sub_unit !== 'string' || data.sub_unit.trim().length < 1)) {
    errors.push('Sub-unit must be a non-empty string')
  }
  
  return errors
}

// GET specific beat by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Validate authentication
    const authResult = await validateAuthAndGetUser(request)
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { user, supabase } = authResult

    // Validate permissions (allow all authenticated users to view beats)
    const permissionResult = await validateUserPermissions(supabase, user.id, ['superadmin', 'regional', 'provincial', 'station'])
    if ('error' in permissionResult) {
      return NextResponse.json({ error: permissionResult.error }, { status: permissionResult.status })
    }

    // Validate beat ID format
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid beat ID' }, { status: 400 })
    }

    const beatServerSupabase = createServerSupabaseClient()
    
    const { data: beat, error } = await beatServerSupabase
      .from('beats')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Supabase query error:', error)
      return NextResponse.json({ error: 'Beat not found' }, { status: 404 })
    }

    return NextResponse.json(beat)
  } catch (error) {
    console.error('Error fetching beat:', error)
    return NextResponse.json({ error: 'Failed to fetch beat' }, { status: 500 })
  }
}

// UPDATE beat by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Rate limiting - allow 5 updates per minute per user
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimitResult = checkRateLimit(`update_${clientIP}`, 5, 60000)
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { 
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    // Validate authentication
    const authResult = await validateAuthAndGetUser(request)
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { user, supabase } = authResult

    // Validate permissions (only superadmin can edit beats)
    const permissionResult = await validateUserPermissions(supabase, user.id, ['superadmin'])
    if ('error' in permissionResult) {
      return NextResponse.json({ error: permissionResult.error }, { status: permissionResult.status })
    }

    // Validate beat ID format
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid beat ID' }, { status: 400 })
    }

    const body = await request.json()
    
    // Validate input data
    const validationErrors = validateBeatData(body)
    if (validationErrors.length > 0) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationErrors 
      }, { status: 400 })
    }

    const updateServerSupabase = createServerSupabaseClient()
    
    const updateData: any = {}
    
    // Only update fields that are provided and validated
    if (body.name !== undefined) updateData.name = body.name.trim()
    if (body.center_lat !== undefined) updateData.center_lat = body.center_lat
    if (body.center_lng !== undefined) updateData.center_lng = body.center_lng
    if (body.radius !== undefined) updateData.radius_meters = body.radius
    if (body.description !== undefined) updateData.address = body.description.trim()
    if (body.unit !== undefined) updateData.unit = body.unit.trim()
    if (body.sub_unit !== undefined) updateData.sub_unit = body.sub_unit.trim()
    if (body.status !== undefined) updateData.status = body.status
    
    // Always update the updated_at timestamp
    updateData.updated_at = new Date().toISOString()

    // Get original data for audit logging
    const { data: originalBeat } = await updateServerSupabase
      .from('beats')
      .select('*')
      .eq('id', id)
      .single()

    const { data, error } = await updateServerSupabase
      .from('beats')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Supabase update error:', error)
      return NextResponse.json({ error: 'Failed to update beat' }, { status: 500 })
    }

    // Audit log for beat update
    await updateServerSupabase
      .from('audit_logs')
      .insert({
        table_name: 'beats',
        operation: 'UPDATE',
        old_data: originalBeat,
        new_data: data,
        changed_by: user.id,
        changed_at: new Date().toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      })

    // Log the update for audit purposes (sanitized)
    console.log(`Beat ${id} updated by user ${user.id}`)

    return NextResponse.json(data, {
      headers: getRateLimitHeaders(rateLimitResult)
    })
  } catch (error) {
    console.error('Error updating beat:', error)
    return NextResponse.json({ error: 'Failed to update beat' }, { status: 500 })
  }
}

// DELETE beat by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Rate limiting - allow 3 deletions per minute per user (stricter for destructive operations)
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimitResult = checkRateLimit(`delete_${clientIP}`, 3, 60000)
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { 
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    // Validate authentication
    const authResult = await validateAuthAndGetUser(request)
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { user, supabase } = authResult

    // Validate permissions (only superadmin can delete beats)
    const permissionResult = await validateUserPermissions(supabase, user.id, ['superadmin'])
    if ('error' in permissionResult) {
      return NextResponse.json({ error: permissionResult.error }, { status: permissionResult.status })
    }

    // Validate beat ID format
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid beat ID' }, { status: 400 })
    }

    const deleteServerSupabase = createServerSupabaseClient()
    
    // First check if beat exists and get complete data for audit log
    const { data: existingBeat, error: fetchError } = await deleteServerSupabase
      .from('beats')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingBeat) {
      return NextResponse.json({ error: 'Beat not found' }, { status: 404 })
    }

    // Check if beat has assigned personnel and get complete personnel info for audit
    const { data: assignedPersonnel, error: personnelError } = await deleteServerSupabase
      .from('beat_personnel')
      .select(`
        *,
        personnel!inner (
          id,
          full_name,
          rank,
          email
        )
      `)
      .eq('beat_id', id)

    if (personnelError) {
      console.error('Error checking assigned personnel:', personnelError)
    } else if (assignedPersonnel && assignedPersonnel.length > 0) {
      // Check for accepted personnel (these should block deletion)
      const acceptedPersonnel = assignedPersonnel.filter(p => p.acceptance_status === 'accepted')
      
      if (acceptedPersonnel.length > 0) {
        return NextResponse.json({ 
          error: 'Cannot delete beat with active personnel assignments. Please reassign personnel first.' 
        }, { status: 400 })
      }
      
      // Remove pending personnel assignments before deleting beat
      const { error: removeAssignmentsError } = await deleteServerSupabase
        .from('beat_personnel')
        .delete()
        .eq('beat_id', id)
        
      if (removeAssignmentsError) {
        console.error('Error removing personnel assignments:', removeAssignmentsError)
        return NextResponse.json({ error: 'Failed to remove personnel assignments' }, { status: 500 })
      }
      
      // Audit log for assignment removals
      for (const assignment of assignedPersonnel) {
        await deleteServerSupabase
          .from('audit_logs')
          .insert({
            table_name: 'beat_personnel',
            operation: 'DELETE',
            old_data: assignment,
            new_data: null,
            changed_by: user.id,
            changed_at: new Date().toISOString(),
            ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
            user_agent: request.headers.get('user-agent') || 'unknown'
          })
      }
      
      console.log(`Removed ${assignedPersonnel.length} pending personnel assignments for beat ${id}`)
    }

    // Prepare enhanced beat data with personnel information for audit log
    const enhancedBeatData = {
      ...existingBeat,
      assigned_personnel: assignedPersonnel && assignedPersonnel.length > 0 
        ? assignedPersonnel.map(assignment => ({
            personnel_id: assignment.personnel_id,
            full_name: assignment.personnel?.full_name,
            rank: assignment.personnel?.rank,
            // Mask email for privacy
            email: assignment.personnel?.email ? assignment.personnel.email.replace(/(.{2}).*@/, '$1***@') : null,
            acceptance_status: assignment.acceptance_status,
            assigned_at: assignment.assigned_at
          }))
        : []
    }

    // Audit log for beat deletion (before deleting)
    await deleteServerSupabase
      .from('audit_logs')
      .insert({
        table_name: 'beats',
        operation: 'DELETE',
        old_data: enhancedBeatData,
        new_data: null,
        changed_by: user.id,
        changed_at: new Date().toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      })

    // Delete the beat
    const { error: deleteError } = await deleteServerSupabase
      .from('beats')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Supabase delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete beat' }, { status: 500 })
    }

    // Log the deletion for audit purposes (sanitized)
    console.log(`Beat ${id} (${existingBeat.name}) deleted by user ${user.id}`)

    return NextResponse.json({ 
      message: 'Beat deleted successfully',
      deletedBeat: existingBeat
    }, {
      headers: getRateLimitHeaders(rateLimitResult)
    })
  } catch (error) {
    console.error('Error deleting beat:', error)
    return NextResponse.json({ error: 'Failed to delete beat' }, { status: 500 })
  }
}
