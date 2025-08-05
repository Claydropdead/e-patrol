const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:311212345@db.xgsffeuluxsmgrhnrusl.supabase.co:5432/postgres'
});

async function restoreUserManagementTables() {
  try {
    console.log('👥 Starting user management tables restoration...\n');
    await client.connect();

    // Create personnel table for user management
    console.log('=== CREATING PERSONNEL TABLE ===');
    await client.query(`
      CREATE TABLE IF NOT EXISTS personnel (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        rank VARCHAR(50) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        contact_number VARCHAR(20),
        province VARCHAR(100),
        unit VARCHAR(255),
        sub_unit VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by UUID REFERENCES admin_accounts(id)
      );
    `);
    console.log('✅ Personnel table created');

    // Create personnel assignment history table
    console.log('\n=== CREATING PERSONNEL ASSIGNMENT HISTORY TABLE ===');
    await client.query(`
      CREATE TABLE IF NOT EXISTS personnel_assignment_history (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        personnel_id UUID NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
        previous_unit VARCHAR(255),
        previous_sub_unit VARCHAR(255),
        previous_province VARCHAR(100),
        new_unit VARCHAR(255),
        new_sub_unit VARCHAR(255),
        new_province VARCHAR(100),
        changed_by UUID REFERENCES admin_accounts(id),
        changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        reason TEXT
      );
    `);
    console.log('✅ Personnel assignment history table created');

    // Create indexes for better performance
    console.log('\n=== CREATING INDEXES ===');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_personnel_email ON personnel(email);
      CREATE INDEX IF NOT EXISTS idx_personnel_province ON personnel(province);
      CREATE INDEX IF NOT EXISTS idx_personnel_unit ON personnel(unit);
      CREATE INDEX IF NOT EXISTS idx_personnel_active ON personnel(is_active);
      CREATE INDEX IF NOT EXISTS idx_assignment_history_personnel ON personnel_assignment_history(personnel_id);
      CREATE INDEX IF NOT EXISTS idx_assignment_history_date ON personnel_assignment_history(changed_at);
    `);
    console.log('✅ Indexes created');

    // Enable RLS (Row Level Security)
    console.log('\n=== ENABLING ROW LEVEL SECURITY ===');
    await client.query(`
      ALTER TABLE personnel ENABLE ROW LEVEL SECURITY;
      ALTER TABLE personnel_assignment_history ENABLE ROW LEVEL SECURITY;
    `);
    console.log('✅ RLS enabled');

    // Create RLS policies for personnel table
    console.log('\n=== CREATING RLS POLICIES ===');
    
    // Drop existing policies if they exist
    await client.query(`
      DROP POLICY IF EXISTS "personnel_select_policy" ON personnel;
      DROP POLICY IF EXISTS "personnel_insert_policy" ON personnel;
      DROP POLICY IF EXISTS "personnel_update_policy" ON personnel;
      DROP POLICY IF EXISTS "personnel_delete_policy" ON personnel;
    `);

    // Personnel table policies
    await client.query(`
      CREATE POLICY "personnel_select_policy" ON personnel
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM admin_accounts 
            WHERE admin_accounts.id = auth.uid() 
            AND admin_accounts.is_active = true
          )
        );
    `);

    await client.query(`
      CREATE POLICY "personnel_insert_policy" ON personnel
        FOR INSERT WITH CHECK (
          EXISTS (
            SELECT 1 FROM admin_accounts 
            WHERE admin_accounts.id = auth.uid() 
            AND admin_accounts.role = 'superadmin' 
            AND admin_accounts.is_active = true
          )
        );
    `);

    await client.query(`
      CREATE POLICY "personnel_update_policy" ON personnel
        FOR UPDATE USING (
          EXISTS (
            SELECT 1 FROM admin_accounts 
            WHERE admin_accounts.id = auth.uid() 
            AND admin_accounts.role = 'superadmin' 
            AND admin_accounts.is_active = true
          )
        );
    `);

    await client.query(`
      CREATE POLICY "personnel_delete_policy" ON personnel
        FOR DELETE USING (
          EXISTS (
            SELECT 1 FROM admin_accounts 
            WHERE admin_accounts.id = auth.uid() 
            AND admin_accounts.role = 'superadmin' 
            AND admin_accounts.is_active = true
          )
        );
    `);

    // Assignment history policies
    await client.query(`
      DROP POLICY IF EXISTS "assignment_history_select_policy" ON personnel_assignment_history;
      DROP POLICY IF EXISTS "assignment_history_insert_policy" ON personnel_assignment_history;
    `);

    await client.query(`
      CREATE POLICY "assignment_history_select_policy" ON personnel_assignment_history
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM admin_accounts 
            WHERE admin_accounts.id = auth.uid() 
            AND admin_accounts.is_active = true
          )
        );
    `);

    await client.query(`
      CREATE POLICY "assignment_history_insert_policy" ON personnel_assignment_history
        FOR INSERT WITH CHECK (
          EXISTS (
            SELECT 1 FROM admin_accounts 
            WHERE admin_accounts.id = auth.uid() 
            AND admin_accounts.role = 'superadmin' 
            AND admin_accounts.is_active = true
          )
        );
    `);

    console.log('✅ RLS policies created');

    // Add sample personnel data
    console.log('\n=== ADDING SAMPLE PERSONNEL DATA ===');
    
    // First get the superadmin ID
    const adminResult = await client.query(`
      SELECT id FROM admin_accounts WHERE role = 'superadmin' LIMIT 1;
    `);
    
    if (adminResult.rows.length > 0) {
      const superadminId = adminResult.rows[0].id;
      
      const samplePersonnel = [
        {
          rank: 'Police Officer I',
          full_name: 'Juan dela Cruz',
          email: 'juan.delacruz@pnp.gov.ph',
          contact_number: '+639123456789',
          province: 'Oriental Mindoro',
          unit: 'Oriental Mindoro PPO',
          sub_unit: 'Calapan City PS'
        },
        {
          rank: 'Police Officer II',
          full_name: 'Maria Santos',
          email: 'maria.santos@pnp.gov.ph',
          contact_number: '+639234567890',
          province: 'Palawan',
          unit: 'Palawan PPO',
          sub_unit: 'Puerto Princesa PS'
        },
        {
          rank: 'Police Senior Master Sergeant',
          full_name: 'Carlos Rodriguez',
          email: 'carlos.rodriguez@pnp.gov.ph',
          contact_number: '+639345678901',
          province: 'Romblon',
          unit: 'Romblon PPO',
          sub_unit: 'Romblon Municipal PS'
        }
      ];

      for (const personnel of samplePersonnel) {
        await client.query(`
          INSERT INTO personnel (rank, full_name, email, contact_number, province, unit, sub_unit, created_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (email) DO NOTHING;
        `, [
          personnel.rank,
          personnel.full_name,
          personnel.email,
          personnel.contact_number,
          personnel.province,
          personnel.unit,
          personnel.sub_unit,
          superadminId
        ]);
      }
      
      console.log('✅ Sample personnel data added');
    } else {
      console.log('⚠️  No superadmin found, skipping sample data');
    }

    // Verify tables were created
    console.log('\n=== VERIFICATION ===');
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('personnel', 'personnel_assignment_history')
      ORDER BY table_name;
    `);

    console.log('📋 User management tables created:');
    for (const table of tablesResult.rows) {
      const countResult = await client.query(`SELECT COUNT(*) as count FROM "${table.table_name}"`);
      const rowCount = parseInt(countResult.rows[0].count);
      console.log(`   ✅ ${table.table_name}: ${rowCount} rows`);
    }

    console.log('\n🎉 User management tables restoration completed successfully!');

  } catch (error) {
    console.error('❌ Restoration failed:', error);
  } finally {
    await client.end();
    console.log('\n🔒 Database connection closed.');
  }
}

restoreUserManagementTables();
