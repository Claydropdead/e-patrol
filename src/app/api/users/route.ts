import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Types matching the database schema
interface AdminAccount {
  id: string
  rank: string
  full_name: string
  email: string
  role: 'superadmin' | 'regional' | 'provincial' | 'station'
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Personnel {
  id: string
  rank: string
  full_name: string
  email: string
  contact_number?: string
  region: string
  province: string
  unit: string
  sub_unit: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Create a service role client for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // This bypasses RLS
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

    // Verify user role permissions (allow superadmin, regional, provincial, station)
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

    // Only superadmin can view users
    if (userAccount.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Forbidden - Only superadmin can access user management' },
        { status: 403 }
      )
    }

    // Get query parameters with pagination support
    const searchParams = request.nextUrl.searchParams
    const userType = searchParams.get('type') || 'all' // 'admin', 'personnel', or 'all'
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || 'all'
    const status = searchParams.get('status') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Calculate offset for pagination
    const offset = (page - 1) * limit

    const responses: {
      adminUsers?: AdminAccount[]
      personnelUsers?: Personnel[]
      totalAdminUsers?: number
      totalPersonnelUsers?: number
      pagination?: {
        page: number
        limit: number
        total: number
        totalPages: number
      }
    } = {}

    // Fetch admin users if requested
    if (userType === 'admin' || userType === 'all') {
      // First get the total count for pagination
      let countQuery = supabaseAdmin
        .from('admin_accounts')
        .select('*', { count: 'exact', head: true })

      // Apply same filters for count
      if (search) {
        countQuery = countQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,rank.ilike.%${search}%`)
      }
      if (role !== 'all') {
        countQuery = countQuery.eq('role', role)
      }
      if (status !== 'all') {
        const isActive = status === 'active'
        countQuery = countQuery.eq('is_active', isActive)
      }

      const { count: totalAdminCount } = await countQuery

      // Then get the paginated data
      let adminQuery = supabaseAdmin
        .from('admin_accounts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // Apply search filter
      if (search) {
        adminQuery = adminQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,rank.ilike.%${search}%`)
      }

      // Apply role filter
      if (role !== 'all') {
        adminQuery = adminQuery.eq('role', role)
      }

      // Apply status filter
      if (status !== 'all') {
        const isActive = status === 'active'
        adminQuery = adminQuery.eq('is_active', isActive)
      }

      const { data: adminUsers, error: adminError } = await adminQuery

      if (adminError) {
        console.error('Error fetching admin users:', adminError)
        return NextResponse.json(
          { error: 'Failed to fetch admin users' },
          { status: 500 }
        )
      }

