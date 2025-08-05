const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:311212345@db.xgsffeuluxsmgrhnrusl.supabase.co:5432/postgres'
});

async function removeGeometryColumns() {
  try {
    console.log('🗑️ Starting removal of geometry and spatial columns...\n');
    await client.connect();

    // Step 1: Check for geometry columns in all tables
    console.log('=== SCANNING FOR GEOMETRY/SPATIAL COLUMNS ===');
    const geometryColumns = await client.query(`
      SELECT 
        table_name, 
        column_name, 
        data_type,
        udt_name
      FROM information_schema.columns 
      WHERE 
        table_schema = 'public' AND (
          data_type = 'geometry' OR 
          data_type = 'geography' OR
          udt_name = 'geometry' OR
          udt_name = 'geography' OR
          column_name ILIKE '%geom%' OR
          column_name ILIKE '%spatial%' OR
          column_name ILIKE '%location%' OR
          column_name ILIKE '%point%'
        )
      ORDER BY table_name, column_name;
    `);

    if (geometryColumns.rows.length > 0) {
      console.log('📍 Found geometry/spatial columns:');
      geometryColumns.rows.forEach(row => {
        console.log(`   ${row.table_name}.${row.column_name} (${row.data_type}/${row.udt_name})`);
      });

      // Step 2: Remove geometry columns
      console.log('\n=== REMOVING GEOMETRY COLUMNS ===');
      for (const row of geometryColumns.rows) {
        try {
          console.log(`🔧 Dropping column ${row.table_name}.${row.column_name}...`);
          await client.query(`ALTER TABLE "${row.table_name}" DROP COLUMN IF EXISTS "${row.column_name}" CASCADE;`);
          console.log(`✅ Removed ${row.table_name}.${row.column_name}`);
        } catch (error) {
          console.log(`❌ Error removing ${row.table_name}.${row.column_name}: ${error.message}`);
        }
      }
    } else {
      console.log('✅ No geometry/spatial columns found in user tables');
    }

    // Step 3: Remove PostGIS system tables and views (AGGRESSIVE)
    console.log('\n=== REMOVING POSTGIS SYSTEM OBJECTS (AGGRESSIVE) ===');
    
    // First, try to remove PostGIS extensions completely
    console.log('🗺️ Attempting to remove PostGIS extensions...');
    const extensionsToRemove = ['postgis', 'postgis_topology', 'postgis_raster'];
    
    for (const extName of extensionsToRemove) {
      try {
        console.log(`🔧 Dropping extension ${extName}...`);
        await client.query(`DROP EXTENSION IF EXISTS "${extName}" CASCADE;`);
        console.log(`✅ Removed extension ${extName}`);
      } catch (error) {
        console.log(`❌ Cannot remove extension ${extName}: ${error.message}`);
      }
    }
    
    // List of PostGIS system tables/views to remove
    const postgisObjects = [
      'geography_columns',
      'geometry_columns', 
      'spatial_ref_sys'
    ];
    
    for (const objectName of postgisObjects) {
      try {
        // Check if it's a view first
        const isView = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.views 
            WHERE table_schema = 'public' AND table_name = $1
          );
        `, [objectName]);
        
        // Check if it's a table
        const isTable = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = $1 AND table_type = 'BASE TABLE'
          );
        `, [objectName]);
        
        if (isView.rows[0].exists) {
          console.log(`🗂️ Dropping view ${objectName}...`);
          await client.query(`DROP VIEW IF EXISTS "${objectName}" CASCADE;`);
          console.log(`✅ Removed view ${objectName}`);
        } else if (isTable.rows[0].exists) {
          console.log(`🗃️ Forcefully dropping table ${objectName}...`);
          // Try to drop constraints first
          await client.query(`ALTER TABLE IF EXISTS "${objectName}" DROP CONSTRAINT IF EXISTS "${objectName}_pkey" CASCADE;`);
          await client.query(`DROP TABLE IF EXISTS "${objectName}" CASCADE;`);
          console.log(`✅ Removed table ${objectName}`);
        } else {
          console.log(`ℹ️  ${objectName} not found (already removed)`);
        }
      } catch (error) {
        console.log(`❌ Error removing ${objectName}: ${error.message}`);
        
        // If it's spatial_ref_sys, try alternative removal methods
        if (objectName === 'spatial_ref_sys') {
          try {
            console.log('🔧 Trying alternative removal for spatial_ref_sys...');
            await client.query(`DELETE FROM spatial_ref_sys;`);
            await client.query(`DROP TABLE IF EXISTS spatial_ref_sys CASCADE;`);
            console.log('✅ Successfully cleared and removed spatial_ref_sys');
          } catch (altError) {
            console.log(`❌ Alternative removal failed: ${altError.message}`);
          }
        }
      }
    }

    // Step 5: Remove PostGIS extensions (if possible)
    console.log('\n=== CHECKING POSTGIS EXTENSIONS ===');
    const extensions = await client.query(`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname IN ('postgis', 'postgis_topology', 'postgis_raster');
    `);
    
    if (extensions.rows.length > 0) {
      console.log('🗺️ Found PostGIS extensions:');
      extensions.rows.forEach(ext => {
        console.log(`   ${ext.extname} v${ext.extversion}`);
      });
      
      console.log('⚠️  Note: PostGIS extensions cannot be safely removed via script');
      console.log('   These require superuser privileges and may affect other databases');
      console.log('   They will remain but their objects have been cleaned up');
    } else {
      console.log('✅ No PostGIS extensions found');
    }

    // Step 6: Remove spatial indexes and types
    console.log('\n=== REMOVING SPATIAL INDEXES AND TYPES ===');
    
    // Remove spatial indexes
    const spatialIndexes = await client.query(`
      SELECT 
        schemaname, 
        tablename, 
        indexname 
      FROM pg_indexes 
      WHERE 
        schemaname = 'public' AND (
          indexname ILIKE '%gist%' OR
          indexname ILIKE '%spatial%' OR
          indexname ILIKE '%geom%' OR
          indexname ILIKE '%geography%'
        );
    `);

    if (spatialIndexes.rows.length > 0) {
      console.log('🗂️ Found spatial indexes, removing...');
      for (const idx of spatialIndexes.rows) {
        try {
          await client.query(`DROP INDEX IF EXISTS "${idx.indexname}" CASCADE;`);
        } catch (error) {
          // Continue silently
        }
      }
      console.log(`✅ Processed ${spatialIndexes.rows.length} spatial indexes`);
    } else {
      console.log('✅ No spatial indexes found');
    }
    
    // Remove geometry and geography types
    console.log('\n🧬 Removing PostGIS data types...');
    const postgisTypes = ['geometry', 'geography', 'box2d', 'box3d'];
    
    for (const typeName of postgisTypes) {
      try {
        await client.query(`DROP TYPE IF EXISTS "${typeName}" CASCADE;`);
      } catch (error) {
        // Continue silently - some types may not exist or have dependencies
      }
    }
    console.log('✅ PostGIS data types removal attempted');

    // Step 7: Remove PostGIS functions/procedures aggressively
    console.log('\n=== REMOVING POSTGIS FUNCTIONS (AGGRESSIVE) ===');
    const spatialFunctions = await client.query(`
      SELECT 
        routine_name, 
        routine_type,
        specific_name
      FROM information_schema.routines 
      WHERE 
        routine_schema = 'public' AND (
          routine_name ILIKE '%geom%' OR
          routine_name ILIKE '%spatial%' OR
          routine_name ILIKE '%geography%' OR
          routine_name ILIKE 'st_%' OR
          routine_name ILIKE '%postgis%' OR
          routine_name ILIKE '%gist%' OR
          routine_name ILIKE '%populate%' OR
          routine_name ILIKE '%addgeometry%' OR
          routine_name ILIKE '%dropgeometry%' OR
          routine_name ILIKE '%updategeometry%'
        );
    `);

    if (spatialFunctions.rows.length > 0) {
      console.log(`🔧 Found ${spatialFunctions.rows.length} PostGIS functions, removing them...`);
      
      let removedCount = 0;
      for (const func of spatialFunctions.rows) {
        try {
          await client.query(`DROP FUNCTION IF EXISTS "${func.routine_name}" CASCADE;`);
          removedCount++;
          if (removedCount % 10 === 0) {
            console.log(`   Removed ${removedCount}/${spatialFunctions.rows.length} functions...`);
          }
        } catch (error) {
          // Silently continue - some functions may have dependencies
        }
      }
      console.log(`✅ Removed ${removedCount} PostGIS functions`);
    } else {
      console.log('✅ No PostGIS functions found');
    }

    // Step 8: Final verification
    console.log('\n=== FINAL VERIFICATION ===');
    const remainingGeometry = await client.query(`
      SELECT 
        table_name, 
        column_name, 
        data_type
      FROM information_schema.columns 
      WHERE 
        table_schema = 'public' AND (
          data_type = 'geometry' OR 
          data_type = 'geography' OR
          udt_name = 'geometry' OR
          udt_name = 'geography'
        );
    `);

    if (remainingGeometry.rows.length === 0) {
      console.log('✅ All geometry/geography columns successfully removed');
    } else {
      console.log('⚠️  Some geometry columns still remain:');
      remainingGeometry.rows.forEach(row => {
        console.log(`   ${row.table_name}.${row.column_name} (${row.data_type})`);
      });
    }

    // Step 9: Show final table summary
    console.log('\n=== FINAL DATABASE SUMMARY ===');
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log(`📊 Remaining tables: ${tables.rows.length}`);
    const tableInfo = [];
    for (const table of tables.rows) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM "${table.table_name}"`);
        const rowCount = parseInt(countResult.rows[0].count);
        tableInfo.push({ name: table.table_name, count: rowCount });
      } catch (error) {
        console.log(`⚠️  Could not check ${table.table_name}: ${error.message}`);
      }
    }

    tableInfo.sort((a, b) => b.count - a.count);
    console.log('\n📋 Final table inventory:');
    tableInfo.forEach((table, index) => {
      const status = table.count === 0 ? '❌ EMPTY' : `✅ ${table.count} rows`;
      console.log(`   ${index + 1}. ${table.name}: ${status}`);
    });

    const totalRecords = tableInfo.reduce((sum, table) => sum + table.count, 0);
    console.log(`\n📊 Total records across all tables: ${totalRecords}`);

    console.log('\n🎉 Geometry column removal completed!');

  } catch (error) {
    console.error('❌ Error during geometry column removal:', error);
  } finally {
    await client.end();
    console.log('\n🔒 Database connection closed.');
  }
}

removeGeometryColumns();
