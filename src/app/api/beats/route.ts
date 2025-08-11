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
        sub_unit: body.sub_unit,
        duty_start_time: body.duty_start_time || null,
        duty_end_time: body.duty_end_time || null
      }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to create beat' }, { status: 500 })
    }

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

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create beat' }, { status: 500 })
  }
}
