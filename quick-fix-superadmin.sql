-- QUICK FIX: Create your superadmin profile
-- Run this in Supabase SQL Editor AFTER running secure-database-fix.sql

-- Step 1: First, run the main security script
-- Copy and paste the entire secure-database-fix.sql content and run it

-- Step 2: Then run this to create your superadmin profile
-- REPLACE 'your-email@domain.com' with your actual email address

INSERT INTO admin_accounts (
  id,
  email, 
  full_name,
  role,
  is_active,
  created_at,
  assigned_province,
  assigned_unit, 
  assigned_sub_unit
) 
SELECT 
  au.id,
  au.email,
  'System Administrator',
  'superadmin',
  true,
  NOW(),
  NULL,
  NULL,
  NULL
FROM auth.users au 
WHERE au.email = 'your-email@domain.com'  -- CHANGE THIS TO YOUR EMAIL
AND NOT EXISTS (
  SELECT 1 FROM admin_accounts aa WHERE aa.id = au.id
);

-- Step 3: Verify your profile was created
SELECT 'Your admin profile:' as status;
SELECT id, email, full_name, role, is_active, created_at 
FROM admin_accounts 
WHERE email = 'your-email@domain.com';  -- CHANGE THIS TO YOUR EMAIL

-- Step 4: Check all users without profiles (security check)
SELECT 'Users without profiles (should be empty after fix):' as security_check;
SELECT 
  au.id,
  au.email,
  au.created_at,
  'NO PROFILE - SECURITY RISK' as status
FROM auth.users au
LEFT JOIN admin_accounts aa ON au.id = aa.id
LEFT JOIN personnel p ON au.id = p.id
WHERE aa.id IS NULL AND p.id IS NULL;
