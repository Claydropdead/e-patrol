import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Use service role for authentication operations
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

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Get personnel details from personnel table
    const { data: personnel, error: personnelError } = await supabaseAdmin
      .from('personnel')
      .select('*')
      .eq('id', authData.user.id)
      .eq('is_active', true)
      .single()

    if (personnelError || !personnel) {
      return NextResponse.json(
        { error: 'Personnel account not found or inactive' },
        { status: 404 }
      )
    }

    // Create audit log for mobile login
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        table_name: 'personnel',
        operation: 'LOGIN',
        old_data: null,
        new_data: { 
          login_type: 'mobile',
          personnel_id: personnel.id,
          email: personnel.email 
        },
        changed_by: personnel.id,
        changed_at: new Date().toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        assignment_change: false
      })

    return NextResponse.json({
      success: true,
      session: authData.session,
      user: {
        id: personnel.id,
        email: personnel.email,
        full_name: personnel.full_name,
        rank: personnel.rank,
        contact_number: personnel.contact_number,
        province: personnel.province,
        unit: personnel.unit,
        sub_unit: personnel.sub_unit,
        role: 'Personnel'
      }
    })

  } catch (error) {
    console.error('Mobile login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
