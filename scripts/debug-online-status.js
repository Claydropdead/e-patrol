const { Client } = require('pg');

async function debugPersonnelOnlineStatus() {
  const client = new Client({
    connectionString: 'postgresql://postgres.xgsffeuluxsmgrhnrusl:311212345@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database!\n');

    // Check personnel_status table
    console.log('📋 PERSONNEL STATUS DATA:');
    const statusResult = await client.query(`
      SELECT ps.*, p.full_name, p.rank, p.unit, p.sub_unit
      FROM personnel_status ps
      JOIN personnel p ON ps.personnel_id = p.id
      WHERE p.full_name = 'mobile'
    `);
    console.log('Status data for "mobile":', statusResult.rows);

    // Check personnel_locations table  
    console.log('\n📍 PERSONNEL LOCATIONS DATA:');
    const locationResult = await client.query(`
      SELECT pl.*, p.full_name
      FROM personnel_locations pl
      JOIN personnel p ON pl.personnel_id = p.id
      WHERE p.full_name = 'mobile'
      ORDER BY pl.updated_at DESC
    `);
    console.log('Location data for "mobile":', locationResult.rows);

    // Check if there are any old location records
    console.log('\n🕐 ALL LOCATION RECORDS (last 5):');
    const allLocations = await client.query(`
      SELECT pl.*, p.full_name, pl.updated_at,
        EXTRACT(EPOCH FROM (NOW() - pl.updated_at))/60 as minutes_ago
      FROM personnel_locations pl
      JOIN personnel p ON pl.personnel_id = p.id
      ORDER BY pl.updated_at DESC
      LIMIT 5
    `);
    
    allLocations.rows.forEach(row => {
      console.log(`   👮 ${row.full_name}: ${row.minutes_ago?.toFixed(1)} minutes ago (${row.updated_at})`);
    });

    // Check what the API would return
    console.log('\n🔍 SIMULATING API LOGIC:');
    const now = new Date();
    allLocations.rows.forEach(row => {
      const locationDate = new Date(row.updated_at);
      const minutesAgo = (now.getTime() - locationDate.getTime()) / (1000 * 60);
      const isOnline = minutesAgo < 15;
      console.log(`   👮 ${row.full_name}: ${minutesAgo.toFixed(1)} mins ago - Online: ${isOnline}`);
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

debugPersonnelOnlineStatus();
