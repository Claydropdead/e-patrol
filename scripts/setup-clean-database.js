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

    // Clean up any existing tables first
    console.log('🧹 Cleaning up existing tables...');
    await client.query(`
      DROP TABLE IF EXISTS beat_personnel CASCADE;
      DROP TABLE IF EXISTS beats CASCADE;
      DROP TABLE IF EXISTS personnel_locations CASCADE;
      DROP TABLE IF EXISTS personnel_status CASCADE;
    `);

    // ========================================
    // TABLE 1: personnel_status
    // ========================================
    console.log('1️⃣ Creating personnel_status table...');
    await client.query(`
      CREATE TABLE personnel_status (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        personnel_id UUID REFERENCES personnel(id),
        status TEXT CHECK (status IN ('alert', 'standby', 'on_duty')),
        is_online BOOLEAN DEFAULT FALSE,
        UNIQUE(personnel_id)
      );
    `);

    // ========================================
    // TABLE 2: personnel_locations  
    // ========================================
    console.log('2️⃣ Creating personnel_locations table...');
    await client.query(`
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
    // ========================================
    console.log('3️⃣ Creating beats table...');
    await client.query(`
      CREATE TABLE beats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT,
        center_lat DECIMAL(10, 8),
        center_lng DECIMAL(11, 8),
        radius_meters INTEGER DEFAULT 500,
        address TEXT,
        unit TEXT,
        sub_unit TEXT,
        beat_status TEXT CHECK (beat_status IN ('pending', 'on_duty', 'completed')),
        duty_start_time TIME,
        duty_end_time TIME
      );
    `);

    // ========================================
    // TABLE 4: beat_personnel
    // ========================================
    console.log('4️⃣ Creating beat_personnel table...');
    await client.query(`
      CREATE TABLE beat_personnel (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        beat_id UUID REFERENCES beats(id),
        personnel_id UUID REFERENCES personnel(id),
        acceptance_status TEXT CHECK (acceptance_status IN ('pending', 'accepted', 'declined')),
        UNIQUE(beat_id, personnel_id)
      );
    `);

    // ========================================
    // ADD SAMPLE DATA
    // ========================================
    console.log('\n📊 Adding sample data...');
    
    // Get existing personnel
    const personnelResult = await client.query('SELECT id, full_name FROM personnel');
    console.log(`Found ${personnelResult.rows.length} personnel in database`);
    
    // Add status for each person
    for (const person of personnelResult.rows) {
      const statuses = ['alert', 'standby', 'on_duty'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      await client.query(`
        INSERT INTO personnel_status (personnel_id, status, is_online)
        VALUES ($1, $2, $3)
      `, [person.id, randomStatus, true]);

      // Add location (MIMAROPA region)
      await client.query(`
        INSERT INTO personnel_locations (personnel_id, latitude, longitude)
        VALUES ($1, $2, $3)
      `, [person.id, 13.4119 + Math.random() * 0.01, 121.1805 + Math.random() * 0.01]);

      console.log(`  ✅ Added status (${randomStatus}) and location for ${person.full_name}`);
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
      },
      {
        name: 'RMFB Training Beat',
        center_lat: 13.4200,
        center_lng: 121.1900,
        radius_meters: 300,
        address: 'RMFB Training Ground',
        unit: 'RMFB',
        sub_unit: '401st Company',
        beat_status: 'pending',
        duty_start_time: '06:00',
        duty_end_time: '18:00'
      }
    ];

    for (const beat of sampleBeats) {
      const beatResult = await client.query(`
        INSERT INTO beats (name, center_lat, center_lng, radius_meters, address, unit, sub_unit, beat_status, duty_start_time, duty_end_time)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `, [beat.name, beat.center_lat, beat.center_lng, beat.radius_meters, beat.address, beat.unit, beat.sub_unit, beat.beat_status, beat.duty_start_time, beat.duty_end_time]);

      console.log(`  ✅ Created beat: ${beat.name}`);

      // Assign personnel to beat
      for (const person of personnelResult.rows) {
        await client.query(`
          INSERT INTO beat_personnel (beat_id, personnel_id, acceptance_status)
          VALUES ($1, $2, $3)
        `, [beatResult.rows[0].id, person.id, 'accepted']);
      }
    }

    console.log('\n🎉 SETUP COMPLETE!');
    console.log('==================');
    console.log('✅ personnel_status - For Live Monitoring statistics');
    console.log('✅ personnel_locations - For map green dots');
    console.log('✅ beats - For geofencing and blue dots');
    console.log('✅ beat_personnel - For personnel assignments');
    console.log('\n🚀 Your interfaces can now connect to real database data!');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

setupSimpleDatabase();
