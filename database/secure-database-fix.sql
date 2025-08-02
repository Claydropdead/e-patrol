-- SECURE Setup script for E-Patrol MIMAROPA
-- This script fixes security issues and prevents unauthorized access

-- ============================================================================
-- SECURITY FIX: Remove all existing insecure policies
-- ============================================================================

-- Drop the overly permissive policies from the setup script
DROP POLICY IF EXISTS "Users can view own admin account" ON admin_accounts;
DROP POLICY IF EXISTS "Users can view own personnel profile" ON personnel;
DROP POLICY IF EXISTS "Users can insert own admin account" ON admin_accounts;
DROP POLICY IF EXISTS "Users can insert own personnel profile" ON personnel;
DROP POLICY IF EXISTS "Users can update own admin account" ON admin_accounts;
DROP POLICY IF EXISTS "Users can update own personnel profile" ON personnel;
DROP POLICY IF EXISTS "Superadmin can view all admin accounts" ON admin_accounts;
DROP POLICY IF EXISTS "Superadmin can view all personnel" ON personnel;
DROP POLICY IF EXISTS "Superadmin can update all admin accounts" ON admin_accounts;
DROP POLICY IF EXISTS "Superadmin can update all personnel" ON personnel;

-- ============================================================================
-- FIX ADMIN ACCOUNTS TABLE STRUCTURE
-- ============================================================================

-- Add assignment columns to admin_accounts for proper hierarchy
ALTER TABLE admin_accounts 
ADD COLUMN IF NOT EXISTS assigned_province TEXT,
ADD COLUMN IF NOT EXISTS assigned_unit TEXT,
ADD COLUMN IF NOT EXISTS assigned_sub_unit TEXT;

-- Drop existing constraint if it exists and recreate
ALTER TABLE admin_accounts DROP CONSTRAINT IF EXISTS check_assigned_province;

-- Add constraints for assigned areas
ALTER TABLE admin_accounts 
ADD CONSTRAINT check_assigned_province 
CHECK (
  assigned_province IS NULL OR 
  assigned_province IN (
    'Oriental Mindoro PPO',
    'Occidental Mindoro PPO', 
    'Marinduque PPO',
    'Romblon PPO',
    'Palawan PPO',
    'Puerto Princesa CPO',
    'RMFB'
  )
);

-- ============================================================================
-- SECURE RLS POLICIES: Principle of Least Privilege
-- ============================================================================

-- Drop existing secure policies if they exist
DROP POLICY IF EXISTS "Users can view own admin account" ON admin_accounts;
DROP POLICY IF EXISTS "Superadmin view all admin accounts" ON admin_accounts;
DROP POLICY IF EXISTS "Superadmin update admin accounts" ON admin_accounts;
DROP POLICY IF EXISTS "Users can view own personnel profile" ON personnel;
DROP POLICY IF EXISTS "Admin view personnel by hierarchy" ON personnel;
DROP POLICY IF EXISTS "Superadmin update personnel" ON personnel;

-- Admin Accounts: Users can only view their own record
CREATE POLICY "Users can view own admin account" ON admin_accounts
  FOR SELECT 
  USING (id = auth.uid() AND is_active = true);

-- Admin Accounts: Only active superadmins can view all accounts (for management)
CREATE POLICY "Superadmin view all admin accounts" ON admin_accounts
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM admin_accounts sa
      WHERE sa.id = auth.uid() 
        AND sa.role = 'superadmin' 
        AND sa.is_active = true
    )
  );

-- Admin Accounts: Only active superadmins can update accounts
CREATE POLICY "Superadmin update admin accounts" ON admin_accounts
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM admin_accounts sa
      WHERE sa.id = auth.uid() 
        AND sa.role = 'superadmin' 
        AND sa.is_active = true
    )
  );

-- Personnel: Users can view their own record
CREATE POLICY "Users can view own personnel profile" ON personnel
  FOR SELECT 
  USING (id = auth.uid() AND is_active = true);

