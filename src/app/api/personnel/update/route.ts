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

export async function PUT(request: NextRequest) {
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

    // Parse request body
    const body = await request.json()
    const { userId, updates } = body

    console.log('Personnel update request:', { userId, updates })

    if (!userId || !updates) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, updates' },
        { status: 400 }
      )
    }

    // Get current personnel data for assignment history comparison
    const { data: currentPersonnel, error: getCurrentError } = await supabaseAdmin
      .from('personnel')
      .select('*')
      .eq('id', userId)
      .single()

    console.log('Current personnel lookup:', { currentPersonnel, getCurrentError })

    if (getCurrentError || !currentPersonnel) {
      console.error('Personnel not found:', getCurrentError)
      return NextResponse.json(
        { error: 'Personnel not found' },
        { status: 404 }
      )
    }

    // Check if assignment changed (for history tracking)
    const assignmentChanged = (
      currentPersonnel.unit !== updates.unit ||
      currentPersonnel.sub_unit !== updates.sub_unit ||
      currentPersonnel.province !== updates.province
    )

    // Separate personnel updates from reassignment data
    const { reassignment_reason, reassignment_notes: _reassignmentNotes, ...personnelUpdates } = updates

    // Update personnel record (excluding reassignment fields)
    const { data: updatedPersonnel, error: updateError } = await supabaseAdmin
      .from('personnel')
      .update({
        ...personnelUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    console.log('Personnel update result:', { updatedPersonnel, updateError })

    if (updateError) {
      console.error('Error updating personnel:', updateError)
      return NextResponse.json(
        { error: `Failed to update personnel: ${updateError.message}` },
        { status: 500 }
      )
    }

    // If assignment changed, add to assignment history
    if (assignmentChanged) {
      await supabaseAdmin
        .from('personnel_assignment_history')
        .insert({
          personnel_id: userId,
          previous_unit: currentPersonnel.unit,
          previous_sub_unit: currentPersonnel.sub_unit,
          previous_province: currentPersonnel.province,
          new_unit: personnelUpdates.unit || currentPersonnel.unit,
          new_sub_unit: personnelUpdates.sub_unit || currentPersonnel.sub_unit,
          new_province: personnelUpdates.province || currentPersonnel.province,
          changed_by: tokenUser.user.id,
          reason: reassignment_reason || 'Administrative update'
        })
    }

    // Log the update in audit_logs
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'UPDATE_PERSONNEL',
        user_id: tokenUser.user.id,
        details: {
          personnel_id: userId,
          personnel_email: updatedPersonnel.email,
          changes: personnelUpdates,
          assignment_changed: assignmentChanged
        }
      })

    return NextResponse.json({
      message: 'Personnel updated successfully',
      personnel: updatedPersonnel,
      assignment_changed: assignmentChanged
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
    const searchParams = request.nextUrl.searchParams
    const personnelId = searchParams.get('personnelId')

    if (!personnelId) {
      return NextResponse.json(
        { error: 'Missing personnelId parameter' },
        { status: 400 }
      )
    }

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
    
    if (tokenError || !tokenUser.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

    // Verify the user is an active admin
    const { data: adminCheck, error: adminError } = await supabaseAdmin
      .from('admin_accounts')
      .select('role, is_active')
      .eq('id', tokenUser.user.id)
      .eq('is_active', true)
      .single()

    if (adminError || !adminCheck) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient privileges' },
        { status: 403 }
      )
    }

    // Get assignment history
    console.log('Fetching assignment history for personnel:', personnelId)
    
    const { data: history, error: historyError } = await supabaseAdmin
      .from('personnel_assignment_history')
      .select(`
        *,
        changed_by_admin:admin_accounts(full_name, rank)
      `)
      .eq('personnel_id', personnelId)
      .order('changed_at', { ascending: false })

    console.log('Assignment history query result:', { history, historyError })

    if (historyError) {
      console.error('Error fetching assignment history:', historyError)
      return NextResponse.json(
        { error: 'Failed to fetch assignment history' },
        { status: 500 }
      )
    }

    return NextResponse.json({ history })

  } catch (error) {
    console.error('Error fetching assignment history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
