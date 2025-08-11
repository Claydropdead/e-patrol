const { Client } = require('pg')

// Your PostgreSQL connection string
const connectionString = 'postgresql://postgres:311212345@db.xgsffeuluxsmgrhnrusl.supabase.co:5432/postgres'

async function createReplacementHistoryTable() {
  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    console.log('Connecting to PostgreSQL database...')
    await client.connect()
    console.log('✅ Connected successfully!')

    console.log('Creating personnel_replacement_history table...')

    // Check if table exists
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'personnel_replacement_history'
      );
    `
    
    const tableExists = await client.query(checkTableQuery)
    
    if (tableExists.rows[0].exists) {
      console.log('✅ Table personnel_replacement_history already exists!')
      return
    }

    // Create the table
    const createTableQuery = `
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
    `

    await client.query(createTableQuery)
    console.log('✅ Table created successfully!')

    // Add foreign key constraints
    console.log('Adding foreign key constraints...')
    
    const constraintsQuery = `
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
    `

    await client.query(constraintsQuery)
    console.log('✅ Foreign key constraints added!')

    // Create indexes
    console.log('Creating indexes...')
    
    const indexesQuery = `
      CREATE INDEX idx_replacement_history_beat_id ON personnel_replacement_history(beat_id);
      CREATE INDEX idx_replacement_history_old_personnel ON personnel_replacement_history(old_personnel_id);
      CREATE INDEX idx_replacement_history_new_personnel ON personnel_replacement_history(new_personnel_id);
      CREATE INDEX idx_replacement_history_replaced_at ON personnel_replacement_history(replaced_at);
    `

    await client.query(indexesQuery)
    console.log('✅ Indexes created!')

    // Enable RLS
    console.log('Enabling Row Level Security...')
    
    const rlsQuery = `
      ALTER TABLE personnel_replacement_history ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "replacement_history_select_policy" ON personnel_replacement_history
        FOR SELECT USING (true);
        
      CREATE POLICY "replacement_history_insert_policy" ON personnel_replacement_history
        FOR INSERT WITH CHECK (true);
    `

    await client.query(rlsQuery)
    console.log('✅ Row Level Security enabled with policies!')

    console.log('\n🎉 Personnel replacement history table setup complete!')
    console.log('\nTable structure:')
    console.log('- id: UUID (Primary Key)')
    console.log('- beat_id: UUID (References beats) - NOT NULL')
    console.log('- old_personnel_id: UUID (References personnel) - Can be NULL')  
    console.log('- new_personnel_id: UUID (References personnel) - Can be NULL')
    console.log('- replacement_reason: TEXT - Reason for replacement')
    console.log('- replaced_at: TIMESTAMP - When replacement occurred')
    console.log('- created_by: UUID (References auth.users) - Who performed replacement')
    console.log('- created_at: TIMESTAMP - Record creation time')
    console.log('\n✅ Your replacement system is now ready to use!')

  } catch (error) {
    console.error('❌ Error creating replacement history table:', error)
    console.error('Error details:', error.message)
  } finally {
    await client.end()
    console.log('Database connection closed.')
  }
}

// Install pg package if needed
try {
  require('pg')
} catch (error) {
  console.log('Installing pg package...')
  require('child_process').execSync('npm install pg', { stdio: 'inherit' })
}

createReplacementHistoryTable()
