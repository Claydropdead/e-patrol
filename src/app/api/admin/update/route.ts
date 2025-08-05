import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized - No authentication token' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: tokenUser, error: tokenError } = await supabaseAdmin.auth.getUser(token)
    
    if (tokenError || !tokenUser.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

    // Verify superadmin access
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

    const { userId, updates } = await request.json()

    if (!userId || !updates) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and updates' },
        { status: 400 }
      )
    }

    // Get the current admin account data for audit trail
    const { data: currentAdmin, error: fetchError } = await supabaseAdmin
      .from('admin_accounts')
      .select('*')
      .eq('id', userId)
      .single()

    if (fetchError || !currentAdmin) {
      return NextResponse.json(
        { error: 'Admin account not found' },
        { status: 404 }
      )
    }

    // Update admin account
    const { data: updatedAdmin, error: updateError } = await supabaseAdmin
      .from('admin_accounts')
      .update({
        rank: updates.rank,
        full_name: updates.full_name,
        email: updates.email,
        role: updates.role,
        is_active: updates.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      )
    }

    // Log the audit trail
    try {
      await supabaseAdmin
        .from('audit_logs')
        .insert({
          table_name: 'admin_accounts',
          operation: 'UPDATE',
          old_data: currentAdmin,
          new_data: updatedAdmin,
          changed_by: tokenUser.user.id,
          changed_at: new Date().toISOString(),
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown'
        })
    } catch (auditError) {
      console.error('Error logging audit trail:', auditError)
      // Don't fail the main operation due to audit logging failure
    }

    return NextResponse.json({
      message: 'Admin account updated successfully',
      admin: updatedAdmin
    })

  } catch (error) {
    console.error('Error updating admin account:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
