require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createReplacementHistoryTable() {
  console.log('Creating personnel_replacement_history table...')
  
  try {
    // First check if table already exists by trying to query it
    const { data: testData, error: testError } = await supabase
      .from('personnel_replacement_history')
      .select('id')
      .limit(1)
    
    if (!testError) {
      console.log('✅ Table personnel_replacement_history already exists!')
      return
    }
    
    if (testError.code !== 'PGRST106' && testError.code !== '42P01') {
      console.error('Unexpected error checking table:', testError)
      return
    }
    
    console.log('Table does not exist. Creating via SQL...')
    
    // Use the SQL query method through Supabase
    const sqlQuery = `
      CREATE TABLE personnel_replacement_history (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        beat_id UUID NOT NULL,
        old_personnel_id UUID,
        new_personnel_id UUID,
        replacement_reason TEXT,
        replaced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Add foreign key constraints
      ALTER TABLE personnel_replacement_history 
        ADD CONSTRAINT fk_replacement_beat 
        FOREIGN KEY (beat_id) REFERENCES beats(id) ON DELETE CASCADE;
        
      ALTER TABLE personnel_replacement_history 
        ADD CONSTRAINT fk_replacement_old_personnel 
        FOREIGN KEY (old_personnel_id) REFERENCES personnel(id) ON DELETE SET NULL;
        
      ALTER TABLE personnel_replacement_history 
        ADD CONSTRAINT fk_replacement_new_personnel 
        FOREIGN KEY (new_personnel_id) REFERENCES personnel(id) ON DELETE SET NULL;
        
      ALTER TABLE personnel_replacement_history 
        ADD CONSTRAINT fk_replacement_created_by 
        FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
      
      -- Create indexes
      CREATE INDEX idx_replacement_history_beat_id ON personnel_replacement_history(beat_id);
      CREATE INDEX idx_replacement_history_old_personnel ON personnel_replacement_history(old_personnel_id);
      CREATE INDEX idx_replacement_history_new_personnel ON personnel_replacement_history(new_personnel_id);
      CREATE INDEX idx_replacement_history_replaced_at ON personnel_replacement_history(replaced_at);
      
      -- Enable RLS
      ALTER TABLE personnel_replacement_history ENABLE ROW LEVEL SECURITY;
      
      -- Create RLS policies
      CREATE POLICY "replacement_history_select_policy" ON personnel_replacement_history
        FOR SELECT USING (true);
        
      CREATE POLICY "replacement_history_insert_policy" ON personnel_replacement_history
        FOR INSERT WITH CHECK (true);
    `
    
    console.log('\n🔧 Please run this SQL in your Supabase Dashboard → SQL Editor:')
    console.log('=' .repeat(60))
    console.log(sqlQuery)
    console.log('=' .repeat(60))
    console.log('\nAfter running the SQL, the replacement history system will be fully functional!')
    
  } catch (error) {
    console.error('Error creating replacement history table:', error)
  }
}
      console.error('Error creating table:', error)
    } else {
      console.log('✅ Personnel replacement history table created successfully!')
      console.log('Table structure:')
      console.log('- id: UUID (Primary Key)')
      console.log('- beat_id: UUID (References beats)')
      console.log('- old_personnel_id: UUID (References personnel)')  
      console.log('- new_personnel_id: UUID (References personnel)')
      console.log('- replacement_reason: TEXT')
      console.log('- replaced_at: TIMESTAMP')
      console.log('- created_by: UUID (References auth.users)')
      console.log('- created_at: TIMESTAMP')
    }
    
  } catch (error) {
    console.error('Error creating replacement history table:', error)
  }
}

createReplacementHistoryTable()
