-- Diagnostic script for audit_logs real-time issues
-- Run this in Supabase SQL Editor to check configuration

-- 1. Check if audit_logs table exists
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name = 'audit_logs';

-- 2. Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'audit_logs'
ORDER BY ordinal_position;

-- 3. Check if real-time is enabled for audit_logs
SELECT 
    schemaname,
    tablename,
    pubname
FROM pg_publication_tables 
WHERE tablename = 'audit_logs';

-- 4. Check RLS policies on audit_logs
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'audit_logs';

-- 5. Count existing audit log entries
SELECT COUNT(*) as total_audit_logs 
FROM audit_logs;

-- 6. Show sample audit log entry
SELECT 
    id,
    table_name,
    operation,
    changed_at,
    changed_by
FROM audit_logs 
ORDER BY changed_at DESC 
LIMIT 5;

-- 7. Check if real-time publication exists
SELECT pubname, puballtables 
FROM pg_publication 
WHERE pubname = 'supabase_realtime';

-- SOLUTIONS IF ISSUES FOUND:

-- If real-time not enabled, run:
-- ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;

-- If table doesn't exist, check if it was created:
-- Look for CREATE TABLE audit_logs statements in your migration files

-- If RLS is blocking, you may need to adjust policies:
-- The existing RLS policies should work for real-time subscriptions

SELECT '=== DIAGNOSTIC COMPLETE ===' as status;