      responses.adminUsers = adminUsers
      responses.totalAdminUsers = totalAdminCount || 0
    }

    // Fetch personnel if requested
    if (userType === 'personnel' || userType === 'all') {
      // First get the total count for pagination
      let countQuery = supabaseAdmin
        .from('personnel')
        .select('*', { count: 'exact', head: true })

      // Apply same filters for count
      if (search) {
        countQuery = countQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,rank.ilike.%${search}%,contact_number.ilike.%${search}%,province.ilike.%${search}%,sub_unit.ilike.%${search}%`)
      }
      if (status !== 'all') {
        const isActive = status === 'active'
        countQuery = countQuery.eq('is_active', isActive)
      }

      const { count: totalPersonnelCount } = await countQuery

      // Then get the paginated data
      let personnelQuery = supabaseAdmin
        .from('personnel')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // Apply search filter
      if (search) {
        personnelQuery = personnelQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,rank.ilike.%${search}%,contact_number.ilike.%${search}%,province.ilike.%${search}%,sub_unit.ilike.%${search}%`)
      }

      // Apply status filter
      if (status !== 'all') {
        const isActive = status === 'active'
        personnelQuery = personnelQuery.eq('is_active', isActive)
      }

      const { data: personnelUsers, error: personnelError } = await personnelQuery

      if (personnelError) {
        console.error('Error fetching personnel:', personnelError)
        return NextResponse.json(
          { error: 'Failed to fetch personnel' },
          { status: 500 }
        )
      }

      responses.personnelUsers = personnelUsers
      responses.totalPersonnelUsers = totalPersonnelCount || 0
    }

    return NextResponse.json(responses)

  } catch (error) {
    console.error('Error in users API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

    // Verify user role permissions
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

    // Only superadmin can update users
    if (userAccount.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Forbidden - Only superadmin can modify users' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    const { userId, userType, action, data } = body

    if (!userId || !userType || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, userType, action' },
        { status: 400 }
      )
    }

    let result
    const tableName = userType === 'admin' ? 'admin_accounts' : 'personnel'

    switch (action) {
      case 'toggle_status':
        // Get current user data for audit trail
        const { data: currentUser, error: currentUserError } = await supabaseAdmin
          .from(tableName)
          .select('*')
          .eq('id', userId)
          .single()

        if (currentUserError || !currentUser) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          )
        }

        const updateData: { is_active: boolean; updated_at?: string } = { 
          is_active: !currentUser.is_active
        }
        
        // Only add updated_at for admin_accounts table (personnel table might not have this column)
        if (tableName === 'admin_accounts') {
          updateData.updated_at = new Date().toISOString()
        }

        const { data: updatedUser, error: updateError } = await supabaseAdmin
          .from(tableName)
          .update(updateData)
          .eq('id', userId)
          .select()
          .single()

        if (updateError) {
          return NextResponse.json(
            { error: 'Failed to update user status' },
            { status: 500 }
          )
        }

        // Log the audit trail
        try {
          await supabaseAdmin
            .from('audit_logs')
            .insert({
              table_name: tableName,
              operation: 'UPDATE',
              old_data: currentUser,
              new_data: updatedUser,
              changed_by: tokenUser.user.id,
              changed_at: new Date().toISOString(),
              ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
              user_agent: request.headers.get('user-agent') || 'unknown'
            })
        } catch (auditError) {
          console.error('Error logging audit trail:', auditError)
          // Don't fail the main operation due to audit logging failure
        }

        result = updatedUser
        break

      case 'update':
        // Get current user data for audit trail
        const { data: currentUpdateUser, error: currentUpdateError } = await supabaseAdmin
          .from(tableName)
          .select('*')
          .eq('id', userId)
          .single()

        if (currentUpdateError || !currentUpdateUser) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          )
        }

        // Update user data
        const updatePayload: Record<string, unknown> = { ...data }
        
        // Only add updated_at for admin_accounts table (personnel table might not have this column)
        if (tableName === 'admin_accounts') {
          updatePayload.updated_at = new Date().toISOString()
        }

        const { data: newUpdatedUser, error: updateDataError } = await supabaseAdmin
          .from(tableName)
          .update(updatePayload)
          .eq('id', userId)
          .select()
          .single()

        if (updateDataError) {
          return NextResponse.json(
            { error: 'Failed to update user' },
            { status: 500 }
          )
        }

        // Log the audit trail
        try {
          await supabaseAdmin
            .from('audit_logs')
            .insert({
              table_name: tableName,
              operation: 'UPDATE',
              old_data: currentUpdateUser,
              new_data: newUpdatedUser,
              changed_by: tokenUser.user.id,
              changed_at: new Date().toISOString(),
              ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
              user_agent: request.headers.get('user-agent') || 'unknown'
            })
        } catch (auditError) {
          console.error('Error logging audit trail:', auditError)
          // Don't fail the main operation due to audit logging failure
        }

        result = { message: 'User updated successfully' }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

    // Verify user role permissions
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

    // Only superadmin can delete users
    if (userAccount.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('id')
    const userType = searchParams.get('type')
    const force = searchParams.get('force') === 'true' // For permanent deletion

    if (!userId || !userType) {
      return NextResponse.json(
        { error: 'Missing required parameters: id, type' },
        { status: 400 }
      )
    }

    const tableName = userType === 'admin' ? 'admin_accounts' : 'personnel'

    // Get current user status and full data for audit trail
    const { data: currentUser, error: fetchError } = await supabaseAdmin
      .from(tableName)
      .select('*')
      .eq('id', userId)
      .single()

    if (fetchError || !currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    let operation = ''
    let result

    if (force) {
      // Permanent deletion - only for inactive users or when explicitly forced
      const { error: deleteError } = await supabaseAdmin
        .from(tableName)
        .delete()
        .eq('id', userId)

      if (deleteError) {
        console.error('Error permanently deleting user:', deleteError)
        return NextResponse.json(
          { error: 'Failed to permanently delete user' },
          { status: 500 }
        )
      }

      // Log the audit trail for permanent deletion
      try {
        await supabaseAdmin
          .from('audit_logs')
          .insert({
            table_name: tableName,
            operation: 'DELETE',
            old_data: currentUser,
            new_data: null,
            changed_by: tokenUser.user.id,
            changed_at: new Date().toISOString(),
            ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
            user_agent: request.headers.get('user-agent') || 'unknown'
          })
      } catch (auditError) {
        console.error('Error logging audit trail:', auditError)
        // Don't fail the main operation due to audit logging failure
      }

      operation = 'permanently deleted'
      result = { 
        message: `User ${currentUser.full_name} has been permanently deleted`,
        type: 'permanent',
        user: currentUser
      }
    } else if (currentUser.is_active) {
      // Soft delete - deactivate active user
      const updateData: { is_active: boolean; updated_at?: string } = { 
        is_active: false
      }
      
      // Only add updated_at for admin_accounts table (personnel table might not have this column)
      if (tableName === 'admin_accounts') {
        updateData.updated_at = new Date().toISOString()
      }

      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from(tableName)
        .update(updateData)
        .eq('id', userId)
        .select()
        .single()

      if (updateError) {
        console.error('Error deactivating user:', updateError)
        return NextResponse.json(
          { error: 'Failed to deactivate user' },
          { status: 500 }
        )
      }

      // Log the audit trail for deactivation
      try {
        await supabaseAdmin
          .from('audit_logs')
          .insert({
            table_name: tableName,
            operation: 'UPDATE',
            old_data: currentUser,
            new_data: updatedUser,
            changed_by: tokenUser.user.id,
            changed_at: new Date().toISOString(),
            ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
            user_agent: request.headers.get('user-agent') || 'unknown'
          })
      } catch (auditError) {
        console.error('Error logging audit trail:', auditError)
        // Don't fail the main operation due to audit logging failure
      }

      operation = 'deactivated'
      result = { 
        message: `User ${currentUser.full_name} has been deactivated`,
        type: 'deactivated',
        user: { ...currentUser, is_active: false }
      }
    } else {
      // User is already inactive - offer permanent deletion
      const { error: deleteError } = await supabaseAdmin
        .from(tableName)
        .delete()
        .eq('id', userId)

      if (deleteError) {
        console.error('Error permanently deleting inactive user:', deleteError)
        return NextResponse.json(
          { error: 'Failed to permanently delete user' },
          { status: 500 }
        )
      }

      // Log the audit trail for permanent deletion of inactive user
      try {
        await supabaseAdmin
          .from('audit_logs')
          .insert({
            table_name: tableName,
            operation: 'DELETE',
            old_data: currentUser,
            new_data: null,
            changed_by: tokenUser.user.id,
            changed_at: new Date().toISOString(),
            ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
            user_agent: request.headers.get('user-agent') || 'unknown'
          })
      } catch (auditError) {
        console.error('Error logging audit trail:', auditError)
        // Don't fail the main operation due to audit logging failure
      }

      operation = 'permanently deleted'
      result = { 
        message: `Inactive user ${currentUser.full_name} has been permanently deleted`,
        type: 'permanent',
        user: currentUser
      }
    }

    console.log(`User ${operation}:`, currentUser.full_name)
    return NextResponse.json(result)

  } catch (error) {
    console.error('Error in delete user API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
