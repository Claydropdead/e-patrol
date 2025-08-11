const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:311212345@db.xgsffeuluxsmgrhnrusl.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function checkBeatPersonnelColumns() {
  try {
    await client.connect();
    console.log('Connected to database...');
    
    const query = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'beat_personnel'
      ORDER BY ordinal_position;
    `;
    
    const result = await client.query(query);
    console.log('Current columns in beat_personnel table:');
    console.table(result.rows);
    
    // Check specifically for replacement-related columns
    const replacementColumns = result.rows.filter(row => 
      row.column_name.includes('replacement') || 
      row.column_name.includes('replaced') ||
      row.column_name.includes('original_assignment')
    );
    
    if (replacementColumns.length > 0) {
      console.log('\nReplacement-related columns found:');
      console.table(replacementColumns);
    } else {
      console.log('\nNo replacement-related columns found in beat_personnel table.');
    }
    
    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkBeatPersonnelColumns();
