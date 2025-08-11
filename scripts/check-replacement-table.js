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
  
  // Try to access the table first to see if it exists
  const { data: testData, error: testError } = await supabase
    .from('personnel_replacement_history')
    .select('id')
    .limit(1)
  
  if (!testError) {
    console.log('✅ Table personnel_replacement_history already exists!')
    return
  }
  
  if (testError.code !== 'PGRST106') { // Table doesn't exist error
    console.error('Unexpected error:', testError)
    return
  }
  
  console.log('Table does not exist. You need to create it manually in Supabase Dashboard.')
  console.log('\nPlease run this SQL in your Supabase SQL Editor:')
  console.log('\n' + '='.repeat(60))
  console.log(`
-- Create personnel replacement history table
CREATE TABLE IF NOT EXISTS personnel_replacement_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  beat_id UUID NOT NULL REFERENCES beats(id) ON DELETE CASCADE,
  old_personnel_id UUID REFERENCES personnel(id) ON DELETE SET NULL,
  new_personnel_id UUID REFERENCES personnel(id) ON DELETE SET NULL,
  replacement_reason TEXT,
  replaced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_replacement_history_beat_id ON personnel_replacement_history(beat_id);
CREATE INDEX IF NOT EXISTS idx_replacement_history_old_personnel ON personnel_replacement_history(old_personnel_id);
CREATE INDEX IF NOT EXISTS idx_replacement_history_new_personnel ON personnel_replacement_history(new_personnel_id);
CREATE INDEX IF NOT EXISTS idx_replacement_history_replaced_at ON personnel_replacement_history(replaced_at);

-- Enable RLS
ALTER TABLE personnel_replacement_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to view replacement history" ON personnel_replacement_history
  FOR SELECT USING (auth.role() = 'authenticated');
  
CREATE POLICY "Allow authenticated users to insert replacement history" ON personnel_replacement_history
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
`)
  console.log('='.repeat(60))
  console.log('\nAfter creating the table, the system will work with proper replacement tracking!')
}

createReplacementHistoryTable()
