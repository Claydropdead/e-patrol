-- CREATE YOUR SUPERADMIN PROFILE
-- Run this in Supabase SQL Editor

-- First, let's see what we have
SELECT 'Current state check:' as info;
SELECT 'Auth users:' as type, id, email FROM auth.users;
SELECT 'Admin accounts:' as type, id, email, role, is_active FROM admin_accounts;

-- Create admin profile for pinedapatrickjun123@gmail.com (assuming this is you)
INSERT INTO admin_accounts (
  id,
  email,
  full_name,
  rank,
  role,
  is_active,
  created_at,
  assigned_province,
  assigned_unit,
  assigned_sub_unit
) 
VALUES (
  '1ddc0df1-b8b6-4a65-bee2-57ac74ae7762',  -- Your user ID from auth.users
  'pinedapatrickjun123@gmail.com',          -- Your email
  'Patrick Jun Pineda',                     -- Your name
  'Police Director',                        -- Rank for superadmin
  'superadmin',                             -- Role
  true,                                     -- Active
  NOW(),                                    -- Created now
  NULL,                                     -- Superadmin has access to all
  NULL,
  NULL
) ON CONFLICT (id) DO UPDATE SET
  role = 'superadmin',
  is_active = true,
  full_name = 'Patrick Jun Pineda',
  rank = 'Police Director';

-- Verify the admin profile was created
SELECT 'Your new admin profile:' as result;
SELECT id, email, full_name, role, is_active, created_at 
FROM admin_accounts 
WHERE email = 'pinedapatrickjun123@gmail.com';

-- Clean up the test user if it exists
DELETE FROM admin_accounts WHERE email = 'asd@email.com';

-- Final verification
SELECT 'Final check - All admin accounts:' as final_check;
SELECT id, email, full_name, role, is_active FROM admin_accounts;
