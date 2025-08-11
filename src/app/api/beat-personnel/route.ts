import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/database/client';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    
    // First get the beat personnel data
    const { data: beatPersonnelData, error } = await supabase
      .from('beat_personnel')
      .select(`
        *,
        personnel!inner (
          id,
          full_name,
          rank,
          email,
          unit,
          sub_unit
        ),
        beats!inner (
          id,
          name,
          center_lat,
          center_lng,
          radius_meters,
          unit,
          sub_unit
        )
      `)
      .order('assigned_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch beat personnel' }, { status: 500 })
    }

    // Get replacement history to determine assignment types
    const { data: replacementHistory, error: replacementError } = await supabase
      .from('personnel_replacement_history')
      .select('beat_id, new_personnel_id, replacement_reason, replaced_at')

    if (replacementError) {
      console.warn('Could not fetch replacement history:', replacementError)
    }

    // Add assignment type to each personnel record
    const enrichedData = (beatPersonnelData || []).map((bp: any) => {
      const isReplacement = replacementHistory?.some(
        (rh: any) => rh.new_personnel_id === bp.personnel_id && rh.beat_id === bp.beat_id
      )
      
      const replacementInfo = replacementHistory?.find(
        (rh: any) => rh.new_personnel_id === bp.personnel_id && rh.beat_id === bp.beat_id
      )

      return {
        ...bp,
        assignment_type: isReplacement ? 'replacement' : 'original',
        replacement_info: replacementInfo ? {
          reason: replacementInfo.replacement_reason,
          replaced_at: replacementInfo.replaced_at
        } : null
      }
    })

    return NextResponse.json(enrichedData)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch beat personnel' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Add authentication and authorization
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    // Validate user permissions (only superadmin can assign personnel to beats)
    const { data: profile, error: profileError } = await supabaseAuth
      .from('admin_accounts')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'superadmin') {
      return NextResponse.json({ error: 'Insufficient permissions - only superadmin can assign personnel to beats' }, { status: 403 })
    }

    const body = await request.json()
    const supabase = createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('beat_personnel')
      .insert([{
        beat_id: body.beat_id,
        personnel_id: body.personnel_id,
        acceptance_status: body.acceptance_status || 'pending',
        assigned_at: body.assigned_at || new Date().toISOString()
      }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to assign personnel to beat' }, { status: 500 })
    }

    // Audit log for personnel assignment
    await supabase
      .from('audit_logs')
      .insert({
        table_name: 'beat_personnel',
        operation: 'INSERT',
        old_data: null,
        new_data: data,
        changed_by: user.id,
        changed_at: new Date().toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      })

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to assign personnel to beat' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Add authentication and authorization
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    // Validate user permissions (only superadmin can remove personnel from beats)
    const { data: profile, error: profileError } = await supabaseAuth
      .from('admin_accounts')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'superadmin') {
      return NextResponse.json({ error: 'Insufficient permissions - only superadmin can remove personnel from beats' }, { status: 403 })
    }

    const body = await request.json()
    const supabase = createServerSupabaseClient()
    
    // Get the current assignment for audit logging
    const { data: existingAssignment, error: fetchError } = await supabase
      .from('beat_personnel')
      .select('*')
      .eq('personnel_id', body.personnel_id)
      .eq('beat_id', body.beat_id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    // Delete the assignment
    const { error } = await supabase
      .from('beat_personnel')
      .delete()
      .eq('personnel_id', body.personnel_id)
      .eq('beat_id', body.beat_id)

    if (error) {
      return NextResponse.json({ error: 'Failed to remove personnel from beat' }, { status: 500 })
    }

    // Audit log for personnel removal
    await supabase
      .from('audit_logs')
      .insert({
        table_name: 'beat_personnel',
        operation: 'DELETE',
        old_data: existingAssignment,
        new_data: null,
        changed_by: user.id,
        changed_at: new Date().toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to remove personnel from beat' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Add authentication and authorization
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    // Validate user permissions (only superadmin can replace personnel in beats)
    const { data: profile, error: profileError } = await supabaseAuth
      .from('admin_accounts')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'superadmin') {
      return NextResponse.json({ error: 'Insufficient permissions - only superadmin can replace personnel in beats' }, { status: 403 })
    }

    const body = await request.json()
    const supabase = createServerSupabaseClient()
    
    // Get the current assignment for audit logging
    const { data: existingAssignment, error: fetchError } = await supabase
      .from('beat_personnel')
      .select('*')
      .eq('personnel_id', body.old_personnel_id)
      .eq('beat_id', body.beat_id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: 'Original assignment not found' }, { status: 404 })
    }

    // Handle personnel replacement properly:
    // 1. Remove/End the old assignment 
    // 2. Create new assignment for replacement
    // 3. Log the replacement in audit trail

    // First, remove the old assignment
    const { error: deleteError } = await supabase
      .from('beat_personnel')
      .delete()
      .eq('personnel_id', body.old_personnel_id)
      .eq('beat_id', body.beat_id)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to remove old personnel assignment' }, { status: 500 })
    }

    // Create new assignment for replacement personnel
    const { data: newAssignment, error: insertError } = await supabase
      .from('beat_personnel')
      .insert([{
        beat_id: body.beat_id,
        personnel_id: body.new_personnel_id,
        acceptance_status: 'pending',
        assigned_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (insertError) {
      // If new assignment fails, we need to restore the old one
      await supabase
        .from('beat_personnel')
        .insert([existingAssignment])
      
      return NextResponse.json({ error: 'Failed to create new personnel assignment' }, { status: 500 })
    }

    // Log the replacement in audit trail
    await supabase
      .from('audit_logs')
      .insert([
        // Log removal of old personnel
        {
          table_name: 'beat_personnel',
          operation: 'DELETE',
          old_data: existingAssignment,
          new_data: null,
          changed_by: user.id,
          changed_at: new Date().toISOString(),
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
          description: `Personnel replacement - removed personnel. Reason: ${body.reason || 'Personnel replacement'}`
        },
        // Log assignment of new personnel
        {
          table_name: 'beat_personnel',
          operation: 'INSERT',
          old_data: null,
          new_data: newAssignment,
          changed_by: user.id,
          changed_at: new Date().toISOString(),
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
          description: `Personnel replacement - assigned new personnel. Reason: ${body.reason || 'Personnel replacement'}`
        }
      ])

    // Also try to log in the dedicated replacement history table (if it exists)
    try {
      await supabase
        .from('personnel_replacement_history')
        .insert({
          beat_id: body.beat_id,
          old_personnel_id: body.old_personnel_id,
          new_personnel_id: body.new_personnel_id,
          replacement_reason: body.reason || 'Personnel replacement',
          replaced_at: new Date().toISOString()
        })
    } catch (historyError) {
      console.warn('Could not log to replacement history table (may not exist yet):', historyError)
      // Continue anyway - the main replacement still worked
    }

    return NextResponse.json({
      success: true,
      message: 'Personnel replaced successfully',
      old_assignment: existingAssignment,
      new_assignment: newAssignment,
      replaced_by: profile.full_name
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to replace personnel' }, { status: 500 })
  }
}
