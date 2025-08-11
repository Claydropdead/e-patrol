const { Client } = require('pg');

async function checkForeignKeys() {
  const client = new Client({
    connectionString: 'postgresql://postgres:311212345@db.xgsffeuluxsmgrhnrusl.supabase.co:5432/postgres'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database!\n');

    // Check personnel_status table structure
    console.log('📋 PERSONNEL_STATUS TABLE COLUMNS:');
    const statusColumnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'personnel_status' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    statusColumnsResult.rows.forEach(row => {
      console.log(`  📄 ${row.column_name} (${row.data_type}) - ${row.is_nullable === 'YES' ? 'nullable' : 'not null'}`);
    });

    // Check foreign key constraints
    console.log('\n🔗 FOREIGN KEY CONSTRAINTS:');
    const fkResult = await client.query(`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE constraint_type = 'FOREIGN KEY' 
        AND tc.table_name IN ('personnel_status', 'personnel_locations', 'beat_personnel');
    `);
    
    if (fkResult.rows.length > 0) {
      fkResult.rows.forEach(row => {
        console.log(`  🔗 ${row.table_name}.${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
      });
    } else {
      console.log('  ❌ No foreign key constraints found');
    }

    // Check sample data from personnel_status
    console.log('\n👥 SAMPLE PERSONNEL_STATUS DATA:');
    const statusDataResult = await client.query('SELECT * FROM personnel_status LIMIT 2');
    console.log(statusDataResult.rows);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

checkForeignKeys();
