const { Client } = require('pg');

async function checkBeatStatus() {
  const client = new Client({
    connectionString: 'postgresql://postgres:311212345@db.xgsffeuluxsmgrhnrusl.supabase.co:5432/postgres'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database!\n');

    console.log('📊 BEAT STATUS INFORMATION');
    console.log('===========================\n');

    // Get all beats with their status
    console.log('1️⃣ Checking all beats and their status...');
    const beatsResult = await client.query(`
      SELECT 
        id,
        name,
        beat_status,
        duty_start_time,
        duty_end_time,
        unit,
        sub_unit,
        address,
        created_at
      FROM beats 
      ORDER BY created_at DESC
    `);

    console.log(`Found ${beatsResult.rows.length} beats:\n`);

    beatsResult.rows.forEach((beat, index) => {
      console.log(`Beat ${index + 1}:`);
      console.log(`  📍 Name: ${beat.name}`);
      console.log(`  🏢 Unit: ${beat.unit}`);
      console.log(`  🏪 Sub-unit: ${beat.sub_unit}`);
      console.log(`  📊 Status: ${beat.beat_status}`);
      console.log(`  ⏰ Duty Hours: ${beat.duty_start_time || 'Not set'} - ${beat.duty_end_time || 'Not set'}`);
      console.log(`  📍 Address: ${beat.address || 'Not specified'}`);
      console.log(`  📅 Created: ${beat.created_at}`);
      console.log('');
    });

    // Check beat personnel assignments
    console.log('2️⃣ Checking beat personnel assignments...');
    const assignmentsResult = await client.query(`
      SELECT 
        bp.*,
        b.name as beat_name,
        b.beat_status,
        p.full_name,
        p.rank
      FROM beat_personnel bp
      JOIN beats b ON bp.beat_id = b.id
      JOIN personnel p ON bp.personnel_id = p.id
      ORDER BY bp.assigned_at DESC
    `);

    console.log(`Found ${assignmentsResult.rows.length} beat assignments:\n`);

    assignmentsResult.rows.forEach((assignment, index) => {
      console.log(`Assignment ${index + 1}:`);
      console.log(`  👮 Personnel: ${assignment.rank} ${assignment.full_name}`);
      console.log(`  📍 Beat: ${assignment.beat_name}`);
      console.log(`  📊 Beat Status: ${assignment.beat_status}`);
      console.log(`  ✅ Acceptance: ${assignment.acceptance_status}`);
      console.log(`  📅 Assigned: ${assignment.assigned_at}`);
      console.log('');
    });

    // Check personnel status
    console.log('3️⃣ Checking personnel status...');
    const statusResult = await client.query(`
      SELECT 
        ps.*,
        p.full_name,
        p.rank
      FROM personnel_status ps
      JOIN personnel p ON ps.personnel_id = p.id
      ORDER BY ps.updated_at DESC
    `);

    console.log(`Found ${statusResult.rows.length} personnel with status:\n`);

    statusResult.rows.forEach((status, index) => {
      console.log(`Personnel ${index + 1}:`);
      console.log(`  👮 Name: ${status.rank} ${status.full_name}`);
      console.log(`  📊 Status: ${status.status}`);
      console.log(`  🟢 Online: ${status.is_online ? 'Yes' : 'No'}`);
      console.log(`  📅 Updated: ${status.updated_at}`);
      console.log('');
    });

    // Summary
    console.log('📋 SUMMARY');
    console.log('===========');
    console.log(`Total Beats: ${beatsResult.rows.length}`);
    console.log(`Beat Assignments: ${assignmentsResult.rows.length}`);
    console.log(`Personnel with Status: ${statusResult.rows.length}`);
    
    // Beat status breakdown
    const statusCount = beatsResult.rows.reduce((acc, beat) => {
      acc[beat.beat_status] = (acc[beat.beat_status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\nBeat Status Breakdown:');
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} beats`);
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Full error:', err);
  } finally {
    await client.end();
  }
}

checkBeatStatus();
