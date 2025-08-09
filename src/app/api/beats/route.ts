import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/database/client';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: beatsData, error } = await supabase
      .from('beats')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase query error:', error)
      return NextResponse.json({ error: 'Failed to fetch beats' }, { status: 500 })
    }

    return NextResponse.json(beatsData || [])
  } catch (error) {
    console.error('Error fetching beats:', error)
    return NextResponse.json({ error: 'Failed to fetch beats' }, { status: 500 })
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

    // Validate user permissions (only superadmin can create beats)
    const { data: profile, error: profileError } = await supabaseAuth
      .from('admin_accounts')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'superadmin') {
      return NextResponse.json({ error: 'Insufficient permissions - only superadmin can create beats' }, { status: 403 })
    }

    const body = await request.json()
    const supabase = createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('beats')
      .insert([{
        name: body.name,
        center_lat: body.center_lat,
        center_lng: body.center_lng,
        radius_meters: body.radius,
        address: body.description,
        unit: body.unit,
        sub_unit: body.sub_unit
      }])
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: 'Failed to create beat' }, { status: 500 })
    }

    // Get assigned personnel information for audit log
    let assignedPersonnelInfo = []
    
    // Check if this beat will have personnel assigned (from the frontend call)
    // We'll check for beat_personnel entries created within the next few seconds
    setTimeout(async () => {
      try {
        const { data: personnelAssignments } = await supabase
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
          .eq('beat_id', data.id)

        if (personnelAssignments && personnelAssignments.length > 0) {
          // Update the audit log with personnel information
          const enhancedBeatData = {
            ...data,
            assigned_personnel: personnelAssignments.map(assignment => ({
              personnel_id: assignment.personnel_id,
              full_name: assignment.personnel?.full_name,
              rank: assignment.personnel?.rank,
              email: assignment.personnel?.email,
              acceptance_status: assignment.acceptance_status,
              assigned_at: assignment.assigned_at
            }))
          }

          // Update the existing audit log entry with personnel information
          await supabase
            .from('audit_logs')
            .update({
              new_data: enhancedBeatData
            })
            .eq('table_name', 'beats')
            .eq('operation', 'INSERT')
            .eq('changed_by', user.id)
            .order('changed_at', { ascending: false })
            .limit(1)
        }
      } catch (updateError) {
        console.error('Error updating audit log with personnel info:', updateError)
      }
    }, 2000) // Wait 2 seconds for personnel assignments to be created

    // Initial audit log for beat creation
    await supabase
      .from('audit_logs')
      .insert({
        table_name: 'beats',
        operation: 'INSERT',
        old_data: null,
        new_data: data,
        changed_by: user.id,
        changed_at: new Date().toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      })

    console.log(`Beat ${data.id} (${data.name}) created by user ${user.id}`)

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating beat:', error)
    return NextResponse.json({ error: 'Failed to create beat' }, { status: 500 })
  }
}