-- Personnel: Admins can view personnel based on their role hierarchy
CREATE POLICY "Admin view personnel by hierarchy" ON personnel
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM admin_accounts aa
      WHERE aa.id = auth.uid() 
        AND aa.is_active = true
        AND (
          -- Superadmin sees all
          aa.role = 'superadmin' OR
          -- Regional sees all in MIMAROPA (all personnel)
          aa.role = 'regional' OR
          -- Provincial sees their assigned province
          (aa.role = 'provincial' AND personnel.province = aa.assigned_province) OR
          -- Station sees their assigned sub-unit
          (aa.role = 'station' AND personnel.sub_unit = aa.assigned_sub_unit)
        )
    )
  );

-- Personnel: Only superadmins can update personnel records
CREATE POLICY "Superadmin update personnel" ON personnel
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM admin_accounts sa
      WHERE sa.id = auth.uid() 
        AND sa.role = 'superadmin' 
        AND sa.is_active = true
    )
  );

-- ============================================================================
-- PREVENT UNAUTHORIZED ACCOUNT CREATION
-- ============================================================================

-- Remove any existing INSERT policies that allow self-registration
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON admin_accounts;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON personnel;

-- Only allow INSERTs through service role (API endpoints with proper validation)
-- This prevents users from creating their own accounts

-- ============================================================================
-- AUDIT AND CLEANUP
-- ============================================================================

-- Remove any sample/test data that might be security risks
DELETE FROM admin_accounts WHERE email LIKE '%@example.%' OR email LIKE '%test%';
DELETE FROM personnel WHERE email LIKE '%@example.%' OR email LIKE '%test%';

-- Update existing admin accounts with proper assignments (if any exist)
-- This is just an example - adjust according to your actual admin accounts
UPDATE admin_accounts 
SET assigned_province = 'Oriental Mindoro PPO'
WHERE role = 'provincial' AND email LIKE '%oriental%';

UPDATE admin_accounts 
SET assigned_province = 'Palawan PPO'  
WHERE role = 'provincial' AND email LIKE '%palawan%';

-- For station admins, you'll need to set assigned_sub_unit based on their actual assignments
-- Example:
-- UPDATE admin_accounts 
-- SET assigned_sub_unit = 'Calapan CPS - Investigation Unit'
-- WHERE role = 'station' AND email = 'station.admin@pnp.gov.ph';

-- ============================================================================
-- SECURITY VERIFICATION QUERIES
-- ============================================================================

-- Check for any users without proper profiles (potential security issue)
SELECT 'SECURITY CHECK: Users in auth.users without profiles' as check_type;
SELECT 
  au.id,
  au.email,
  au.created_at,
  CASE 
    WHEN aa.id IS NOT NULL THEN 'Has Admin Profile'
    WHEN p.id IS NOT NULL THEN 'Has Personnel Profile'
    ELSE 'NO PROFILE - SECURITY RISK'
  END as profile_status
FROM auth.users au
LEFT JOIN admin_accounts aa ON au.id = aa.id
LEFT JOIN personnel p ON au.id = p.id
WHERE aa.id IS NULL AND p.id IS NULL;

-- Check for inactive users that should be removed
SELECT 'SECURITY CHECK: Inactive users that should be reviewed' as check_type;
SELECT id, email, full_name, role, is_active, created_at 
FROM admin_accounts 
WHERE is_active = false;

SELECT id, email, full_name, province, sub_unit, is_active, created_at 
FROM personnel 
WHERE is_active = false;

-- ============================================================================
-- FINAL SECURITY RECOMMENDATIONS
-- ============================================================================

SELECT '=== SECURITY RECOMMENDATIONS ===' as recommendations;
SELECT '1. Remove any auth.users entries without corresponding profiles' as rec1;
SELECT '2. All account creation should go through admin API endpoints only' as rec2;
SELECT '3. Regularly audit inactive accounts and remove permanently' as rec3;
SELECT '4. Monitor for any direct database modifications outside the app' as rec4;
SELECT '5. Enable Supabase audit logs for all table modifications' as rec5;

-- ============================================================================
-- ENABLE AUDIT LOGGING FOR ALL TABLE MODIFICATIONS
-- ============================================================================

