import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/database/client';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: locationData, error } = await supabase
      .from('personnel_locations')
      .select(`
        *,
        personnel!inner (
          id,
          full_name,
          rank,
          email,
          unit,
          sub_unit
        )
      `)

    if (error) {
      console.error('Supabase query error:', error)
      return NextResponse.json({ error: 'Failed to fetch personnel locations' }, { status: 500 })
    }

    return NextResponse.json(locationData || [])
  } catch (error) {
    console.error('Error fetching personnel locations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch personnel locations' }, 
      { status: 500 }
    )
  }
}
