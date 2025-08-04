/**
 * Add Sample Data for Existing Personnel
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xgsffeuluxsmgrhnrusl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnc2ZmZXVsdXhzbWdyaG5ydXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNTAwNzgsImV4cCI6MjA2OTYyNjA3OH0.LNvza1QMMMGBSDZw12ExqMNP4MnKXFenio4_xZBn4bM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function addDataForExistingPersonnel() {
  console.log('🎯 Adding location and status data for existing personnel...\n');
  
  try {
    // Get existing personnel
    const { data: personnel, error: personnelError } = await supabase
      .from('personnel')
      .select('id, full_name, rank, sub_unit');

    if (personnelError) {
      console.error('❌ Error fetching personnel:', personnelError);
      return;
    }

    if (!personnel || personnel.length === 0) {
      console.log('❌ No personnel found');
      return;
    }

    console.log(`📋 Found personnel: ${personnel[0].full_name} (${personnel[0].rank})`);
    const person = personnel[0];

    // Add multiple status history entries to show progression
    const statusEntries = [
      {
        personnel_id: person.id,
        status: 'on_duty',
        notes: 'Started regular patrol',
        status_changed_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutes ago
      },
      {
        personnel_id: person.id,
        status: 'alert',
        notes: 'Responding to emergency call',
        status_changed_at: new Date(Date.now() - 15 * 60 * 1000).toISOString() // 15 minutes ago
      },
      {
        personnel_id: person.id,
        status: 'on_duty',
        notes: 'Emergency resolved, back to patrol',
        status_changed_at: new Date(Date.now() - 5 * 60 * 1000).toISOString() // 5 minutes ago
      }
    ];

    console.log('📊 Adding status history...');
    for (const entry of statusEntries) {
      const { error: statusError } = await supabase
        .from('personnel_status_history')
        .insert(entry);

      if (statusError) {
        console.log(`⚠️ Status insert warning: ${statusError.message}`);
      } else {
        console.log(`✅ Added status: ${entry.status} (${entry.notes})`);
      }
    }

    // Add location tracking data (simulating movement in Oriental Mindoro)
    const baseLocation = { lat: 13.4117, lng: 121.1803 }; // Oriental Mindoro coordinates
    const locationEntries = [];

    // Generate 10 location points showing movement over the last hour
    for (let i = 0; i < 10; i++) {
      const timeOffset = (60 - i * 6) * 60 * 1000; // Every 6 minutes, going back 1 hour
      const latOffset = (Math.random() - 0.5) * 0.005; // Small random movement
      const lngOffset = (Math.random() - 0.5) * 0.005;
      
      locationEntries.push({
        personnel_id: person.id,
        latitude: baseLocation.lat + latOffset,
        longitude: baseLocation.lng + lngOffset,
        accuracy: Math.random() * 5 + 3, // 3-8 meter accuracy
        speed: Math.random() * 20 + 5, // 5-25 km/h
        heading: Math.random() * 360, // Random direction
        timestamp: new Date(Date.now() - timeOffset).toISOString()
      });
    }

    console.log('📍 Adding location tracking data...');
    for (const entry of locationEntries) {
      const { error: locationError } = await supabase
        .from('personnel_locations')
        .insert(entry);

      if (locationError) {
        console.log(`⚠️ Location insert warning: ${locationError.message}`);
      } else {
        const timeAgo = Math.round((Date.now() - new Date(entry.timestamp).getTime()) / (1000 * 60));
        console.log(`✅ Added location: ${entry.latitude.toFixed(4)}, ${entry.longitude.toFixed(4)} (${timeAgo}m ago)`);
      }
    }

  } catch (error) {
    console.error('❌ Error adding data:', error);
  }
}

async function testFinalResult() {
  console.log('\n🧪 Testing final live monitoring result...\n');
  
  try {
    const { data, error } = await supabase
      .from('live_monitoring')
      .select('*');

    if (error) {
      console.error('❌ Error testing live monitoring:', error);
      return;
    }

    console.log(`✅ Live monitoring view: ${data?.length || 0} personnel found\n`);
    
    if (data && data.length > 0) {
      data.forEach((record, index) => {
        const location = record.latitude && record.longitude ? 
          `${record.latitude.toFixed(4)}, ${record.longitude.toFixed(4)}` : 
          'No location';
        const online = record.is_online ? '🟢 ONLINE' : '🔴 Offline';
        const minutesAgo = record.minutes_since_update ? 
          `${Math.round(record.minutes_since_update)}m ago` : 'No data';
        
        console.log(`👮 ${record.full_name} (${record.rank})`);
        console.log(`   📍 Location: ${location}`);
        console.log(`   🚨 Status: ${record.status.toUpperCase()}`);
        console.log(`   📱 Connection: ${online} (${minutesAgo})`);
        console.log(`   🏢 Unit: ${record.sub_unit}`);
        console.log(`   📧 Email: ${record.email}`);
        if (record.status_notes) {
          console.log(`   📝 Notes: ${record.status_notes}`);
        }
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error testing final result:', error);
  }
}

async function main() {
  console.log('🎯 PNP E-Patrol Live Data Setup for Existing Personnel\n');
  
  await addDataForExistingPersonnel();
  await testFinalResult();
  
  console.log('🎉 Live monitoring data setup completed!');
  console.log('🚀 Your Live Monitoring page should now show real data with:');
  console.log('   • Current location tracking');
  console.log('   • Status updates (on_duty)');
  console.log('   • Online/offline status');
  console.log('   • Movement history');
  console.log('\n💡 Open the Live Monitoring page to see the results!');
}

main().catch(console.error);
