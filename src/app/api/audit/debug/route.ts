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

    // Check if audit_logs table exists and get its structure
    const { data: tableInfo, error: tableError } = await supabaseAdmin
      .rpc('get_table_info', { table_name: 'audit_logs' })
      .single()

    if (tableError) {
      console.log('RPC not available, trying direct query...')
      
      // Fallback: Try to query the table directly
      const { data: auditSample, error: queryError } = await supabaseAdmin
        .from('audit_logs')
        .select('*')
        .limit(1)

      if (queryError) {
        return NextResponse.json({
          tableExists: false,
          error: queryError.message,
          suggestion: 'audit_logs table may not exist or RLS policies are blocking access'
        })
      }

      return NextResponse.json({
        tableExists: true,
        sampleData: auditSample,
        columns: auditSample && auditSample.length > 0 ? Object.keys(auditSample[0]) : [],
        totalRows: 'unknown'
      })
    }

    // Get real-time publication status
    const { data: pubStatus, error: pubError } = await supabaseAdmin
      .rpc('check_realtime_publication', { table_name: 'audit_logs' })

    return NextResponse.json({
      tableExists: true,
      tableInfo,
      realtimeEnabled: pubStatus || false,
      realtimeError: pubError?.message
    })

  } catch (error) {
    console.error('Error checking audit table:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}
