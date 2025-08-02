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
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const userType = searchParams.get('type') || 'all' // 'admin', 'personnel', or 'all'
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || 'all'
    const status = searchParams.get('status') || 'all'

    const responses: {
      adminUsers?: AdminAccount[]
      personnelUsers?: Personnel[]
    } = {}

    // Fetch admin users if requested
    if (userType === 'admin' || userType === 'all') {
      let adminQuery = supabaseAdmin
        .from('admin_accounts')
        .select('*')
        .order('created_at', { ascending: false })

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
    }

    // Fetch personnel if requested
    if (userType === 'personnel' || userType === 'all') {
      let personnelQuery = supabaseAdmin
        .from('personnel')
        .select('*')
        .order('created_at', { ascending: false })

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
        // Toggle user active status
        const { data: currentUser } = await supabaseAdmin
          .from(tableName)
          .select('is_active')
          .eq('id', userId)
          .single()

        if (!currentUser) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          )
        }

        const { data: updatedUser, error: updateError } = await supabaseAdmin
          .from(tableName)
          .update({ 
            is_active: !currentUser.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select()
          .single()

        if (updateError) {
          return NextResponse.json(
            { error: 'Failed to update user status' },
            { status: 500 }
          )
        }

        result = updatedUser
        break

      case 'update':
        // Update user data
        const { error: updateDataError } = await supabaseAdmin
          .from(tableName)
          .update({ 
            ...data,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)

        if (updateDataError) {
          return NextResponse.json(
            { error: 'Failed to update user' },
            { status: 500 }
          )
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

    // Get current user status
    const { data: currentUser, error: fetchError } = await supabaseAdmin
      .from(tableName)
      .select('is_active, full_name')
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

      operation = 'permanently deleted'
      result = { 
        message: `User ${currentUser.full_name} has been permanently deleted`,
        type: 'permanent',
        user: currentUser
      }
    } else if (currentUser.is_active) {
      // Soft delete - deactivate active user
      const { error: updateError } = await supabaseAdmin
        .from(tableName)
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (updateError) {
        console.error('Error deactivating user:', updateError)
        return NextResponse.json(
          { error: 'Failed to deactivate user' },
          { status: 500 }
        )
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
