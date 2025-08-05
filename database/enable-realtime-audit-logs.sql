-- Enable real-time for audit_logs table
-- Run this in your Supabase SQL Editor

-- 1. Enable real-time for audit_logs table
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;

-- 2. Check if real-time is enabled (should return audit_logs in the list)
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- 3. Verify RLS policies allow real-time subscriptions
-- Real-time subscriptions use the same RLS policies as regular queries

-- 4. Check current RLS policies on audit_logs
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

-- 5. If you need to enable real-time for the entire database (alternative approach)
-- This is more permissive but simpler
-- ALTER PUBLICATION supabase_realtime ADD TABLE ALL IN SCHEMA public;

-- 6. Check if the audit_logs table exists and has the correct structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'audit_logs' 
ORDER BY ordinal_position;

SELECT '=== INSTRUCTIONS ===' as notice;
SELECT 'Run the ALTER PUBLICATION command above in Supabase SQL Editor' as step1;
SELECT 'Check the results of the SELECT queries to verify setup' as step2;
SELECT 'If audit_logs appears in pg_publication_tables, real-time is enabled' as step3;
SELECT 'Real-time subscriptions will use the same RLS policies as regular queries' as step4;
