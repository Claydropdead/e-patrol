/**
 * Add Sample Data Script for Live Monitoring
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xgsffeuluxsmgrhnrusl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnc2ZmZXVsdXhzbWdyaG5ydXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNTAwNzgsImV4cCI6MjA2OTYyNjA3OH0.LNvza1QMMMGBSDZw12ExqMNP4MnKXFenio4_xZBn4bM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function addSamplePersonnel() {
  console.log('🚀 Adding sample personnel data...');
  
  try {
    // Add sample personnel
    const samplePersonnel = [
      {
        full_name: 'PO1 Juan Dela Cruz',
        rank: 'PO1',
        email: 'juan.delacruz@pnp.gov.ph',
        province: 'Oriental Mindoro PPO',
        unit: 'Oriental Mindoro PPO',
        sub_unit: 'Calapan CPS',
        is_active: true
      },
      {
        full_name: 'PO2 Maria Santos',
        rank: 'PO2',
        email: 'maria.santos@pnp.gov.ph',
        province: 'Palawan PPO',
        unit: 'Palawan PPO',
        sub_unit: 'El Nido MPS',
        is_active: true
      },
      {
        full_name: 'PO3 Roberto Garcia',
        rank: 'PO3',
        email: 'roberto.garcia@pnp.gov.ph',
        province: 'Romblon PPO',
        unit: 'Romblon PPO',
        sub_unit: 'Romblon MPS',
        is_active: true
      },
      {
        full_name: 'SPO1 Carmen Lopez',
        rank: 'SPO1',
        email: 'carmen.lopez@pnp.gov.ph',
        province: 'Marinduque PPO',
        unit: 'Marinduque PPO',
        sub_unit: 'Boac MPS',
        is_active: true
      },
      {
        full_name: 'PO1 Miguel Rivera',
        rank: 'PO1',
        email: 'miguel.rivera@pnp.gov.ph',
        province: 'Occidental Mindoro PPO',
        unit: 'Occidental Mindoro PPO',
        sub_unit: 'Mamburao MPS',
        is_active: true
      }
    ];

    const { data: insertedPersonnel, error: personnelError } = await supabase
      .from('personnel')
      .upsert(samplePersonnel, { onConflict: 'email' })
      .select();

    if (personnelError) {
      console.error('❌ Error inserting personnel:', personnelError);
      return;
    }

    console.log(`✅ Added ${insertedPersonnel?.length || 0} personnel records`);
    return insertedPersonnel;
  } catch (error) {
    console.error('❌ Error adding sample personnel:', error);
  }
}

async function addSampleData() {
  console.log('📍 Adding sample location and status data...');
  
  try {
    // Get all personnel
    const { data: personnel, error: personnelError } = await supabase
      .from('personnel')
      .select('id, full_name');

    if (personnelError || !personnel) {
      console.error('❌ Error fetching personnel:', personnelError);
      return;
    }

    console.log(`Found ${personnel.length} personnel records`);

    // Sample coordinates for MIMAROPA region
    const sampleCoords = [
      { lat: 13.4117, lng: 121.1803 }, // Oriental Mindoro
      { lat: 11.1949, lng: 119.4094 }, // Palawan
      { lat: 12.5778, lng: 122.2681 }, // Romblon
      { lat: 13.4548, lng: 121.8431 }, // Marinduque
      { lat: 13.2186, lng: 120.5947 }, // Occidental Mindoro
    ];

    const statuses = ['alert', 'on_duty', 'standby'];

    for (let i = 0; i < personnel.length; i++) {
      const person = personnel[i];
      const coords = sampleCoords[i % sampleCoords.length];
      const status = statuses[i % statuses.length];

      // Add status history
      const { error: statusError } = await supabase
        .from('personnel_status_history')
        .insert({
          personnel_id: person.id,
          status: status,
          notes: status === 'alert' ? 'Emergency response' : 
                 status === 'on_duty' ? 'Regular patrol' : 'Awaiting assignment',
          status_changed_at: new Date(Date.now() - Math.random() * 10 * 60 * 1000).toISOString()
        });

      if (statusError) {
        console.error(`⚠️ Status error for ${person.full_name}:`, statusError);
      } else {
        console.log(`✅ Added status for ${person.full_name}: ${status}`);
      }

      // Add location data
      const { error: locationError } = await supabase
        .from('personnel_locations')
        .insert({
          personnel_id: person.id,
          latitude: coords.lat + (Math.random() - 0.5) * 0.01,
          longitude: coords.lng + (Math.random() - 0.5) * 0.01,
          accuracy: Math.random() * 10 + 5,
          timestamp: new Date(Date.now() - Math.random() * 5 * 60 * 1000).toISOString()
        });

      if (locationError) {
        console.error(`⚠️ Location error for ${person.full_name}:`, locationError);
      } else {
        console.log(`✅ Added location for ${person.full_name}`);
      }
    }

  } catch (error) {
    console.error('❌ Error adding sample data:', error);
  }
}

async function testLiveMonitoring() {
  console.log('\n🧪 Testing live monitoring view...');
  
  try {
    const { data, error } = await supabase
      .from('live_monitoring')
      .select('*');

    if (error) {
      console.error('❌ Error testing live monitoring:', error);
      return;
    }

    console.log(`✅ Live monitoring view works! Found ${data?.length || 0} records`);
    
    if (data && data.length > 0) {
      console.log('\n📊 Live Monitoring Data:');
      data.forEach((record, index) => {
        const location = record.latitude && record.longitude ? 
          `Lat: ${record.latitude.toFixed(4)}, Lng: ${record.longitude.toFixed(4)}` : 
          'No location';
        const online = record.is_online ? '🟢 Online' : '🔴 Offline';
        
        console.log(`  ${index + 1}. ${record.full_name} (${record.rank})`);
        console.log(`     Status: ${record.status} | ${online}`);
        console.log(`     Location: ${location}`);
        console.log(`     Unit: ${record.sub_unit}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error testing live monitoring:', error);
  }
}

async function main() {
  console.log('🎯 PNP E-Patrol Sample Data Setup\n');
  
  // Step 1: Add sample personnel
  await addSamplePersonnel();
  
  // Step 2: Add sample location and status data
  await addSampleData();
  
  // Step 3: Test the live monitoring view
  await testLiveMonitoring();
  
  console.log('🎉 Sample data setup completed!');
  console.log('💡 You can now test the Live Monitoring page in your application.');
}

main().catch(console.error);
