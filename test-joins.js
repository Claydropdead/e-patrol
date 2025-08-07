const { Client } = require('pg');

async function testJoinQuery() {
  const client = new Client({
    connectionString: 'postgresql://postgres:311212345@db.xgsffeuluxsmgrhnrusl.supabase.co:5432/postgres'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database!\n');

    // Test direct SQL join
    console.log('🔍 TESTING DIRECT SQL JOIN:');
    const joinResult = await client.query(`
      SELECT 
        ps.id,
        ps.personnel_id,
        ps.status,
        ps.is_online,
        ps.updated_at,
        p.full_name,
        p.rank,
        p.email,
        p.unit,
        p.sub_unit
      FROM personnel_status ps
      LEFT JOIN personnel p ON ps.personnel_id = p.id;
    `);
    
    console.log('✅ Join Query Results:');
    joinResult.rows.forEach(row => {
      console.log(`  👤 ${row.full_name} (${row.rank}) - Status: ${row.status}`);
    });

    // Test locations join too
    console.log('\n🔍 TESTING LOCATIONS JOIN:');
    const locJoinResult = await client.query(`
      SELECT 
        pl.id,
        pl.personnel_id,
        pl.latitude,
        pl.longitude,
        pl.last_update,
        p.full_name,
        p.rank,
        p.unit,
        p.sub_unit
      FROM personnel_locations pl
      LEFT JOIN personnel p ON pl.personnel_id = p.id;
    `);
    
    console.log('✅ Locations Join Results:');
    locJoinResult.rows.forEach(row => {
      console.log(`  📍 ${row.full_name} - Lat: ${row.latitude}, Lng: ${row.longitude}`);
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

testJoinQuery();
