import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/database/client';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: beatsData, error } = await supabase
      .from('beats')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase query error:', error)
      return NextResponse.json({ error: 'Failed to fetch beats' }, { status: 500 })
    }

    return NextResponse.json(beatsData || [])
  } catch (error) {
    console.error('Error fetching beats:', error)
    return NextResponse.json({ error: 'Failed to fetch beats' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from('beats')
      .insert([{
        name: body.name,
        center_lat: body.center_lat,
        center_lng: body.center_lng,
        radius_meters: body.radius,
        address: body.description,
        unit: body.unit,
        sub_unit: body.sub_unit
      }])
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: 'Failed to create beat' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating beat:', error)
    return NextResponse.json({ error: 'Failed to create beat' }, { status: 500 })
  }
}
