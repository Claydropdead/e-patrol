const { Client } = require('pg');

async function checkReplacementHistorySchema() {
  const client = new Client({
    connectionString: 'postgresql://postgres:311212345@db.xgsffeuluxsmgrhnrusl.supabase.co:5432/postgres'
  });
  
  try {
    await client.connect();
    console.log('🔍 REPLACEMENT HISTORY SCHEMA ANALYSIS');
    console.log('=====================================\n');
    
    // Check beat_personnel table structure
    console.log('📋 CURRENT BEAT_PERSONNEL TABLE STRUCTURE:');
    const beatPersonnelCols = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'beat_personnel' 
      ORDER BY ordinal_position;
    `);
    
    beatPersonnelCols.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Check current beat_personnel data
    console.log('\n📊 CURRENT BEAT_PERSONNEL DATA:');
    const beatData = await client.query('SELECT * FROM beat_personnel LIMIT 3');
    console.log(`Found ${beatData.rows.length} records`);
    if (beatData.rows.length > 0) {
      console.log('Sample record structure:', Object.keys(beatData.rows[0]));
      console.log('Sample record:', beatData.rows[0]);
    }
    
    // Check if we have columns needed for replacement history
    console.log('\n🔍 REPLACEMENT HISTORY REQUIREMENTS:');
    const neededColumns = [
      'replaced_by',        // UUID of admin who made the replacement
      'replacement_reason', // Text reason for replacement  
      'replaced_at',        // Timestamp when replacement happened
      'is_replacement',     // Boolean to mark if this is a replacement
      'original_assignment_id' // Reference to the original assignment that was replaced
    ];
    
    console.log('\nColumns needed for replacement history tracking:');
    for (const col of neededColumns) {
      const exists = beatPersonnelCols.rows.find(row => row.column_name === col);
      console.log(`  - ${col}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
    }
    
    // Check personnel_assignment_history table
    console.log('\n📋 PERSONNEL_ASSIGNMENT_HISTORY TABLE:');
    const historyTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'personnel_assignment_history'
      );
    `);
    
    if (historyTableExists.rows[0].exists) {
      console.log('✅ personnel_assignment_history table exists');
      
      const historyCols = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'personnel_assignment_history' 
        ORDER BY ordinal_position;
      `);
      
      console.log('Columns:');
      historyCols.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}`);
      });
      
      const historyData = await client.query('SELECT COUNT(*) FROM personnel_assignment_history');
      console.log(`Records: ${historyData.rows[0].count}`);
    } else {
      console.log('❌ personnel_assignment_history table does not exist');
    }
    
    console.log('\n💡 RECOMMENDED APPROACH:');
    console.log('=========================================');
    console.log('Option 1: Add columns to beat_personnel table for replacement tracking');
    console.log('Option 2: Use existing personnel_assignment_history table');
    console.log('Option 3: Rely on audit_logs table for historical tracking');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkReplacementHistorySchema();
