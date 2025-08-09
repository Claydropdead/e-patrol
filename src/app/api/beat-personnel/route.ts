import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/database/client';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    
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
      console.error('Supabase query error:', error)
      return NextResponse.json({ error: 'Failed to fetch beat personnel' }, { status: 500 })
    }

    return NextResponse.json(beatPersonnelData || [])
  } catch (error) {
    console.error('Error fetching beat personnel:', error)
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
      console.error('Supabase insert error:', error)
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

    console.log(`Personnel ${data.personnel_id} assigned to beat ${data.beat_id} by user ${user.id}`)

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error assigning personnel to beat:', error)
    return NextResponse.json({ error: 'Failed to assign personnel to beat' }, { status: 500 })
  }
}
