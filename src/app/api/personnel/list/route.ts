import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a service role client for operations
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

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Verify the requesting user is authorized
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
    
    if (tokenError || !tokenUser?.user) {
      console.error('Token validation error:', tokenError)
      return NextResponse.json(
        { 
          error: 'Unauthorized - Token expired or invalid',
          code: 'TOKEN_EXPIRED',
          details: tokenError?.message || 'Invalid token'
        },
        { status: 401 }
      )
    }

    // Verify user role permissions (allow all authenticated admin users)
    const { data: userAccount, error: roleError } = await supabaseAdmin
      .from('admin_accounts')
      .select('role')
      .eq('id', tokenUser.user.id)
      .single()

    if (roleError || !userAccount) {
      return NextResponse.json(
        { error: 'Unauthorized - User account not found' },
        { status: 401 }
      )
    }

    // Allow superadmin, regional, provincial, station users to view personnel
    const allowedRoles = ['superadmin', 'regional', 'provincial', 'station']
    if (!allowedRoles.includes(userAccount.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      )
    }

    // Fetch personnel data (only basic info needed for assignments)
    const { data: personnel, error: personnelError } = await supabaseAdmin
      .from('personnel')
      .select('id, full_name, rank, unit, sub_unit')
      .eq('is_active', true)
      .order('full_name')

    if (personnelError) {
      console.error('Error fetching personnel:', personnelError)
      return NextResponse.json(
        { error: 'Failed to fetch personnel data' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: personnel,
      total: personnel.length
    })

  } catch (error) {
    console.error('Personnel API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
