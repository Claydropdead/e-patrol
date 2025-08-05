const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:311212345@db.xgsffeuluxsmgrhnrusl.supabase.co:5432/postgres'
});

async function cleanupToAuditAndUserOnly() {
  try {
    console.log('🧹 Cleaning database to keep only audit logs and user management...\n');
    await client.connect();

    // Tables to KEEP (only audit logs and user management)
    const tablesToKeep = [
      'admin_accounts',      // User management
      'audit_logs',          // Audit logging
      'spatial_ref_sys',     // PostGIS system table (required)
      'geography_columns',   // PostGIS system table (if exists)
      'geometry_columns'     // PostGIS system table (if exists)
    ];

    // Get all current tables
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('=== CURRENT TABLES ===');
    const allTables = tablesResult.rows.map(row => row.table_name);
    allTables.forEach((table, index) => {
      const shouldKeep = tablesToKeep.includes(table);
      const status = shouldKeep ? '✅ KEEP' : '❌ DELETE';
      console.log(`   ${index + 1}. ${table}: ${status}`);
    });

    // Tables to delete (everything except what we want to keep)
    const tablesToDelete = allTables.filter(table => !tablesToKeep.includes(table));

    if (tablesToDelete.length === 0) {
      console.log('\n✅ No tables to delete. Database already clean.');
      return;
    }

    console.log(`\n=== TABLES TO DELETE (${tablesToDelete.length}) ===`);
    tablesToDelete.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table}`);
    });

    // Show data that will be lost
    console.log('\n=== CHECKING DATA BEFORE DELETION ===');
    for (const tableName of tablesToDelete) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
        const rowCount = parseInt(countResult.rows[0].count);
        console.log(`📊 ${tableName}: ${rowCount} rows will be deleted`);
      } catch (error) {
        console.log(`⚠️  Error checking ${tableName}: ${error.message}`);
      }
    }

    // Confirmation prompt simulation (in real app, you'd want actual user confirmation)
    console.log('\n⚠️  WARNING: This will permanently delete the following data:');
    console.log('   - All personnel records and tracking data');
    console.log('   - All geofencing beats, violations, and assignments');
    console.log('   - All location tracking history');
    console.log('   - All mobile session data');
    console.log('\n🔒 KEEPING ONLY:');
    console.log('   - Admin accounts (user management)');
    console.log('   - Audit logs (system audit trail)');
    console.log('   - PostGIS system tables');

    console.log('\n=== PROCEEDING WITH DELETION ===');

    // Delete tables in order (considering dependencies)
    const deletionOrder = [
      'mobile_beat_sessions',           // References assignments
      'geofence_beat_assignments',      // References beats and personnel
      'geofence_violations',            // References beats and personnel
      'geofence_beats',                 // Referenced by violations and assignments
      'personnel_locations',            // References personnel
      'personnel_status_history',       // References personnel
      'personnel_assignment_history',   // References personnel
      'personnel_current_location',     // View - references personnel
      'personnel_current_status',       // View - references personnel
      'live_monitoring',                // View - references personnel
      'personnel'                       // Base personnel table
    ];

    // Delete in specific order to handle dependencies
    for (const tableName of deletionOrder) {
      if (tablesToDelete.includes(tableName)) {
        try {
          await client.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
          console.log(`✅ Deleted: ${tableName}`);
        } catch (error) {
          console.log(`❌ Error deleting ${tableName}: ${error.message}`);
        }
      }
    }

    // Delete any remaining tables not in the deletion order
    for (const tableName of tablesToDelete) {
      if (!deletionOrder.includes(tableName)) {
        try {
          await client.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
          console.log(`✅ Deleted: ${tableName}`);
        } catch (error) {
          console.log(`❌ Error deleting ${tableName}: ${error.message}`);
        }
      }
    }

    console.log('\n=== FINAL DATABASE STATE ===');
    
    // Check remaining tables
    const finalTablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log(`📊 Remaining tables: ${finalTablesResult.rows.length}`);
    
    const finalTableInfo = [];
    for (const table of finalTablesResult.rows) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM "${table.table_name}"`);
        const rowCount = parseInt(countResult.rows[0].count);
        finalTableInfo.push({ name: table.table_name, count: rowCount });
      } catch (error) {
        console.log(`⚠️  Could not check ${table.table_name}: ${error.message}`);
      }
    }

    console.log('\n📋 Final table inventory:');
    finalTableInfo.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table.name}: ${table.count} rows`);
    });

    const totalRecords = finalTableInfo.reduce((sum, table) => sum + table.count, 0);
    console.log(`\n📊 Total records: ${totalRecords}`);

    // Verify essential tables remain
    console.log('\n=== VERIFICATION ===');
    const adminAccountsExists = finalTableInfo.find(t => t.name === 'admin_accounts');
    const auditLogsExists = finalTableInfo.find(t => t.name === 'audit_logs');

    if (adminAccountsExists) {
      console.log(`✅ admin_accounts: ${adminAccountsExists.count} admin users preserved`);
    } else {
      console.log(`❌ admin_accounts: MISSING!`);
    }

    if (auditLogsExists) {
      console.log(`✅ audit_logs: ${auditLogsExists.count} audit records preserved`);
    } else {
      console.log(`❌ audit_logs: MISSING!`);
    }

    console.log('\n🎉 Database cleanup completed!');
    console.log('\n📋 Summary:');
    console.log(`   - Tables deleted: ${tablesToDelete.length}`);
    console.log(`   - Tables remaining: ${finalTableInfo.length}`);
    console.log(`   - Focus: Audit logs and user management only`);
    console.log(`   - All personnel/geofencing data removed`);

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await client.end();
    console.log('\n🔒 Database connection closed.');
  }
}

cleanupToAuditAndUserOnly();
