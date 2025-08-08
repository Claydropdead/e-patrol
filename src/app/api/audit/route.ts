import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Use service role key for admin operations
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const table = searchParams.get('table') || ''
    const operation = searchParams.get('operation') || ''
    const userId = searchParams.get('userId') || ''

    // First, let's test if the audit_logs table exists by doing a simple query
    try {
      const { data: testData, error: testError } = await supabaseAdmin
        .from('audit_logs')
        .select('*')
        .limit(1)

      if (testError) {
        console.error('Audit logs table test error:', testError)
        return NextResponse.json(
          { error: `Database error: ${testError.message}` },
          { status: 400 }
        )
      }

      // If we get here, the table exists. Let's check what columns are available
      const sampleRecord = testData?.[0]
      console.log('Sample audit log record structure:', sampleRecord ? Object.keys(sampleRecord) : 'No records found')

    } catch (error) {
      console.error('Error testing audit_logs table:', error)
      return NextResponse.json(
        { error: 'Failed to access audit_logs table' },
        { status: 500 }
      )
    }

    // Build a safe query using the correct column names from your database
    let query = supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('changed_at', { ascending: false })  // Use changed_at instead of created_at

    // Apply filters safely
    if (table && table !== 'all') {
      query = query.eq('table_name', table)
    }
    if (operation && operation !== 'all') {
      query = query.eq('operation', operation)
    }
    if (userId) {
      query = query.eq('changed_by', userId)  // Use changed_by instead of user_id
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data: auditLogs, error: auditError, count } = await query
      .range(from, to)

    if (auditError) {
      console.error('Audit logs query error:', auditError)
      return NextResponse.json(
        { error: `Query error: ${auditError.message}` },
        { status: 400 }
      )
    }

    console.log('Successfully fetched audit logs:', auditLogs?.length || 0, 'records')

    // Process audit logs to include user names (enhanced lookup from ALL user tables)
    const userIds = [...new Set((auditLogs || []).map((log: Record<string, unknown>) => log.changed_by).filter(Boolean))]
    
    const [adminUsers, regularUsers, personnelUsers] = await Promise.all([
      // Get admin user names
      userIds.length > 0 
        ? supabaseAdmin
            .from('admin_accounts')
            .select('id, full_name')
            .in('id', userIds)
        : { data: [] },
      // Get regular user names  
      userIds.length > 0
        ? supabaseAdmin
            .from('users')
            .select('id, full_name')
            .in('id', userIds)
        : { data: [] },
      // Get personnel names (they might also make changes)
      userIds.length > 0
        ? supabaseAdmin
            .from('personnel')
            .select('id, full_name')
            .in('id', userIds)
        : { data: [] }
    ])

    // Create lookup map for user names (prioritize admin_accounts, then users, then personnel)
    const userNameMap: Record<string, string> = {}
    
    ;(adminUsers.data || []).forEach((user: Record<string, unknown>) => {
      if (user.full_name && typeof user.full_name === 'string' && typeof user.id === 'string') {
        userNameMap[user.id] = user.full_name
      }
    })
    
    ;(regularUsers.data || []).forEach((user: Record<string, unknown>) => {
      if (user.full_name && typeof user.full_name === 'string' && typeof user.id === 'string' && !userNameMap[user.id]) {
        userNameMap[user.id] = user.full_name
      }
    })

    ;(personnelUsers.data || []).forEach((user: Record<string, unknown>) => {
      if (user.full_name && typeof user.full_name === 'string' && typeof user.id === 'string' && !userNameMap[user.id]) {
        userNameMap[user.id] = user.full_name
      }
    })

    // Return data structure using correct field names with user names
    const processedLogs = (auditLogs || []).map((log: Record<string, unknown>) => ({
      id: log.id,
      changed_at: log.changed_at,
      table_name: log.table_name,
      operation: log.operation,
      old_data: log.old_data,
      new_data: log.new_data,
      changed_by: log.changed_by,
      changed_by_name: userNameMap[log.changed_by as string] || null
    }))

    return NextResponse.json({
      data: processedLogs,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      debug: {
        sampleRecord: auditLogs?.[0] ? Object.keys(auditLogs[0]) : 'No records'
      }
    })

  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}

// Get audit statistics
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Verify superadmin access (same as GET)
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

    const { action } = await request.json()

    if (action === 'cleanup') {
      // Run audit log cleanup
      const { data: deletedCount, error: cleanupError } = await supabaseAdmin
        .rpc('cleanup_old_audit_logs', { days_to_keep: 365 })

      if (cleanupError) {
        return NextResponse.json(
          { error: cleanupError.message },
          { status: 400 }
        )
      }

      return NextResponse.json({
        message: `Cleaned up ${deletedCount} old audit log entries`,
        deletedCount
      })
    }

    if (action === 'stats') {
      // Get audit statistics with optimized queries
      const [totalResult, recentResult] = await Promise.all([
        // Fast count using estimated count for large tables
        supabaseAdmin
          .from('audit_logs')
          .select('*', { count: 'estimated', head: true }),
        
        // Count recent activity (last 24 hours) - use changed_at
        supabaseAdmin
          .from('audit_logs')
          .select('*', { count: 'exact', head: true })
          .gte('changed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      ])

      return NextResponse.json({
        totalAuditEntries: totalResult.count || 0,
        recentActivity: recentResult.count || 0,
        tableActivity: [] // Simplified for performance
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error processing audit request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
