const { Client } = require('pg');

async function checkExistingDatabase() {
  const client = new Client({
    connectionString: 'postgresql://postgres:311212345@db.xgsffeuluxsmgrhnrusl.supabase.co:5432/postgres'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database!\n');

    console.log('🔍 CHECKING EXISTING TABLES');
    console.log('===========================\n');

    // Check what tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('📋 EXISTING TABLES:');
    tablesResult.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name}`);
    });

    // Check if we have the tables we need
    const requiredTables = ['personnel', 'personnel_status', 'personnel_locations', 'beats', 'beat_personnel'];
    const existingTables = tablesResult.rows.map(row => row.table_name);
    
    console.log('\n🔍 REQUIRED TABLES STATUS:');
    requiredTables.forEach(table => {
      const exists = existingTables.includes(table);
      console.log(`  ${exists ? '✅' : '❌'} ${table} ${exists ? '(exists)' : '(missing)'}`);
    });

    // Check data in existing tables
    console.log('\n📊 DATA STATUS:');
    
    // Check personnel
    const personnelResult = await client.query('SELECT COUNT(*) as count FROM personnel');
    console.log(`  👥 personnel: ${personnelResult.rows[0].count} records`);

    // Check personnel_status if exists
    if (existingTables.includes('personnel_status')) {
      const statusResult = await client.query('SELECT COUNT(*) as count FROM personnel_status');
      console.log(`  📊 personnel_status: ${statusResult.rows[0].count} records`);
    }

    // Check personnel_locations if exists
    if (existingTables.includes('personnel_locations')) {
      const locationResult = await client.query('SELECT COUNT(*) as count FROM personnel_locations');
      console.log(`  📍 personnel_locations: ${locationResult.rows[0].count} records`);
    }

    // Check beats if exists
    if (existingTables.includes('beats')) {
      const beatsResult = await client.query('SELECT COUNT(*) as count FROM beats');
      console.log(`  🎯 beats: ${beatsResult.rows[0].count} records`);
    }

    // Check beat_personnel if exists
    if (existingTables.includes('beat_personnel')) {
      const beatPersonnelResult = await client.query('SELECT COUNT(*) as count FROM beat_personnel');
      console.log(`  👤 beat_personnel: ${beatPersonnelResult.rows[0].count} records`);
    }

    console.log('\n🚀 READY TO ADD SAMPLE DATA TO EXISTING TABLES!');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

checkExistingDatabase();
