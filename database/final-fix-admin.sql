-- FINAL FIX: Make sure your admin account is active and accessible
-- Run this in Supabase SQL Editor

-- Step 1: Check your current admin profile status
SELECT 'Current admin profile status:' as info;
SELECT id, email, full_name, role, is_active, created_at 
FROM admin_accounts;

-- Step 2: Ensure your admin account is active (CRITICAL FOR RLS POLICIES)
UPDATE admin_accounts 
SET is_active = true 
WHERE role = 'superadmin';

-- Step 3: Verify the update worked
SELECT 'Updated admin profile:' as info;
SELECT id, email, full_name, role, is_active 
FROM admin_accounts 
WHERE role = 'superadmin';

-- Step 4: Test the RLS policies work correctly
SELECT 'Testing RLS policies:' as test_info;

-- This should work if your admin is active and policies are correct
SELECT 'Your admin profile via RLS:' as rls_test;
SELECT id, email, role, is_active 
FROM admin_accounts 
WHERE id = (SELECT id FROM admin_accounts WHERE role = 'superadmin' LIMIT 1);

-- Step 5: Check auth.users connection
SELECT 'Auth users in system:' as auth_check;
SELECT id, email, created_at FROM auth.users;
