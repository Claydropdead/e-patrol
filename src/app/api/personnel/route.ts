import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/database/client';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    
    const { data: personnelData, error } = await supabase
      .from('personnel')
      .select('*')
      .eq('is_active', true)

    if (error) {
      console.error('Supabase query error:', error)
      return NextResponse.json({ error: 'Failed to fetch personnel' }, { status: 500 })
    }

    return NextResponse.json(personnelData || [])
  } catch (error) {
    console.error('Error fetching personnel:', error)
    return NextResponse.json(
      { error: 'Failed to fetch personnel' }, 
      { status: 500 }
    )
  }
}
