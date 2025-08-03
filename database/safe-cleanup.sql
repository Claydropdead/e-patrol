-- =============================================
-- SAFE DATABASE CLEANUP - IMMEDIATE ACTIONS
-- =============================================
-- This script contains only SAFE operations that won't break the application

-- =============================================
-- 1. ANALYZE CURRENT DATABASE STATE
-- =============================================

-- Check which tables actually exist and their sizes
SELECT 
    t.table_name,
    CASE 
        WHEN t.table_name IN ('admin_accounts', 'personnel', 'audit_logs') THEN '✅ CORE TABLE - DO NOT REMOVE'
        WHEN t.table_name LIKE '%view%' OR t.table_name LIKE '%_current_%' OR t.table_name = 'live_monitoring' THEN '📊 VIEW/DERIVED - KEEP'
        WHEN t.table_name LIKE 'geofence%' THEN '❓ GEOFENCING - OPTIONAL'
        WHEN t.table_name LIKE 'personnel_locations%' OR t.table_name LIKE 'personnel_status%' THEN '📍 TRACKING DATA - KEEP'
        ELSE '❓ UNKNOWN'
    END as status,
    t.table_type
FROM information_schema.tables t
WHERE t.table_schema = 'public'
ORDER BY 
    CASE 
        WHEN t.table_name IN ('admin_accounts', 'personnel', 'audit_logs') THEN 1
        WHEN t.table_name LIKE '%view%' OR t.table_name LIKE '%_current_%' THEN 2  
        WHEN t.table_name LIKE 'personnel_%' THEN 3
        WHEN t.table_name LIKE 'geofence%' THEN 4
        ELSE 5
    END,
    t.table_name;

-- =============================================
-- 2. CHECK ROW COUNTS FOR POTENTIALLY REDUNDANT TABLES
-- =============================================

-- Check if geofencing tables have any data
DO $$
BEGIN
    -- Check geofence_beats
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'geofence_beats' AND table_schema = 'public') THEN
        PERFORM pg_sleep(0.1);
        RAISE NOTICE 'geofence_beats exists - checking row count...';
        EXECUTE 'SELECT COUNT(*) FROM geofence_beats' INTO @row_count;
        RAISE NOTICE 'geofence_beats has % rows', @row_count;
    END IF;
    
    -- Check geofence_beat_assignments  
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'geofence_beat_assignments' AND table_schema = 'public') THEN
        RAISE NOTICE 'geofence_beat_assignments exists - this table tracks personnel beat assignments';
    END IF;
    
    -- Check geofence_violations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'geofence_violations' AND table_schema = 'public') THEN
        RAISE NOTICE 'geofence_violations exists - this table tracks boundary violations';
    END IF;
END $$;

-- =============================================
-- 3. SAFE DATA CLEANUP (OLD RECORDS ONLY)
-- =============================================

-- Clean up very old audit logs (older than 1 year) - SAFE
DELETE FROM audit_logs 
WHERE changed_at < NOW() - INTERVAL '1 year';

-- Show how many rows were affected
SELECT 'audit_logs cleanup' as operation, 
       COUNT(*) as remaining_rows,
       MIN(changed_at) as oldest_record,
       MAX(changed_at) as newest_record
FROM audit_logs;

-- Clean up very old location data (older than 6 months) - SAFE IF TABLE EXISTS
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'personnel_locations' AND table_schema = 'public') THEN
        DELETE FROM personnel_locations 
        WHERE timestamp < NOW() - INTERVAL '6 months';
        
        RAISE NOTICE 'Cleaned up old personnel_locations data';
    END IF;
END $$;

-- =============================================
-- 4. REMOVE TRULY REDUNDANT OBJECTS
-- =============================================

-- Remove the security_events view since we're using audit_logs directly
DROP VIEW IF EXISTS security_events CASCADE;

-- =============================================
-- 5. OPTIMIZE DATABASE PERFORMANCE
-- =============================================

-- Update table statistics
ANALYZE;

-- Show final database state
SELECT 
    'DATABASE CLEANUP COMPLETED' as status,
    NOW() as completed_at;

-- Show remaining table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
AND pg_total_relation_size(schemaname||'.'||tablename) > 0
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =============================================
-- NEXT STEPS RECOMMENDATIONS
-- =============================================

/*
IMMEDIATE ACTIONS COMPLETED:
✅ Removed security_events view (redundant with audit_logs)
✅ Cleaned up old audit logs (>1 year)
✅ Cleaned up old location data (>6 months)
✅ Updated database statistics

OPTIONAL ACTIONS (MANUAL DECISION NEEDED):
1. Review geofencing tables - if geofencing feature is not being used:
   - geofence_beats
   - geofence_beat_assignments  
   - geofence_violations

2. Consider data retention policies:
   - audit_logs: Currently keeping 1 year
   - personnel_locations: Currently keeping 6 months
   - personnel_status_history: No cleanup applied (all kept)

TO REMOVE GEOFENCING TABLES (IF NOT NEEDED):
Run these commands ONLY if you're sure geofencing is not needed:

DROP TABLE IF EXISTS geofence_violations CASCADE;
DROP TABLE IF EXISTS geofence_beat_assignments CASCADE;
DROP TABLE IF EXISTS geofence_beats CASCADE;
*/
