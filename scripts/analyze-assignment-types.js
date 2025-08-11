const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:311212345@db.xgsffeuluxsmgrhnrusl.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function analyzeAssignmentTypes() {
  try {
    await client.connect();
    console.log('Connected to database...');
    
    // Check beat_personnel structure after cleanup
    console.log('🎯 Current beat_personnel table structure:');
    const beatPersonnelQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'beat_personnel'
      ORDER BY ordinal_position;
    `;
    
    const beatPersonnelResult = await client.query(beatPersonnelQuery);
    console.table(beatPersonnelResult.rows);
    
    // Check personnel_replacement_history structure
    console.log('\n📊 personnel_replacement_history table structure:');
    const replacementHistoryQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'personnel_replacement_history'
      ORDER BY ordinal_position;
    `;
    
    const replacementHistoryResult = await client.query(replacementHistoryQuery);
    console.table(replacementHistoryResult.rows);
    
    // Analyze how to identify original vs replacement assignments
    console.log('\n🔍 Analysis: How to identify Original vs Replacement assignments');
    console.log('='.repeat(70));
    
    console.log('\n📋 Current approach options:');
    console.log('1. Check if personnel_id exists as new_personnel_id in replacement_history');
    console.log('2. Compare assigned_at timestamp with replacement history');
    console.log('3. Track assignment sequence by beat_id');
    
    // Sample query to demonstrate identification logic
    console.log('\n🔍 Sample query to identify assignment types:');
    const identificationQuery = `
      SELECT 
        bp.id,
        bp.beat_id,
        bp.personnel_id,
        bp.assigned_at,
        p.full_name,
        p.rank,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM personnel_replacement_history prh 
            WHERE prh.new_personnel_id = bp.personnel_id 
            AND prh.beat_id = bp.beat_id
          ) THEN 'REPLACEMENT'
          ELSE 'ORIGINAL'
        END as assignment_type,
        prh.replacement_reason,
        prh.replaced_at
      FROM beat_personnel bp
      LEFT JOIN personnel p ON bp.personnel_id = p.id
      LEFT JOIN personnel_replacement_history prh ON (
        prh.new_personnel_id = bp.personnel_id 
        AND prh.beat_id = bp.beat_id
      )
      ORDER BY bp.beat_id, bp.assigned_at;
    `;
    
    const identificationResult = await client.query(identificationQuery);
    console.table(identificationResult.rows);
    
    // Check replacement history data
    console.log('\n📊 Current replacement history data:');
    const replacementDataQuery = `
      SELECT 
        prh.id,
        prh.beat_id,
        prh.old_personnel_id,
        prh.new_personnel_id,
        prh.replacement_reason,
        prh.replaced_at,
        old_p.full_name as old_personnel_name,
        new_p.full_name as new_personnel_name
      FROM personnel_replacement_history prh
      LEFT JOIN personnel old_p ON prh.old_personnel_id = old_p.id
      LEFT JOIN personnel new_p ON prh.new_personnel_id = new_p.id
      ORDER BY prh.replaced_at DESC;
    `;
    
    const replacementDataResult = await client.query(replacementDataQuery);
    console.table(replacementDataResult.rows);
    
    await client.end();
    console.log('\n✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Error analyzing assignment types:', error.message);
  }
}

analyzeAssignmentTypes();
