// Setup script to create initial superadmin account
// Run this after executing secure-database-fix.sql

const { createClient } = require('@supabase/supabase-js')

// You need to replace these with your actual Supabase credentials
const SUPABASE_URL = 'your-supabase-url'
const SUPABASE_SERVICE_KEY = 'your-supabase-service-role-key'

// Replace with your email that you used to create the auth account
const ADMIN_EMAIL = 'your-email@example.com'
const ADMIN_NAME = 'System Administrator'

async function setupSuperadmin() {
  try {
    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    // Get the user ID from auth.users table
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error fetching auth users:', authError)
      return
    }
    
    const user = authUsers.users.find(u => u.email === ADMIN_EMAIL)
    
    if (!user) {
      console.error(`No auth user found with email: ${ADMIN_EMAIL}`)
      console.log('Available users:', authUsers.users.map(u => u.email))
      return
    }
    
    console.log(`Found user: ${user.email} with ID: ${user.id}`)
    
    // Check if admin account already exists
    const { data: existingAdmin, error: checkError } = await supabase
      .from('admin_accounts')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (existingAdmin) {
      console.log('Admin account already exists:', existingAdmin)
      return
    }
    
    // Create admin account
    const { data: newAdmin, error: insertError } = await supabase
      .from('admin_accounts')
      .insert({
        id: user.id,
        email: user.email,
        full_name: ADMIN_NAME,
        role: 'superadmin',
        is_active: true,
        created_at: new Date().toISOString(),
        assigned_province: null, // Superadmin has access to all
        assigned_unit: null,
        assigned_sub_unit: null
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('Error creating admin account:', insertError)
      return
    }
    
    console.log('✅ Superadmin account created successfully!')
    console.log('Admin details:', newAdmin)
    console.log('You can now log in to the dashboard.')
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Instructions
console.log('='.repeat(60))
console.log('E-PATROL SUPERADMIN SETUP')
console.log('='.repeat(60))
console.log('1. First, run secure-database-fix.sql in Supabase SQL Editor')
console.log('2. Update the credentials in this file:')
console.log('   - SUPABASE_URL')
console.log('   - SUPABASE_SERVICE_KEY') 
console.log('   - ADMIN_EMAIL (your email)')
console.log('3. Run: node scripts/setup-admin.js')
console.log('='.repeat(60))

// Uncomment the line below after updating the credentials
// setupSuperadmin()