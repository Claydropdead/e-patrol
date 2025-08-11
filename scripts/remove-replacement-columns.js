// Remove the replacement columns that are no longer needed
// Since we're now using audit logs for history tracking

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Not set')
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'Set' : 'Not set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function removeReplacementColumns() {
  console.log('Removing replacement tracking columns from beat_personnel table...')
  
  try {
    // Remove the replacement columns we added earlier
    const { error: dropError } = await supabase.rpc('execute_sql', {
      sql: `
        ALTER TABLE beat_personnel 
        DROP COLUMN IF EXISTS replaced_by,
        DROP COLUMN IF EXISTS replacement_reason,
        DROP COLUMN IF EXISTS replaced_at,
        DROP COLUMN IF EXISTS is_replacement,
        DROP COLUMN IF EXISTS original_assignment_id;
      `
    })

    if (dropError) {
      console.error('Error dropping columns:', dropError)
      return
    }

    console.log('✅ Successfully removed replacement columns from beat_personnel table')
    
    // Verify the table structure
    const { data: tableInfo, error: infoError } = await supabase.rpc('execute_sql', {
      sql: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'beat_personnel' 
        ORDER BY ordinal_position;
      `
    })

    if (infoError) {
      console.error('Error getting table info:', infoError)
      return
    }

    console.log('\n📋 Current beat_personnel table structure:')
    console.table(tableInfo)

  } catch (error) {
    console.error('Error in removeReplacementColumns:', error)
  }
}

removeReplacementColumns()
