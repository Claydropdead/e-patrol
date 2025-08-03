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

    // Build optimized query with selective fields
    let query = supabaseAdmin
      .from('audit_logs')
      .select('changed_at, table_name, operation, new_data, changed_by', { count: 'exact' })
      .order('changed_at', { ascending: false })

    // Apply filters with indexed columns first for better performance
    if (table && table !== 'all') {
      query = query.eq('table_name', table)
    }
    if (operation && operation !== 'all') {
      query = query.eq('operation', operation)
    }
    if (userId) {
      query = query.eq('changed_by', userId)
    }

    // Apply pagination with limit first for better performance
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data: auditLogs, error: auditError, count } = await query
      .range(from, to)

    if (auditError) {
      return NextResponse.json(
        { error: auditError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      data: auditLogs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
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
        
        // Count recent activity (last 24 hours)
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
