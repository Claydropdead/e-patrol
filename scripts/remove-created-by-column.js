const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:311212345@db.xgsffeuluxsmgrhnrusl.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function removeCreatedByColumn() {
  try {
    await client.connect();
    console.log('Connected to database...');
    
    console.log('🔧 Removing created_by column from personnel_replacement_history table...');
    
    // Check if column exists first
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'personnel_replacement_history' 
      AND column_name = 'created_by';
    `;
    
    const checkResult = await client.query(checkQuery);
    
    if (checkResult.rows.length === 0) {
      console.log('✅ Column created_by does not exist. Nothing to remove.');
      await client.end();
      return;
    }
    
    // Remove the column
    const dropColumnQuery = `
      ALTER TABLE personnel_replacement_history 
      DROP COLUMN created_by;
    `;
    
    await client.query(dropColumnQuery);
    console.log('✅ Successfully removed created_by column!');
    
    // Also remove the foreign key constraint if it exists
    try {
      const dropConstraintQuery = `
        ALTER TABLE personnel_replacement_history 
        DROP CONSTRAINT IF EXISTS fk_replacement_created_by;
      `;
      
      await client.query(dropConstraintQuery);
      console.log('✅ Removed foreign key constraint for created_by');
    } catch (constraintError) {
      console.log('ℹ️  No foreign key constraint to remove');
    }
    
    // Verify the column was removed
    const verifyQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'personnel_replacement_history'
      ORDER BY ordinal_position;
    `;
    
    const result = await client.query(verifyQuery);
    console.log('\nRemaining columns in personnel_replacement_history table:');
    console.table(result.rows);
    
    console.log('\n🎉 SUCCESS: created_by column has been removed!');
    console.log('✅ personnel_replacement_history table is now cleaner');
    console.log('✅ Focus is on replacement data, not tracking who did it');
    
    await client.end();
    console.log('\nDatabase connection closed.');
    
  } catch (error) {
    console.error('❌ Error removing created_by column:', error.message);
  }
}

removeCreatedByColumn();
