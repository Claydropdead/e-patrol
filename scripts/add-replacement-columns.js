const { Client } = require('pg');

async function addReplacementHistoryColumns() {
  const client = new Client({
    connectionString: 'postgresql://postgres:311212345@db.xgsffeuluxsmgrhnrusl.supabase.co:5432/postgres'
  });
  
  try {
    await client.connect();
    console.log('🚀 ADDING REPLACEMENT HISTORY COLUMNS');
    console.log('====================================\n');
    
    // Check if columns already exist
    console.log('🔍 Checking existing columns...');
    const existingCols = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'beat_personnel'
    `);
    
    const existingColumnNames = existingCols.rows.map(row => row.column_name);
    console.log('Existing columns:', existingColumnNames);
    
    // Add replacement tracking columns
    const columnsToAdd = [
      {
        name: 'replaced_by',
        definition: 'UUID REFERENCES admin_accounts(id)',
        description: 'Admin who made the replacement'
      },
      {
        name: 'replacement_reason',
        definition: 'TEXT',
        description: 'Reason for replacement'
      },
      {
        name: 'replaced_at',
        definition: 'TIMESTAMP WITH TIME ZONE',
        description: 'When replacement happened'
      },
      {
        name: 'is_replacement',
        definition: 'BOOLEAN DEFAULT FALSE',
        description: 'Whether this is a replacement assignment'
      },
      {
        name: 'original_assignment_id',
        definition: 'UUID REFERENCES beat_personnel(id)',
        description: 'Reference to original assignment'
      }
    ];
    
    for (const column of columnsToAdd) {
      if (!existingColumnNames.includes(column.name)) {
        console.log(`➕ Adding column: ${column.name} - ${column.description}`);
        await client.query(`
          ALTER TABLE beat_personnel 
          ADD COLUMN ${column.name} ${column.definition};
        `);
        console.log(`   ✅ Added ${column.name}`);
      } else {
        console.log(`   ⚠️  Column ${column.name} already exists, skipping`);
      }
    }
    
    // Verify the new structure
    console.log('\n🔍 UPDATED TABLE STRUCTURE:');
    const updatedCols = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'beat_personnel' 
      ORDER BY ordinal_position;
    `);
    
    updatedCols.rows.forEach(row => {
      const isNew = !existingColumnNames.includes(row.column_name);
      const marker = isNew ? '🆕' : '  ';
      console.log(`${marker} ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    console.log('\n✅ REPLACEMENT HISTORY COLUMNS ADDED SUCCESSFULLY!');
    console.log('\nNow you can track:');
    console.log('- Who made personnel replacements');
    console.log('- When replacements occurred');
    console.log('- Why replacements were made');
    console.log('- Link between original and replacement assignments');
    
  } catch (error) {
    console.error('❌ Error adding replacement columns:', error.message);
  } finally {
    await client.end();
  }
}

addReplacementHistoryColumns();
