const { Client } = require('pg');

async function checkPersonnelSchema() {
  const client = new Client({
    connectionString: 'postgresql://postgres:311212345@db.xgsffeuluxsmgrhnrusl.supabase.co:5432/postgres'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database!\n');

    // Check personnel table columns
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'personnel' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);

    console.log('📋 PERSONNEL TABLE COLUMNS:');
    columnsResult.rows.forEach(row => {
      console.log(`  📄 ${row.column_name} (${row.data_type}) - ${row.is_nullable === 'YES' ? 'nullable' : 'not null'}`);
    });

    // Sample data
    console.log('\n👥 SAMPLE PERSONNEL DATA:');
    const dataResult = await client.query('SELECT * FROM personnel LIMIT 2');
    console.log(dataResult.rows);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

checkPersonnelSchema();
