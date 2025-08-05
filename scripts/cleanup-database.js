const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:311212345@db.xgsffeuluxsmgrhnrusl.supabase.co:5432/postgres'
});

async function cleanupDatabase() {
  try {
    console.log('🧹 Starting database cleanup...\n');
    await client.connect();

    // Tables to delete (empty tables identified)
    const tablesToDelete = [
      'geofence_location_logs',
      'geofence_settings'
    ];

    console.log('=== VERIFYING EMPTY TABLES BEFORE DELETION ===');
    
    for (const tableName of tablesToDelete) {
      try {
        // Double-check that table is empty
        const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
        const rowCount = parseInt(countResult.rows[0].count);
        
        console.log(`📊 ${tableName}: ${rowCount} rows`);
        
        if (rowCount > 0) {
          console.log(`⚠️  ${tableName} has data! Skipping deletion for safety.`);
        }
      } catch (error) {
        console.log(`❌ Error checking ${tableName}: ${error.message}`);
      }
    }

    console.log('\n=== DELETING EMPTY TABLES ===');
    
    for (const tableName of tablesToDelete) {
      try {
        // Check if table exists and is empty before deleting
        const exists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = $1
          );
        `, [tableName]);

        if (exists.rows[0].exists) {
          const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
          const rowCount = parseInt(countResult.rows[0].count);
          
          if (rowCount === 0) {
            await client.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
            console.log(`✅ Deleted empty table: ${tableName}`);
          } else {
            console.log(`⚠️  Skipped ${tableName} - contains ${rowCount} rows`);
          }
        } else {
          console.log(`ℹ️  Table ${tableName} does not exist`);
        }
      } catch (error) {
        console.log(`❌ Error deleting ${tableName}: ${error.message}`);
      }
    }

    console.log('\n=== ANALYZING REMAINING TABLES ===');
    
    // Get list of remaining tables
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log(`📊 Remaining tables: ${tablesResult.rows.length}`);
    
    // Check table sizes after cleanup
    const tableInfo = [];
    for (const table of tablesResult.rows) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM "${table.table_name}"`);
        const rowCount = parseInt(countResult.rows[0].count);
        tableInfo.push({ name: table.table_name, count: rowCount });
      } catch (error) {
        console.log(`⚠️  Could not check ${table.table_name}: ${error.message}`);
      }
    }

    // Sort by row count (descending)
    tableInfo.sort((a, b) => b.count - a.count);
    
    console.log('\n📋 Final table inventory:');
    tableInfo.forEach((table, index) => {
      const status = table.count === 0 ? '❌ EMPTY' : `✅ ${table.count} rows`;
      console.log(`   ${index + 1}. ${table.name}: ${status}`);
    });

    // Calculate total records
    const totalRecords = tableInfo.reduce((sum, table) => sum + table.count, 0);
    console.log(`\n📊 Total records across all tables: ${totalRecords}`);

    // Show essential PNP E-Patrol tables status
    console.log('\n=== ESSENTIAL PNP E-PATROL TABLES STATUS ===');
    const essentialTables = [
      'admin_accounts',
      'personnel',
      'geofence_beats', 
      'geofence_violations',
      'geofence_beat_assignments',
      'mobile_beat_sessions',
      'audit_logs',
      'live_monitoring'
    ];

    essentialTables.forEach(tableName => {
      const tableData = tableInfo.find(t => t.name === tableName);
      if (tableData) {
        console.log(`   ✅ ${tableName}: ${tableData.count} rows`);
      } else {
        console.log(`   ❌ ${tableName}: MISSING`);
      }
    });

    console.log('\n🎉 Database cleanup completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Empty tables removed: ${tablesToDelete.length}`);
    console.log(`   - Remaining tables: ${tableInfo.length}`);
    console.log(`   - Total data records: ${totalRecords}`);

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await client.end();
    console.log('\n🔒 Database connection closed.');
  }
}

cleanupDatabase();
