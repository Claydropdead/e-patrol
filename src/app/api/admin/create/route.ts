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

    const { rank, fullName, email, password, role, isActive, assignedRegion, assignedProvince, assignedUnit, assignedSubUnit } = await request.json()

    // Validate required fields
    if (!rank || !fullName || !email || !password || !role) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['superadmin', 'regional', 'provincial', 'station']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role specified' },
        { status: 400 }
      )
    }

    // Validate role-specific assignments
    if (role === 'regional' && (!assignedRegion || assignedRegion !== 'MIMAROPA')) {
      return NextResponse.json(
        { error: 'Regional admins must be assigned to MIMAROPA region' },
        { status: 400 }
      )
    }

    if (role === 'provincial' && (!assignedRegion || !assignedProvince)) {
      return NextResponse.json(
        { error: 'Provincial admins must have region and province assigned' },
        { status: 400 }
      )
    }

    if (role === 'station' && (!assignedRegion || !assignedProvince || !assignedSubUnit)) {
      return NextResponse.json(
        { error: 'Station admins must have region, province, and sub-unit assigned' },
        { status: 400 }
      )
    }

    // SECURITY: Prevent creating multiple superadmins without explicit approval
    if (role === 'superadmin') {
      const { data: existingSuperadmins } = await supabaseAdmin
        .from('admin_accounts')
        .select('id')
        .eq('role', 'superadmin')
        .eq('is_active', true)

      if (existingSuperadmins && existingSuperadmins.length >= 2) {
        return NextResponse.json(
          { error: 'Maximum number of active superadmins reached. Contact system administrator.' },
          { status: 400 }
        )
      }
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (authData.user) {
      // Prepare assignment fields based on role hierarchy
      let dbAssignments: {
        assigned_region: string | null
        assigned_province: string | null
        assigned_unit: string | null
        assigned_sub_unit: string | null
      }

      switch (role) {
        case 'superadmin':
          // Superadmin: All assignment fields are NULL
          dbAssignments = {
            assigned_region: null,
            assigned_province: null,
            assigned_unit: null,
            assigned_sub_unit: null
          }
          break
        
        case 'regional':
          // Regional: Only region assigned, rest are NULL
          dbAssignments = {
            assigned_region: assignedRegion,
            assigned_province: null,
            assigned_unit: null,
            assigned_sub_unit: null
          }
          break
        
        case 'provincial':
          // Provincial: Region and province assigned, unit and sub-unit are NULL
          dbAssignments = {
            assigned_region: assignedRegion,
            assigned_province: assignedProvince,
            assigned_unit: null,
            assigned_sub_unit: null
          }
          break
        
        case 'station':
          // Station: All fields assigned
          dbAssignments = {
            assigned_region: assignedRegion,
            assigned_province: assignedProvince,
            assigned_unit: assignedUnit || null,
            assigned_sub_unit: assignedSubUnit
          }
          break
        
        default:
          dbAssignments = {
            assigned_region: null,
            assigned_province: null,
            assigned_unit: null,
            assigned_sub_unit: null
          }
      }

      // Create admin account profile
      const { error: profileError } = await supabaseAdmin
        .from('admin_accounts')
        .insert({
          id: authData.user.id,
          rank,
          full_name: fullName,
          email,
          role,
          is_active: isActive ?? true,
          ...dbAssignments
        })

      if (profileError) {
        // If profile creation fails, delete the auth user
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        return NextResponse.json(
          { error: profileError.message },
          { status: 400 }
        )
      }

      return NextResponse.json({
        message: 'Admin account created successfully',
        user: {
          id: authData.user.id,
          email,
          role
        }
      })
    }

    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )

  } catch (error) {
    console.error('Error creating admin account:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
