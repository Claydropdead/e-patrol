const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function analyzeDatabase() {
  console.log('🔍 Analyzing database tables and their contents...\n');

  try {
    // List of tables to check
    const tablesToCheck = [
      'admin_accounts',
      'audit_logs', 
      'personnel',
      'personnel_assignment_history',
      'personnel_locations',
      'personnel_status_history',
      'personnel_current_location',
      'personnel_current_status',
      'live_monitoring',
      'geofence_beats',
      'geofence_violations',
      'geofence_location_logs',
      'geofence_settings',
      'geofence_beat_assignments',
      'mobile_beat_sessions'
    ];

    console.log('=== CHECKING TABLE EXISTENCE AND CONTENT ===\n');
    
    const existingTables = [];
    const emptyTables = [];
    const nonEmptyTables = [];

    for (const tableName of tablesToCheck) {
      try {
        console.log(`🔍 Checking ${tableName}...`);
        
        // Try to query the table
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error) {
          if (error.code === '42P01') {
            console.log(`   ❌ Table '${tableName}' does not exist`);
          } else {
            console.log(`   ⚠️  Error accessing '${tableName}': ${error.message}`);
          }
        } else {
          existingTables.push(tableName);
          const rowCount = count || 0;
          
          if (rowCount === 0) {
            emptyTables.push(tableName);
            console.log(`   📋 '${tableName}' exists but is EMPTY (0 rows)`);
          } else {
            nonEmptyTables.push({ name: tableName, count: rowCount });
            console.log(`   ✅ '${tableName}' exists with ${rowCount} rows`);
          }
        }
        
      } catch (err) {
        console.log(`   ❌ Error checking '${tableName}': ${err.message}`);
      }
    }

    console.log('\n=== DETAILED CONTENT ANALYSIS ===\n');
    
    // Check content of non-empty tables
    for (const table of nonEmptyTables) {
      console.log(`📊 ${table.name.toUpperCase()} (${table.count} rows)`);
      
      try {
        const { data: sampleData } = await supabase
          .from(table.name)
          .select('*')
          .limit(3);

        if (sampleData && sampleData.length > 0) {
          console.log('   Sample data:');
          sampleData.forEach((row, index) => {
            const rowPreview = JSON.stringify(row).substring(0, 150);
            console.log(`   ${index + 1}. ${rowPreview}${rowPreview.length >= 150 ? '...' : ''}`);
          });
        }
      } catch (err) {
        console.log(`   Error getting sample data: ${err.message}`);
      }
      console.log('');
    }

    console.log('=== SUMMARY ===');
    console.log(`📊 Total tables checked: ${tablesToCheck.length}`);
    console.log(`✅ Existing tables: ${existingTables.length}`);
    console.log(`📈 Tables with data: ${nonEmptyTables.length}`);
    console.log(`📉 Empty tables: ${emptyTables.length}`);

    if (nonEmptyTables.length > 0) {
      console.log('\n🔸 Tables with data:');
      nonEmptyTables
        .sort((a, b) => b.count - a.count)
        .forEach(table => {
          console.log(`   - ${table.name}: ${table.count} rows`);
        });
    }

    if (emptyTables.length > 0) {
      console.log('\n🗑️  Empty tables (candidates for deletion):');
      emptyTables.forEach(table => {
        console.log(`   - ${table}`);
      });
    }

    // Check for missing essential tables
    const essentialTables = ['admin_accounts', 'personnel', 'geofence_beats', 'geofence_violations'];
    const missingEssential = essentialTables.filter(table => !existingTables.includes(table));
    
    if (missingEssential.length > 0) {
      console.log('\n⚠️  Missing essential tables:');
      missingEssential.forEach(table => {
        console.log(`   - ${table}`);
      });
    }

    // Recommendations
    console.log('\n=== RECOMMENDATIONS ===');
    
    if (emptyTables.length > 0) {
      console.log('🗑️  Empty tables that can be safely deleted:');
      emptyTables.forEach(table => {
        console.log(`   DROP TABLE IF EXISTS ${table};`);
      });
    }

    if (nonEmptyTables.length > 0) {
      console.log('\n✅ Keep these tables (they contain data):');
      nonEmptyTables.forEach(table => {
        console.log(`   - ${table.name} (${table.count} rows)`);
      });
    }

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

analyzeDatabase();
