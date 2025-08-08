import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/database/client';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: beatPersonnelData, error } = await supabase
      .from('beat_personnel')
      .select(`
        *,
        personnel!inner (
          id,
          full_name,
          rank,
          email,
          unit,
          sub_unit
        ),
        beats!inner (
          id,
          name,
          center_lat,
          center_lng,
          radius_meters,
          unit,
          sub_unit
        )
      `)
      .order('assigned_at', { ascending: false })

    if (error) {
      console.error('Supabase query error:', error)
      return NextResponse.json({ error: 'Failed to fetch beat personnel' }, { status: 500 })
    }

    return NextResponse.json(beatPersonnelData || [])
  } catch (error) {
    console.error('Error fetching beat personnel:', error)
    return NextResponse.json({ error: 'Failed to fetch beat personnel' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('beat_personnel')
      .insert([{
        beat_id: body.beat_id,
        personnel_id: body.personnel_id,
        acceptance_status: body.acceptance_status || 'pending',
        assigned_at: body.assigned_at || new Date().toISOString()
      }])
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: 'Failed to assign personnel to beat' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error assigning personnel to beat:', error)
    return NextResponse.json({ error: 'Failed to assign personnel to beat' }, { status: 500 })
  }
}
