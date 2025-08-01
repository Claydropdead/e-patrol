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
    const { rank, fullName, email, password, role, isActive } = await request.json()

    // Validate required fields
    if (!rank || !fullName || !email || !password || !role) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['superadmin', 'regional', 'provincial', 'station']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role specified' },
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
      // Create admin account profile
      const { error: profileError } = await supabaseAdmin
        .from('admin_accounts')
        .insert({
          id: authData.user.id,
          rank,
          full_name: fullName,
          email,
          role,
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
        message: 'Admin account created successfully',
        user: {
          id: authData.user.id,
          email,
          role
        }
      })
    }

    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )

  } catch (error) {
    console.error('Error creating admin account:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
