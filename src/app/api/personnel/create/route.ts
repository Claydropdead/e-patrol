import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // This is the service role key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Verify the requesting user is an authorized superadmin
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized - No authentication token' },
        { status: 401 }
      )
    }

    // Extract token and verify with Supabase
    const token = authHeader.replace('Bearer ', '')
    const { data: tokenUser, error: tokenError } = await supabaseAdmin.auth.getUser(token)
    
    if (tokenError || !tokenUser.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

    // Verify the user is an active superadmin
    const { data: adminCheck, error: adminError } = await supabaseAdmin
      .from('admin_accounts')
      .select('role, is_active')
      .eq('id', tokenUser.user.id)
      .eq('role', 'superadmin')
      .eq('is_active', true)
      .single()

    if (adminError || !adminCheck) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient privileges' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { rank, full_name, email, contact_number, province, unit, sub_unit } = body

    // Validate required fields
    if (!rank || !full_name || !email || !province || !unit || !sub_unit) {
      return NextResponse.json(
        { error: 'Missing required fields: rank, full_name, email, province, unit, sub_unit' },
        { status: 400 }
      )
    }

    // Create personnel record
    const { data: personnel, error: createError } = await supabaseAdmin
      .from('personnel')
      .insert({
        rank,
        full_name,
        email,
        contact_number: contact_number || null,
        province,
        unit,
        sub_unit,
        created_by: tokenUser.user.id
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating personnel:', createError)
      
      if (createError.code === '23505') {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create personnel account' },
        { status: 500 }
      )
    }

    // Log the creation in audit_logs with correct field names
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        table_name: 'personnel',
        operation: 'INSERT',
        old_data: null,
        new_data: personnel,
        changed_by: tokenUser.user.id,
        changed_at: new Date().toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        assignment_change: false
      })

    return NextResponse.json({
      message: 'Personnel account created successfully',
      personnel: {
        id: personnel.id,
        rank: personnel.rank,
        full_name: personnel.full_name,
        email: personnel.email,
        contact_number: personnel.contact_number,
        province: personnel.province,
        unit: personnel.unit,
        sub_unit: personnel.sub_unit,
        is_active: personnel.is_active,
        created_at: personnel.created_at
      }
    })

  } catch (error) {
    console.error('Error creating personnel account:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
