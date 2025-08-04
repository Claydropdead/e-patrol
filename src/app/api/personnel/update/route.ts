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

    // Get current personnel data for assignment history comparison
    const { data: currentPersonnel, error: getCurrentError } = await supabaseAdmin
      .from('personnel')
      .select('unit, sub_unit, province')
      .eq('id', userId)
      .single()

    if (getCurrentError) {
      return NextResponse.json(
        { error: 'Personnel not found' },
        { status: 404 }
      )
    }

    // Check if assignment is changing
    const assignmentChanged = (
      currentPersonnel.unit !== updates.unit ||
      currentPersonnel.sub_unit !== updates.sub_unit ||
      currentPersonnel.province !== updates.province
    )

    // Update personnel record
    const { data: updatedPersonnel, error: updateError } = await supabaseAdmin
      .from('personnel')
      .update({
        rank: updates.rank,
        full_name: updates.full_name,
        email: updates.email,
        contact_number: updates.contact_number,
        province: updates.province,
        unit: updates.unit,
        sub_unit: updates.sub_unit,
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

    // If assignment changed, create assignment history record
    if (assignmentChanged) {
      // Require reassignment reason when changing assignment
      if (!updates.reassignment_reason || updates.reassignment_reason.trim() === '') {
        return NextResponse.json(
          { error: 'Reassignment reason is required when changing unit assignment' },
          { status: 400 }
        )
      }

      const { error: historyError } = await supabaseAdmin
        .from('personnel_assignment_history')
        .insert({
          personnel_id: userId,
          previous_unit: currentPersonnel.unit,
          previous_sub_unit: currentPersonnel.sub_unit,
          previous_province: currentPersonnel.province,
          new_unit: updates.unit,
          new_sub_unit: updates.sub_unit,
          new_province: updates.province,
          assigned_by: tokenUser.user.id,
          reason: updates.reassignment_reason.trim(),
          notes: updates.reassignment_notes?.trim() || null
        })

      if (historyError) {
        console.error('Error creating assignment history:', historyError)
        return NextResponse.json(
          { error: 'Failed to create assignment history record' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      message: 'Personnel updated successfully',
      personnel: updatedPersonnel,
      assignmentChanged
    })

  } catch (error) {
    console.error('Error updating personnel:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get assignment history for a personnel
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const personnelId = searchParams.get('personnelId')

    if (!personnelId) {
      return NextResponse.json(
        { error: 'Personnel ID is required' },
        { status: 400 }
      )
    }

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

    // Optimized: Single query with JOIN using the correct foreign key relationship
    const { data: history, error: historyError } = await supabaseAdmin
      .from('personnel_assignment_history')
      .select(`
        *,
        assigned_by_admin:admin_accounts!personnel_assignment_history_assigned_by_admin_fkey(
          full_name,
          rank
        )
      `)
      .eq('personnel_id', personnelId)
      .order('assignment_date', { ascending: false })

    if (historyError) {
      console.error('Assignment history query error:', historyError)
      
      // Fallback to the old method if JOIN fails
      console.log('Falling back to separate queries...')
      const { data: basicHistory, error: basicError } = await supabaseAdmin
        .from('personnel_assignment_history')
        .select('*')
        .eq('personnel_id', personnelId)
        .order('assignment_date', { ascending: false })

      if (basicError) {
        return NextResponse.json(
          { error: basicError.message },
          { status: 400 }
        )
      }

      // Get admin details in a single batch query
      const adminIds = [...new Set(basicHistory?.map(h => h.assigned_by).filter(Boolean) || [])]
      let adminDetails: any = {}
      
      if (adminIds.length > 0) {
        const { data: admins } = await supabaseAdmin
          .from('admin_accounts')
          .select('id, full_name, rank')
          .in('id', adminIds)
        
        adminDetails = (admins || []).reduce((acc: any, admin: any) => {
          acc[admin.id] = { full_name: admin.full_name, rank: admin.rank }
          return acc
        }, {})
      }

      const historyWithAdmins = (basicHistory || []).map(record => ({
        ...record,
        assigned_by_admin: record.assigned_by ? adminDetails[record.assigned_by] || null : null
      }))

      return NextResponse.json({
        history: historyWithAdmins
      })
    }

    return NextResponse.json({
      history: history || []
    })

  } catch (error) {
    console.error('Error fetching assignment history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
