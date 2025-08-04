/**
 * Admin Script to Add Sample Data using Service Role
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xgsffeuluxsmgrhnrusl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnc2ZmZXVsdXhzbWdyaG5ydXNsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA1MDA3OCwiZXhwIjoyMDY5NjI2MDc4fQ.0mPSKZibOUfgy4CWDoQuZPVDcGGVv51DXhpxeaNFpfo';

// Create admin client with service role key
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function addSampleDataAsAdmin() {
  console.log('🔑 Using admin access to add sample data...\n');
  
  try {
    // Get existing personnel using admin access
    const { data: personnel, error: personnelError } = await supabaseAdmin
      .from('personnel')
      .select('id, full_name, rank, email, sub_unit');

    if (personnelError) {
      console.error('❌ Admin personnel query error:', personnelError);
      return;
    }

    console.log(`📋 Found ${personnel?.length || 0} personnel records:`);
    if (personnel) {
      personnel.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.full_name} (${p.rank}) - ${p.email}`);
      });
    }

    if (!personnel || personnel.length === 0) {
      console.log('\n❌ No personnel found even with admin access');
      return;
    }

    const person = personnel[0];
    console.log(`\n🎯 Adding data for: ${person.full_name}\n`);

    // Add status history
    const statusData = [
      {
        personnel_id: person.id,
        status: 'on_duty',
        notes: 'Regular patrol started',
        status_changed_at: new Date(Date.now() - 20 * 60 * 1000).toISOString()
      },
      {
        personnel_id: person.id,
        status: 'alert',
        notes: 'Emergency response required',
        status_changed_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
      },
      {
        personnel_id: person.id,
        status: 'on_duty',
        notes: 'Back to regular patrol',
        status_changed_at: new Date(Date.now() - 2 * 60 * 1000).toISOString()
      }
    ];

    console.log('📊 Adding status history...');
    for (const status of statusData) {
      const { data, error } = await supabaseAdmin
        .from('personnel_status_history')
        .insert(status)
        .select();

      if (error) {
        console.log(`⚠️ Status error: ${error.message}`);
      } else {
        console.log(`✅ Added status: ${status.status} - ${status.notes}`);
      }
    }

    // Add location data (Oriental Mindoro area - Looc MPS location)
    const baseLocation = { lat: 13.4117, lng: 121.1803 };
    const locationData = [];

    for (let i = 0; i < 5; i++) {
      const timeAgo = (i + 1) * 2 * 60 * 1000; // Every 2 minutes
      locationData.push({
        personnel_id: person.id,
        latitude: baseLocation.lat + (Math.random() - 0.5) * 0.003,
        longitude: baseLocation.lng + (Math.random() - 0.5) * 0.003,
        accuracy: 3 + Math.random() * 5,
        speed: 10 + Math.random() * 15,
        heading: Math.random() * 360,
        timestamp: new Date(Date.now() - timeAgo).toISOString()
      });
    }

    console.log('\n📍 Adding location tracking...');
    for (const location of locationData) {
      const { data, error } = await supabaseAdmin
        .from('personnel_locations')
        .insert(location)
        .select();

      if (error) {
        console.log(`⚠️ Location error: ${error.message}`);
      } else {
        const minsAgo = Math.round((Date.now() - new Date(location.timestamp).getTime()) / 60000);
        console.log(`✅ Location: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)} (${minsAgo}m ago)`);
      }
    }

  } catch (error) {
    console.error('❌ Admin script error:', error);
  }
}

async function testLiveMonitoringAdmin() {
  console.log('\n🧪 Testing live monitoring with admin access...\n');
  
  try {
    const { data, error } = await supabaseAdmin
      .from('live_monitoring')
      .select('*');

    if (error) {
      console.error('❌ Live monitoring test error:', error);
      return;
    }

    console.log(`✅ Live monitoring found ${data?.length || 0} personnel\n`);
    
    if (data && data.length > 0) {
      data.forEach((record) => {
        const hasLocation = record.latitude && record.longitude;
        const location = hasLocation ? 
          `📍 ${record.latitude.toFixed(4)}, ${record.longitude.toFixed(4)}` : 
          '📍 No location data';
        const online = record.is_online ? '🟢 ONLINE' : '🔴 Offline';
        const lastUpdate = record.minutes_since_update ? 
          `${Math.round(record.minutes_since_update)} minutes ago` : 'No recent updates';
        
        console.log(`👮‍♀️ ${record.full_name} (${record.rank})`);
        console.log(`   ${location}`);
        console.log(`   🚨 Status: ${record.status?.toUpperCase() || 'UNKNOWN'}`);
        console.log(`   📱 ${online} (${lastUpdate})`);
        console.log(`   🏢 Unit: ${record.sub_unit}`);
        if (record.status_notes) {
          console.log(`   📝 Notes: ${record.status_notes}`);
        }
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Live monitoring test error:', error);
  }
}

async function main() {
  console.log('🎯 PNP E-Patrol Admin Sample Data Setup\n');
  
  await addSampleDataAsAdmin();
  await testLiveMonitoringAdmin();
  
  console.log('🎉 Sample data setup completed!');
  console.log('\n🚀 Your Live Monitoring page should now show:');
  console.log('   ✅ Real-time location tracking');
  console.log('   ✅ Current duty status');
  console.log('   ✅ Online/offline indicators');
  console.log('   ✅ Interactive map markers');
  console.log('\n💡 Open http://localhost:3001/dashboard and check the Live Monitoring tab!');
}

main().catch(console.error);
