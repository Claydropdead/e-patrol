const { Client } = require('pg');

async function verifyBeatStatusAPI() {
  const client = new Client({
    connectionString: 'postgresql://postgres:311212345@db.xgsffeuluxsmgrhnrusl.supabase.co:5432/postgres'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database!\n');

    console.log('🔍 VERIFYING BEAT STATUS API DATA');
    console.log('==================================\n');

    // This simulates what the API /api/beats GET endpoint should return
    console.log('1️⃣ Raw database query (what API should return):');
    const result = await client.query(`
      SELECT 
        id,
        name,
        center_lat,
        center_lng,
        radius_meters,
        address,
        unit,
        sub_unit,
        beat_status,
        duty_start_time,
        duty_end_time,
        created_at
      FROM beats 
      ORDER BY created_at DESC
    `);

    console.log('Beats from database:');
    console.log(JSON.stringify(result.rows, null, 2));

    console.log('\n2️⃣ Checking if beat_status field exists and has correct values:');
    result.rows.forEach((beat, index) => {
      console.log(`Beat ${index + 1}:`);
      console.log(`  Name: ${beat.name}`);
      console.log(`  beat_status: "${beat.beat_status}" (Type: ${typeof beat.beat_status})`);
      console.log(`  Should display as: ${beat.beat_status === 'on_duty' ? 'On Duty' : beat.beat_status}`);
      console.log('');
    });

    console.log('3️⃣ Expected vs Actual:');
    console.log('Expected from our database check:');
    console.log('  - RMFB Central Command Beat: beat_status = "on_duty"');
    console.log('  - RMFB Perimeter Beat: beat_status = "pending"');
    console.log('');
    console.log('Actual from this query:');
    result.rows.forEach(beat => {
      console.log(`  - ${beat.name}: beat_status = "${beat.beat_status}"`);
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

verifyBeatStatusAPI();
