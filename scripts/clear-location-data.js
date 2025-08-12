const { Client } = require('pg');

async function clearAllLocationData() {
  const client = new Client({
    connectionString: 'postgresql://postgres.xgsffeuluxsmgrhnrusl:311212345@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database!\n');

    // Check current location count
    const countBefore = await client.query('SELECT COUNT(*) as total FROM personnel_locations');
    console.log(`📍 Current location records: ${countBefore.rows[0].total}`);

    // Clear all location data
    const deleteResult = await client.query('DELETE FROM personnel_locations');
    console.log(`🗑️ Deleted ${deleteResult.rowCount} location records`);

    // Verify it's empty
    const countAfter = await client.query('SELECT COUNT(*) as total FROM personnel_locations');
    console.log(`📍 Remaining location records: ${countAfter.rows[0].total}`);

    // Check personnel status for mobile
    console.log('\n👮 Checking mobile personnel status:');
    const mobileStatus = await client.query(`
      SELECT ps.*, p.full_name
      FROM personnel_status ps
      JOIN personnel p ON ps.personnel_id = p.id
      WHERE p.full_name = 'mobile'
    `);
    console.log('Mobile status:', mobileStatus.rows);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed.');
  }
}

clearAllLocationData();
