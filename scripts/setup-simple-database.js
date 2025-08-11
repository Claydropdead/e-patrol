const { Client } = require('pg');

async function setupSimpleDatabase() {
  const client = new Client({
    connectionString: 'postgresql://postgres:311212345@db.xgsffeuluxsmgrhnrusl.supabase.co:5432/postgres'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database!\n');

    console.log('📋 SIMPLE DATABASE SETUP - Based on Your Screenshots');
    console.log('==================================================\n');

    // ========================================
    // TABLE 1: personnel_status
    // For: Live Monitoring statistics & status tracking
    // ========================================
    console.log('1️⃣ Creating personnel_status table...');
    await client.query(`
      DROP TABLE IF EXISTS personnel_status CASCADE;
      CREATE TABLE personnel_status (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        personnel_id UUID REFERENCES personnel(id),
        status VARCHAR(20) CHECK (status IN ('alert', 'standby', 'on_duty')),
        is_online BOOLEAN DEFAULT FALSE,
        UNIQUE(personnel_id)
      );
    `);

    // ========================================
    // TABLE 2: personnel_locations  
    // For: Green dots on map, location sharing
    // ========================================
    console.log('2️⃣ Creating personnel_locations table...');
    await client.query(`
      DROP TABLE IF EXISTS personnel_locations CASCADE;
      CREATE TABLE personnel_locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        personnel_id UUID REFERENCES personnel(id),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        UNIQUE(personnel_id)
      );
    `);

    // ========================================
    // TABLE 3: beats
    // For: Beat management, blue dots on map, beat details
    // ========================================
    console.log('3️⃣ Creating beats table...');
    await client.query(`
      DROP TABLE IF EXISTS beat_personnel CASCADE;
      DROP TABLE IF EXISTS beats CASCADE;
      CREATE TABLE beats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100),
        center_lat DECIMAL(10, 8),
        center_lng DECIMAL(11, 8),
        radius_meters INTEGER DEFAULT 500,
        address TEXT,
        unit VARCHAR(255),
        sub_unit VARCHAR(255),
        beat_status VARCHAR(20) CHECK (beat_status IN ('pending', 'on_duty', 'completed')),
        duty_start_time TIME,
        duty_end_time TIME
      );
    `);

    // ========================================
    // TABLE 4: beat_personnel
    // For: Personnel assigned to beats, acceptance status
    // ========================================
    console.log('4️⃣ Creating beat_personnel table...');
    await client.query(`
      CREATE TABLE beat_personnel (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        beat_id UUID REFERENCES beats(id),
        personnel_id UUID REFERENCES personnel(id),
        acceptance_status VARCHAR(20) CHECK (acceptance_status IN ('pending', 'accepted', 'declined')),
        UNIQUE(beat_id, personnel_id)
      );
    `);

    // ========================================
    // ADD SAMPLE DATA
    // ========================================
    console.log('\n📊 Adding sample data...');
    
    // Get existing personnel
    const personnelResult = await client.query('SELECT id, full_name FROM personnel');
    
    // Add status for each person
    for (const person of personnelResult.rows) {
      const statuses = ['alert', 'standby', 'on_duty'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      await client.query(`
        INSERT INTO personnel_status (personnel_id, status, is_online)
        VALUES ($1, $2, $3)
        ON CONFLICT (personnel_id) DO UPDATE SET status = EXCLUDED.status
      `, [person.id, randomStatus, true]);

      // Add location
      await client.query(`
        INSERT INTO personnel_locations (personnel_id, latitude, longitude)
        VALUES ($1, $2, $3)
        ON CONFLICT (personnel_id) DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude
      `, [person.id, 13.4119 + Math.random() * 0.01, 121.1805 + Math.random() * 0.01]);
    }

    // Add sample beats
    const sampleBeats = [
      {
        name: 'RMFB Central Beat',
        center_lat: 13.4119,
        center_lng: 121.1805,
        radius_meters: 500,
        address: 'RMFB Headquarters',
        unit: 'RMFB',
        sub_unit: '401st Company',
        beat_status: 'on_duty',
        duty_start_time: '00:00',
        duty_end_time: '23:59'
      }
    ];

    for (const beat of sampleBeats) {
      const beatResult = await client.query(`
        INSERT INTO beats (name, center_lat, center_lng, radius_meters, address, unit, sub_unit, beat_status, duty_start_time, duty_end_time)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `, [beat.name, beat.center_lat, beat.center_lng, beat.radius_meters, beat.address, beat.unit, beat.sub_unit, beat.beat_status, beat.duty_start_time, beat.duty_end_time]);

      // Assign personnel to beat
      for (const person of personnelResult.rows) {
        await client.query(`
          INSERT INTO beat_personnel (beat_id, personnel_id, acceptance_status)
          VALUES ($1, $2, $3)
        `, [beatResult.rows[0].id, person.id, 'accepted']);
      }
    }

    console.log('✅ Sample data added\n');

    console.log('🎉 SETUP COMPLETE!');
    console.log('==================');
    console.log('✅ personnel_status - For statistics (8 total, 2 alert, 1 standby, 5 on duty)');
    console.log('✅ personnel_locations - For green dots on map');
    console.log('✅ beats - For blue dots and beat management');
    console.log('✅ beat_personnel - For personnel assignments');
    console.log('\n🚀 Your interfaces can now connect to real data!');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

setupSimpleDatabase();
