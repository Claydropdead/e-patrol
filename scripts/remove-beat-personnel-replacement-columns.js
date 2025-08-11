const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:311212345@db.xgsffeuluxsmgrhnrusl.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function removeReplacementColumns() {
  try {
    await client.connect();
    console.log('Connected to database...');
    
    // List of replacement columns to remove
    const columnsToRemove = [
      'replaced_by',
      'replacement_reason',
      'replaced_at',
      'is_replacement',
      'original_assignment_id'
    ];
    
    console.log('🔧 Removing replacement-related columns from beat_personnel table...');
    console.log('Columns to remove:', columnsToRemove);
    
    // Remove each column
    for (const column of columnsToRemove) {
      try {
        console.log(`\n📝 Removing column: ${column}`);
        
        const dropColumnQuery = `
          ALTER TABLE beat_personnel 
          DROP COLUMN IF EXISTS ${column};
        `;
        
        await client.query(dropColumnQuery);
        console.log(`✅ Successfully removed column: ${column}`);
        
      } catch (columnError) {
        console.error(`❌ Error removing column ${column}:`, columnError.message);
      }
    }
    
    // Verify the columns were removed
    console.log('\n🔍 Verifying column removal...');
    const verifyQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'beat_personnel'
      ORDER BY ordinal_position;
    `;
    
    const result = await client.query(verifyQuery);
    console.log('\nRemaining columns in beat_personnel table:');
    console.table(result.rows);
    
    // Check if any replacement columns still exist
    const remainingReplacementCols = result.rows.filter(row => 
      columnsToRemove.includes(row.column_name)
    );
    
    if (remainingReplacementCols.length === 0) {
      console.log('\n🎉 SUCCESS: All replacement columns have been removed!');
      console.log('✅ beat_personnel table is now clean');
      console.log('✅ All replacement data is now tracked in personnel_replacement_history table');
    } else {
      console.log('\n⚠️  Some replacement columns still exist:');
      console.table(remainingReplacementCols);
    }
    
    await client.end();
    console.log('\nDatabase connection closed.');
    
  } catch (error) {
    console.error('❌ Error removing replacement columns:', error.message);
  }
}

removeReplacementColumns();
