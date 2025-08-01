import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Use service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // This is the service role key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const { 
      rank, 
      fullName, 
      email, 
      password, 
      contactNumber, 
      province, 
      unit, 
      subUnit, 
      isActive 
    } = await request.json()

    // Validate required fields
    if (!rank || !fullName || !email || !password || !province || !unit || !subUnit) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      )
    }

    // Validate province
    const validProvinces = [
      'Oriental Mindoro PPO',
      'Occidental Mindoro PPO',
      'Marinduque PPO',
      'Romblon PPO',
      'Palawan PPO',
      'Puerto Princesa CPO',
      'RMFB'
    ]
    if (!validProvinces.includes(province)) {
      return NextResponse.json(
        { error: 'Invalid province specified' },
        { status: 400 }
      )
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (authData.user) {
      // Create personnel profile
      const { error: profileError } = await supabaseAdmin
        .from('personnel')
        .insert({
          id: authData.user.id,
          rank,
          full_name: fullName,
          email,
          contact_number: contactNumber || null,
          province,
          unit,
          sub_unit: subUnit,
          is_active: isActive ?? true
        })

      if (profileError) {
        // If profile creation fails, delete the auth user
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        return NextResponse.json(
          { error: profileError.message },
          { status: 400 }
        )
      }

      return NextResponse.json({
        message: 'Personnel account created successfully',
        user: {
          id: authData.user.id,
          email,
          province,
          subUnit
        }
      })
    }

    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )

  } catch (error) {
    console.error('Error creating personnel account:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
