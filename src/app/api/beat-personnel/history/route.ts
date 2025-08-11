import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/database/client';

export async function GET(request: NextRequest) {
  try {
    // Add authentication and authorization
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    // Validate user permissions (allow superadmin, regional, provincial, station)
    const { data: profile, error: profileError } = await supabaseAuth
      .from('admin_accounts')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User account not found' }, { status: 401 })
    }

    const allowedRoles = ['superadmin', 'regional', 'provincial', 'station']
    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const beatId = searchParams.get('beat_id')
    
    if (!beatId) {
      return NextResponse.json({ error: 'beat_id parameter is required' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    
    // Get replacement history from the dedicated table with simpler joins
    const { data: replacementHistory, error: replaceError } = await supabase
      .from('personnel_replacement_history')
      .select(`
        id,
        beat_id,
        old_personnel_id,
        new_personnel_id,
        replacement_reason,
        replaced_at
      `)
      .eq('beat_id', beatId)
      .order('replaced_at', { ascending: false })

    if (replaceError) {
      console.error('Error fetching replacement history:', replaceError)
      return NextResponse.json({ 
        error: 'Failed to fetch replacement history' 
      }, { status: 500 })
    }

    // Get personnel details separately to avoid complex join issues
    const personnelIds = new Set()
    replacementHistory?.forEach(record => {
      if (record.old_personnel_id) personnelIds.add(record.old_personnel_id)
      if (record.new_personnel_id) personnelIds.add(record.new_personnel_id)
    })

    let personnelMap = new Map()
    if (personnelIds.size > 0) {
      const { data: personnel, error: personnelError } = await supabase
        .from('personnel')
        .select('id, full_name, rank, email')
        .in('id', Array.from(personnelIds))

      if (!personnelError && personnel) {
        personnel.forEach(p => personnelMap.set(p.id, p))
      }
    }

    // Transform the data into a readable format
    const history = (replacementHistory || []).map((record: any) => {
      const oldPersonnel = personnelMap.get(record.old_personnel_id)
      const newPersonnel = personnelMap.get(record.new_personnel_id)
      
      return {
        type: 'replacement',
        id: record.id,
        timestamp: record.replaced_at,
        oldPersonnel: oldPersonnel ? {
          id: oldPersonnel.id,
          name: `${oldPersonnel.rank} ${oldPersonnel.full_name}`,
          email: oldPersonnel.email
        } : null,
        newPersonnel: newPersonnel ? {
          id: newPersonnel.id,
          name: `${newPersonnel.rank} ${newPersonnel.full_name}`,
          email: newPersonnel.email
        } : null,
        reason: record.replacement_reason || 'No reason provided'
      }
    })

    return NextResponse.json({
      success: true,
      data: history,
      total: history.length
    })

  } catch (error) {
    console.error('Replacement history API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
