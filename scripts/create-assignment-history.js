const { Client } = require('pg')

async function createAssignmentHistoryTable() {
  const client = new Client({
    connectionString: 'postgresql://postgres:311212345@db.xgsffeuluxsmgrhnrusl.supabase.co:5432/postgres'
  })
  
  try {
    await client.connect()
    console.log('✅ Connected to database')
    
    console.log('🔧 Creating personnel assignment history table...')
    
    // Read and execute the SQL file
    const fs = require('fs')
    const path = require('path')
    const sqlFile = path.join(__dirname, '..', 'database', 'personnel-assignment-history.sql')
    const sql = fs.readFileSync(sqlFile, 'utf8')
    
    await client.query(sql)
    console.log('✅ Personnel assignment history table created successfully')
    
    // Verify the table was created
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'personnel_assignment_history' 
      AND table_schema = 'public'
    `)
    
    if (result.rows.length > 0) {
      console.log('✅ Table verification successful')
    } else {
      console.log('❌ Table creation failed')
    }
    
  } catch (error) {
    console.error('❌ Error creating assignment history table:', error)
  } finally {
    await client.end()
  }
}

createAssignmentHistoryTable()
