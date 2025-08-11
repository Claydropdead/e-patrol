const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:311212345@db.xgsffeuluxsmgrhnrusl.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function checkForeignKeys() {
  try {
    await client.connect();
    console.log('Connected to database...');
    
    const query = `
      SELECT 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name='personnel_replacement_history';
    `;
    
    const result = await client.query(query);
    console.log('Foreign keys for personnel_replacement_history:');
    console.table(result.rows);
    
    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkForeignKeys();
