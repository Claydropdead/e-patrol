1/**
 * Database Check and Setup Script for PNP E-Patrol Live Monitoring
 * This script connects to Supabase, checks existing tables, and sets up live monitoring
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Database connection details
const DB_URL = 'postgresql://postgres:311212345@db.xgsffeuluxsmgrhnrusl.supabase.co:5432/postgres';
const SUPABASE_URL = 'https://xgsffeuluxsmgrhnrusl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnc2ZmZXVsdXhzbWdyaG5ydXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNTAwNzgsImV4cCI6MjA2OTYyNjA3OH0.LNvza1QMMMGBSDZw12ExqMNP4MnKXFenio4_xZBn4bM';

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function checkTables() {
  logSection('🔍 CHECKING EXISTING TABLES');
  
  try {
    // Get list of tables by trying to query each expected table
    const expectedTables = [
      'personnel', 'users', 'auth.users', 'assignment_history',
      'personnel_locations', 'personnel_status_history'
    ];
    
    const existingTables = [];
    
    for (const tableName of expectedTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          existingTables.push(tableName);
          log(`✅ ${tableName} - exists`, 'green');
        } else {
          log(`❌ ${tableName} - does not exist`, 'red');
        }
      } catch (err) {
        log(`❌ ${tableName} - error: ${err.message}`, 'red');
      }
    }
    
    log(`\n📊 Found ${existingTables.length} tables`, 'blue');
    return existingTables;
  } catch (error) {
    log(`❌ Database connection error: ${error.message}`, 'red');
    return [];
  }
}

async function checkViews() {
  logSection('👁️ CHECKING EXISTING VIEWS');
  
  try {
    const expectedViews = [
      'personnel_current_status',
      'personnel_current_location', 
      'live_monitoring'
    ];
    
    const existingViews = [];
    
    for (const viewName of expectedViews) {
      try {
        const { data, error } = await supabase
          .from(viewName)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          existingViews.push(viewName);
          log(`✅ ${viewName} - exists`, 'green');
        } else {
          log(`❌ ${viewName} - does not exist`, 'red');
        }
      } catch (err) {
        log(`❌ ${viewName} - error: ${err.message}`, 'red');
      }
    }
    
    log(`\n👁️ Found ${existingViews.length} views`, 'blue');
    return existingViews;
  } catch (error) {
    log(`❌ Error checking views: ${error.message}`, 'red');
    return [];
  }
}

async function checkPersonnelTable() {
  logSection('👮 CHECKING PERSONNEL TABLE STRUCTURE');
  
  try {
    // Try to query personnel table to see if it exists
    const { data: sampleData, error } = await supabase
      .from('personnel')
      .select('*')
      .limit(1);

    if (error) {
      log(`❌ Personnel table does not exist: ${error.message}`, 'red');
      return false;
    }

    log('✅ Personnel table exists!', 'green');
    
    if (sampleData && sampleData.length > 0) {
      log('📋 Sample personnel record structure:', 'blue');
      const sample = sampleData[0];
      Object.keys(sample).forEach(key => {
        log(`  • ${key}: ${typeof sample[key]}`, 'yellow');
      });
    }

    // Check for personnel count
    const { data: allPersonnel, error: countError } = await supabase
      .from('personnel')
      .select('id, full_name, rank')
      .limit(10);

    if (!countError && allPersonnel) {
      log(`📊 Personnel records: ${allPersonnel.length}`, 'blue');
      if (allPersonnel.length > 0) {
        log('👥 Sample personnel:', 'blue');
        allPersonnel.slice(0, 5).forEach((person, index) => {
          log(`  ${index + 1}. ${person.full_name} (${person.rank})`, 'yellow');
        });
      }
    }

    return true;
  } catch (error) {
    log(`❌ Error checking personnel table: ${error.message}`, 'red');
    return false;
  }
}

async function checkLiveMonitoringTables() {
  logSection('📡 CHECKING LIVE MONITORING TABLES');
  
  const requiredTables = [
    'personnel_locations',
    'personnel_status_history'
  ];

  const requiredViews = [
    'personnel_current_status',
    'personnel_current_location', 
    'live_monitoring'
  ];

  let allTablesExist = true;
  let allViewsExist = true;

  // Check tables
  for (const table of requiredTables) {
    const { data, error } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true });

    if (error) {
      log(`❌ Table '${table}' does not exist`, 'red');
      allTablesExist = false;
    } else {
      log(`✅ Table '${table}' exists`, 'green');
    }
  }

  // Check views
  for (const view of requiredViews) {
    const { data, error } = await supabase
      .from(view)
      .select('*', { count: 'exact', head: true });

    if (error) {
      log(`❌ View '${view}' does not exist`, 'red');
      allViewsExist = false;
    } else {
      log(`✅ View '${view}' exists`, 'green');
    }
  }

  return { allTablesExist, allViewsExist };
}

async function runSetupScript() {
  logSection('🚀 RUNNING LIVE MONITORING SETUP');
  
  try {
    // Read the setup SQL file
    const setupSqlPath = path.join(__dirname, '..', 'database', 'setup-live-monitoring.sql');
    
    if (!fs.existsSync(setupSqlPath)) {
      log(`❌ Setup file not found: ${setupSqlPath}`, 'red');
      return false;
    }

    const setupSql = fs.readFileSync(setupSqlPath, 'utf8');
    log('📖 Setup SQL file loaded successfully', 'green');
    
    // Split SQL into individual statements
    const statements = setupSql
      .split(/;\s*\n/)
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    log(`📝 Found ${statements.length} SQL statements to execute`, 'blue');

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip empty statements and comments
      if (!statement || statement.startsWith('--')) continue;
      
      try {
        log(`⚡ Executing statement ${i + 1}/${statements.length}...`, 'yellow');
        
        // Use rpc to execute raw SQL
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        });

        if (error) {
          // Try alternative method for executing SQL
          const { error: directError } = await supabase
            .from('__direct_sql__')
            .select(statement);
            
          if (directError) {
            log(`⚠️ Statement ${i + 1} warning: ${error.message}`, 'yellow');
          }
        } else {
          log(`✅ Statement ${i + 1} executed successfully`, 'green');
        }
      } catch (err) {
        log(`⚠️ Statement ${i + 1} error: ${err.message}`, 'yellow');
      }
    }

    log('🎉 Setup script execution completed!', 'green');
    return true;
  } catch (error) {
    log(`❌ Error running setup script: ${error.message}`, 'red');
    return false;
  }
}

async function testLiveMonitoringView() {
  logSection('🧪 TESTING LIVE MONITORING VIEW');
  
  try {
    const { data, error } = await supabase
      .from('live_monitoring')
      .select('*')
      .limit(5);

    if (error) {
      log(`❌ Error testing live_monitoring view: ${error.message}`, 'red');
      return false;
    }

    log(`✅ Live monitoring view works! Found ${data?.length || 0} records`, 'green');
    
    if (data && data.length > 0) {
      log('📊 Sample data:', 'blue');
      data.forEach((record, index) => {
        log(`  ${index + 1}. ${record.full_name} (${record.rank}) - Status: ${record.status}`, 'yellow');
      });
    }

    return true;
  } catch (error) {
    log(`❌ Error testing view: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  log('🚀 PNP E-Patrol Database Setup Script', 'bright');
  log('Connecting to Supabase database...', 'blue');

  try {
    // Step 1: Check existing tables
    const tables = await checkTables();
    
    // Step 2: Check views
    const views = await checkViews();
    
    // Step 3: Check personnel table specifically
    const personnelExists = await checkPersonnelTable();
    
    if (!personnelExists) {
      log('\n❌ Personnel table is required for live monitoring. Please set up your personnel table first.', 'red');
      process.exit(1);
    }
    
    // Step 4: Check live monitoring tables and views
    const { allTablesExist, allViewsExist } = await checkLiveMonitoringTables();
    
    // Step 5: Run setup if needed
    if (!allTablesExist || !allViewsExist) {
      log('\n🔧 Live monitoring setup needed. Running setup script...', 'yellow');
      
      // Display manual setup instructions instead of automatic execution
      logSection('📋 MANUAL SETUP INSTRUCTIONS');
      log('Since automatic SQL execution may have limitations, please:', 'yellow');
      log('1. Open your Supabase SQL Editor', 'blue');
      log('2. Copy and paste the contents of: database/setup-live-monitoring.sql', 'blue');
      log('3. Execute the SQL script manually', 'blue');
      log('4. Run this script again to verify the setup', 'blue');
      
      const setupSqlPath = path.join(__dirname, '..', 'database', 'setup-live-monitoring.sql');
      log(`\n📁 Setup file location: ${setupSqlPath}`, 'cyan');
      
    } else {
      log('\n✅ All live monitoring tables and views exist!', 'green');
      
      // Step 6: Test the live monitoring view
      await testLiveMonitoringView();
    }
    
    logSection('📋 SUMMARY');
    log(`✅ Database connection: Working`, 'green');
    log(`✅ Personnel table: ${personnelExists ? 'Present' : 'Missing'}`, personnelExists ? 'green' : 'red');
    log(`✅ Live monitoring tables: ${allTablesExist ? 'Present' : 'Missing'}`, allTablesExist ? 'green' : 'red');
    log(`✅ Live monitoring views: ${allViewsExist ? 'Present' : 'Missing'}`, allViewsExist ? 'green' : 'red');
    
    if (allTablesExist && allViewsExist) {
      log('\n🎉 Your database is ready for live monitoring!', 'green');
      log('You can now use the Live Monitoring page in your application.', 'blue');
    } else {
      log('\n⚠️ Database setup required. Follow the manual setup instructions above.', 'yellow');
    }
    
  } catch (error) {
    log(`❌ Script error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { main };