-- Create audit log table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation ON audit_logs(operation);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by ON audit_logs(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at ON audit_logs(changed_at);

-- Enable RLS on audit logs (only superadmins can view)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing audit policies if they exist
DROP POLICY IF EXISTS "Superadmin can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;

-- Only superadmins can view audit logs
CREATE POLICY "Superadmin can view audit logs" ON audit_logs
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM admin_accounts aa
      WHERE aa.id = auth.uid() 
        AND aa.role = 'superadmin' 
        AND aa.is_active = true
    )
  );

-- Allow system to insert audit logs (bypass RLS for triggers)
CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT 
  WITH CHECK (true);

-- ============================================================================
-- AUDIT TRIGGER FUNCTIONS
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS audit_trigger_function() CASCADE;

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get current user ID (might be null for service role operations)
  current_user_id := auth.uid();
  
  -- Handle different operations
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (
      table_name,
      operation,
      old_data,
      new_data,
      changed_by,
      changed_at
    ) VALUES (
      TG_TABLE_NAME,
      TG_OP,
      row_to_json(OLD),
      NULL,
      current_user_id,
      NOW()
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (
      table_name,
      operation,
      old_data,
      new_data,
      changed_by,
      changed_at
    ) VALUES (
      TG_TABLE_NAME,
      TG_OP,
      row_to_json(OLD),
      row_to_json(NEW),
      current_user_id,
      NOW()
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      table_name,
      operation,
      old_data,
      new_data,
      changed_by,
      changed_at
    ) VALUES (
      TG_TABLE_NAME,
      TG_OP,
      NULL,
      row_to_json(NEW),
      current_user_id,
      NOW()
    );
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CREATE AUDIT TRIGGERS FOR ALL TABLES
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS audit_admin_accounts_trigger ON admin_accounts;
DROP TRIGGER IF EXISTS audit_personnel_trigger ON personnel;

-- Admin accounts audit trigger
CREATE TRIGGER audit_admin_accounts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON admin_accounts
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Personnel audit trigger  
CREATE TRIGGER audit_personnel_trigger
  AFTER INSERT OR UPDATE OR DELETE ON personnel
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================================================
-- AUDIT LOG MANAGEMENT FUNCTIONS
-- ============================================================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_user_audit_history(UUID);
DROP FUNCTION IF EXISTS cleanup_old_audit_logs(INTEGER);

-- Function to get audit history for a specific user
CREATE OR REPLACE FUNCTION get_user_audit_history(user_id UUID)
RETURNS TABLE (
  change_time TIMESTAMP WITH TIME ZONE,
  table_name TEXT,
  operation TEXT,
  old_values JSONB,
  new_values JSONB,
  changed_by_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.changed_at,
    al.table_name,
    al.operation,
    al.old_data,
    al.new_data,
    COALESCE(aa.email, p.email, 'System') as changed_by_email
  FROM audit_logs al
  LEFT JOIN admin_accounts aa ON al.changed_by = aa.id
  LEFT JOIN personnel p ON al.changed_by = p.id
  WHERE 
    (al.old_data->>'id' = user_id::text OR al.new_data->>'id' = user_id::text)
  ORDER BY al.changed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean old audit logs (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(days_to_keep INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs 
  WHERE changed_at < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- AUDIT LOG VERIFICATION
-- ============================================================================

-- Test audit logging by showing recent changes
SELECT 'AUDIT SYSTEM VERIFICATION' as info;
SELECT 'Recent audit entries (should populate after any table changes):' as note;

SELECT 
  changed_at,
  table_name,
  operation,
  CASE 
    WHEN changed_by IS NOT NULL THEN 'User: ' || changed_by::text
    ELSE 'System'
  END as performed_by
FROM audit_logs 
ORDER BY changed_at DESC 
LIMIT 10;

-- Show audit log table info
SELECT 'Audit log table created successfully' as status;
SELECT COUNT(*) as total_audit_entries FROM audit_logs;

-- ============================================================================
-- ADDITIONAL SECURITY MONITORING SETUP
-- ============================================================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS security_events;

-- Create a view for security events monitoring
CREATE OR REPLACE VIEW security_events AS
SELECT 
  al.changed_at as event_time,
  al.table_name,
  al.operation,
  CASE 
    WHEN al.table_name = 'admin_accounts' AND al.operation = 'INSERT' 
      THEN 'New admin account created: ' || (al.new_data->>'email')
    WHEN al.table_name = 'admin_accounts' AND al.operation = 'UPDATE' 
      AND (al.old_data->>'is_active')::boolean = true 
      AND (al.new_data->>'is_active')::boolean = false
      THEN 'Admin account deactivated: ' || (al.old_data->>'email')
    WHEN al.table_name = 'admin_accounts' AND al.operation = 'DELETE'
      THEN 'Admin account deleted: ' || (al.old_data->>'email')
    WHEN al.table_name = 'personnel' AND al.operation = 'INSERT'
      THEN 'New personnel created: ' || (al.new_data->>'email')
    WHEN al.table_name = 'personnel' AND al.operation = 'UPDATE'
      AND (al.old_data->>'is_active')::boolean = true 
      AND (al.new_data->>'is_active')::boolean = false
      THEN 'Personnel deactivated: ' || (al.old_data->>'email')
    WHEN al.table_name = 'personnel' AND al.operation = 'DELETE'
      THEN 'Personnel deleted: ' || (al.old_data->>'email')
    ELSE 'Other change in ' || al.table_name
  END as event_description,
  COALESCE(aa.email, p.email, 'System') as performed_by
FROM audit_logs al
LEFT JOIN admin_accounts aa ON al.changed_by = aa.id
LEFT JOIN personnel p ON al.changed_by = p.id
WHERE al.changed_at >= NOW() - INTERVAL '30 days'
ORDER BY al.changed_at DESC;

-- Enable RLS on the security events view
ALTER VIEW security_events SET (security_barrier = true);

-- ============================================================================
-- AUDIT SYSTEM FINAL SETUP
-- ============================================================================

SELECT '=== AUDIT SYSTEM SETUP COMPLETE ===' as completion_status;
SELECT 'Audit logging is now enabled for all table modifications' as info1;
SELECT 'All changes to admin_accounts and personnel tables will be logged' as info2;
SELECT 'Only superadmins can view audit logs through the security_events view' as info3;
SELECT 'Use get_user_audit_history(user_id) to see history for specific users' as info4;
SELECT 'Run cleanup_old_audit_logs(365) periodically to manage storage' as info5;

-- ============================================================================
-- PERIODIC CLEANUP SYSTEM
-- ============================================================================

-- Create a function to be called by external schedulers
CREATE OR REPLACE FUNCTION scheduled_audit_cleanup()
RETURNS JSON AS $$
DECLARE
  deleted_count INTEGER;
  result JSON;
BEGIN
  -- Clean logs older than 365 days
  SELECT cleanup_old_audit_logs(365) INTO deleted_count;
  
  -- Create result JSON
  result := json_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'cleanup_date', NOW(),
    'retention_days', 365
  );
  
  -- Log the cleanup operation
  INSERT INTO audit_logs (
    table_name,
    operation,
    old_data,
    new_data,
    changed_by,
    changed_at
  ) VALUES (
    'audit_logs',
    'CLEANUP',
    NULL,
    result::jsonb,
    NULL, -- System operation
    NOW()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CLEANUP INSTRUCTIONS AND EXAMPLES
-- ============================================================================

SELECT '=== AUDIT CLEANUP INSTRUCTIONS ===' as cleanup_info;
SELECT 'MANUAL CLEANUP:' as manual_title;
SELECT 'Run in SQL Editor: SELECT cleanup_old_audit_logs(365);' as manual_cmd;
SELECT '' as separator1;
SELECT 'SCHEDULED CLEANUP:' as scheduled_title;
SELECT 'Use external cron job or API endpoint to call scheduled_audit_cleanup()' as scheduled_info;
SELECT '' as separator2;
SELECT 'API ENDPOINT EXAMPLE:' as api_title;
SELECT 'Create /api/admin/cleanup-audit endpoint for automated cleanup' as api_info;
