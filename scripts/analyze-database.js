const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:311212345@db.xgsffeuluxsmgrhnrusl.supabase.co:5432/postgres'
});

async function analyzeDatabase() {
  try {
    console.log('🔍 Analyzing database tables and their contents...\n');
    await client.connect();

    // Get all tables in public schema
    console.log('=== ALL TABLES IN PUBLIC SCHEMA ===');
    const tablesResult = await client.query(`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log(`Found ${tablesResult.rows.length} tables:`);
    const tableNames = [];
    tablesResult.rows.forEach((table, index) => {
      console.log(`${index + 1}. ${table.table_name} (${table.column_count} columns)`);
      tableNames.push(table.table_name);
    });

    console.log('\n=== CHECKING TABLE CONTENTS ===');
    const emptyTables = [];
    const nonEmptyTables = [];

    for (const tableName of tableNames) {
      try {
        // Get row count
        const countResult = await client.query(`SELECT COUNT(*) as row_count FROM "${tableName}"`);
        const rowCount = parseInt(countResult.rows[0].row_count);

        // Get column info
        const columnsResult = await client.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = $1 AND table_schema = 'public'
          ORDER BY ordinal_position;
        `, [tableName]);

        console.log(`\n📊 ${tableName.toUpperCase()}`);
        console.log(`   Rows: ${rowCount}`);
        console.log(`   Columns: ${columnsResult.rows.length}`);
        
        if (rowCount === 0) {
          emptyTables.push(tableName);
          console.log(`   ❌ EMPTY TABLE`);
        } else {
          nonEmptyTables.push({name: tableName, count: rowCount});
          console.log(`   ✅ Contains data`);
          
          // Show sample data for non-empty tables
          if (rowCount <= 5) {
            const sampleResult = await client.query(`SELECT * FROM "${tableName}" LIMIT 3`);
            console.log(`   📋 Sample data:`);
            sampleResult.rows.forEach((row, idx) => {
              console.log(`      ${idx + 1}. ${JSON.stringify(row, null, 2).substring(0, 100)}...`);
            });
          }
        }

        // Show column structure
        console.log(`   📝 Columns:`);
        columnsResult.rows.forEach(col => {
          console.log(`      - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
        });

      } catch (error) {
        console.log(`   ❌ Error checking ${tableName}: ${error.message}`);
      }
    }

    console.log('\n=== SUMMARY ===');
    console.log(`📊 Total tables: ${tableNames.length}`);
    console.log(`✅ Tables with data: ${nonEmptyTables.length}`);
    console.log(`❌ Empty tables: ${emptyTables.length}`);

    if (nonEmptyTables.length > 0) {
      console.log('\n🔸 Tables with data:');
      nonEmptyTables.forEach(table => {
        console.log(`   - ${table.name} (${table.count} rows)`);
      });
    }

    if (emptyTables.length > 0) {
      console.log('\n🔸 Empty tables (candidates for deletion):');
      emptyTables.forEach(table => {
        console.log(`   - ${table}`);
      });
    }

    // Check for specific PNP E-Patrol related tables
    console.log('\n=== PNP E-PATROL SPECIFIC TABLES ===');
    const importantTables = [
      'admin_accounts',
      'personnel', 
      'geofence_beats',
      'geofence_violations',
      'geofence_beat_assignments',
      'mobile_beat_sessions',
      'audit_logs',
      'live_monitoring',
      'personnel_locations'
    ];

    importantTables.forEach(tableName => {
      const exists = tableNames.includes(tableName);
      const hasData = nonEmptyTables.find(t => t.name === tableName);
      
      if (exists && hasData) {
        console.log(`   ✅ ${tableName} - EXISTS and has ${hasData.count} rows`);
      } else if (exists) {
        console.log(`   ⚠️  ${tableName} - EXISTS but EMPTY`);
      } else {
        console.log(`   ❌ ${tableName} - MISSING`);
      }
    });

    // Show foreign key relationships
    console.log('\n=== FOREIGN KEY RELATIONSHIPS ===');
    const fkResult = await client.query(`
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name;
    `);

    if (fkResult.rows.length > 0) {
      console.log('Foreign key relationships found:');
      fkResult.rows.forEach(fk => {
        console.log(`   ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    } else {
      console.log('No foreign key relationships found.');
    }

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  } finally {
    await client.end();
    console.log('\n🔒 Database connection closed.');
  }
}

analyzeDatabase();
