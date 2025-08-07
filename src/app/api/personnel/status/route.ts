import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/database/client';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: statusData, error } = await supabase
      .from('personnel_status')
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
      return NextResponse.json({ error: 'Failed to fetch personnel status' }, { status: 500 })
    }

    return NextResponse.json(statusData || [])
  } catch (error) {
    console.error('Error fetching personnel status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch personnel status' }, 
      { status: 500 }
    )
  }
}
