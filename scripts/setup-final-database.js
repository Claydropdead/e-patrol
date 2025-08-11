const { Client } = require('pg');

async function setupFinalDatabase() {
  const client = new Client({
    connectionString: 'postgresql://postgres:311212345@db.xgsffeuluxsmgrhnrusl.supabase.co:5432/postgres'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database!\n');

    console.log('📋 FINAL SIMPLE DATABASE SETUP');
    console.log('==============================\n');

    // Clean up completely
    console.log('🧹 Removing existing types and tables...');
    await client.query(`
      DROP TABLE IF EXISTS beat_personnel CASCADE;
      DROP TABLE IF EXISTS beats CASCADE;
      DROP TABLE IF EXISTS personnel_locations CASCADE;
      DROP TABLE IF EXISTS personnel_status CASCADE;
      DROP TYPE IF EXISTS personnel_status CASCADE;
    `);

    // ========================================
    // Create tables with simple TEXT fields (no custom types)
    // ========================================
    
    console.log('1️⃣ Creating personnel_status table...');
    await client.query(`
      CREATE TABLE personnel_status (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        personnel_id UUID REFERENCES personnel(id),
        status TEXT,
        is_online BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(personnel_id)
      );
    `);

    console.log('2️⃣ Creating personnel_locations table...');
    await client.query(`
      CREATE TABLE personnel_locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        personnel_id UUID REFERENCES personnel(id),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(personnel_id)
      );
    `);

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
        beat_status TEXT,
        duty_start_time TIME,
        duty_end_time TIME,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    console.log('4️⃣ Creating beat_personnel table...');
    await client.query(`
      CREATE TABLE beat_personnel (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        beat_id UUID REFERENCES beats(id),
        personnel_id UUID REFERENCES personnel(id),
        acceptance_status TEXT,
        assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(beat_id, personnel_id)
      );
    `);

    // ========================================
    // ADD SAMPLE DATA
    // ========================================
    console.log('\n📊 Adding sample data...');
    
    // Get existing personnel
    const personnelResult = await client.query('SELECT id, full_name FROM personnel');
    console.log(`Found ${personnelResult.rows.length} personnel`);
    
    // Add sample data for personnel
    for (let i = 0; i < personnelResult.rows.length; i++) {
      const person = personnelResult.rows[i];
      const statuses = ['alert', 'standby', 'on_duty'];
      const status = statuses[i % statuses.length]; // Distribute statuses
      
      // Add status
      await client.query(`
        INSERT INTO personnel_status (personnel_id, status, is_online)
        VALUES ($1, $2, $3)
      `, [person.id, status, true]);

      // Add location
      const lat = 13.4119 + (Math.random() - 0.5) * 0.02;
      const lng = 121.1805 + (Math.random() - 0.5) * 0.02;
      
      await client.query(`
        INSERT INTO personnel_locations (personnel_id, latitude, longitude)
        VALUES ($1, $2, $3)
      `, [person.id, lat, lng]);

      console.log(`  ✅ ${person.full_name}: ${status} status, location added`);
    }

    // Add sample beats
    const beats = [
      {
        name: 'RMFB Central Command Beat',
        center_lat: 13.4119,
        center_lng: 121.1805,
        radius_meters: 500,
        address: 'RMFB Headquarters, MIMAROPA',
        unit: 'RMFB',
        sub_unit: '401st Company',
        beat_status: 'on_duty',
        duty_start_time: '00:00',
        duty_end_time: '23:59'
      },
      {
        name: 'RMFB Perimeter Beat',
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

    for (const beat of beats) {
      const beatResult = await client.query(`
        INSERT INTO beats (name, center_lat, center_lng, radius_meters, address, unit, sub_unit, beat_status, duty_start_time, duty_end_time)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, name
      `, [beat.name, beat.center_lat, beat.center_lng, beat.radius_meters, beat.address, beat.unit, beat.sub_unit, beat.beat_status, beat.duty_start_time, beat.duty_end_time]);

      const beatId = beatResult.rows[0].id;
      console.log(`  ✅ Created beat: ${beatResult.rows[0].name}`);

      // Assign personnel to beats
      for (const person of personnelResult.rows) {
        await client.query(`
          INSERT INTO beat_personnel (beat_id, personnel_id, acceptance_status)
          VALUES ($1, $2, $3)
        `, [beatId, person.id, 'accepted']);
      }
    }

    console.log('\n🎉 SUCCESS! DATABASE SETUP COMPLETE');
    console.log('====================================');
    console.log('');
    console.log('📊 TABLES CREATED:');
    console.log('  ✅ personnel_status    → Live Monitoring statistics');
    console.log('  ✅ personnel_locations → Map green dots');  
    console.log('  ✅ beats              → Beat management & blue dots');
    console.log('  ✅ beat_personnel     → Personnel assignments');
    console.log('');
    console.log('📈 SAMPLE DATA ADDED:');
    console.log(`  ✅ ${personnelResult.rows.length} personnel with status & locations`);
    console.log('  ✅ 2 RMFB beats created');
    console.log('  ✅ Personnel assigned to beats');
    console.log('');
    console.log('🚀 YOUR INTERFACES ARE NOW READY TO CONNECT!');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Full error:', err);
  } finally {
    await client.end();
  }
}

setupFinalDatabase();
