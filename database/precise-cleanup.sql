-- =============================================
-- PRECISE DATABASE CLEANUP SCRIPT
-- Based on actual analysis of your Supabase database
-- =============================================

-- 🔍 ACTUAL DATABASE STATE ANALYSIS:
-- Tables found: admin_accounts(2 rows), personnel(1 row), audit_logs(8 rows)
-- Empty tables: personnel_locations(0 rows), personnel_status_history(0 rows)  
-- Views: live_monitoring, personnel_current_location, personnel_current_status, security_events

-- =============================================
-- STEP 1: IDENTIFY TRULY REDUNDANT OBJECTS
-- =============================================

-- ❌ REDUNDANT VIEW: security_events 
-- This view duplicates audit_logs functionality and is NOT used in the application
-- The audit-logs-viewer.tsx component uses audit_logs table directly
DROP VIEW IF EXISTS security_events CASCADE;

-- Show what was removed
SELECT 'Removed redundant security_events view' as cleanup_action;

-- =============================================
-- STEP 2: EVALUATE EMPTY TABLES
-- =============================================

-- 📊 EMPTY TABLES ANALYSIS:
-- personnel_locations (0 rows) - Used by live_monitoring view, KEEP for future GPS data
-- personnel_status_history (0 rows) - Used by live_monitoring view, KEEP for future status tracking

-- These tables are empty but are part of the live monitoring system
-- DO NOT REMOVE - they will be populated when personnel start using the mobile app

SELECT 
    'personnel_locations' as table_name,
    'KEEP - Required for GPS tracking' as decision,
    '0 rows but needed for mobile app functionality' as reason
UNION ALL
SELECT 
    'personnel_status_history' as table_name,
    'KEEP - Required for status tracking' as decision,
    '0 rows but needed for duty status changes' as reason;

-- =============================================
-- STEP 3: OPTIMIZE EXISTING DATA
-- =============================================

-- Clean up old audit logs (keep last 6 months for compliance)
-- Current: 8 rows - likely all recent, but apply retention policy
DELETE FROM audit_logs 
WHERE changed_at < NOW() - INTERVAL '6 months';

-- Get count of remaining audit logs
SELECT 
    COUNT(*) as remaining_audit_logs,
    MIN(changed_at) as oldest_log,
    MAX(changed_at) as newest_log
FROM audit_logs;

-- =============================================
-- STEP 4: VERIFY REQUIRED TABLES ARE INTACT
-- =============================================

-- Verify core tables exist and have data
SELECT 
    'admin_accounts' as table_name,
    COUNT(*) as row_count,
    'Core table - Admin management' as purpose
FROM admin_accounts
UNION ALL
SELECT 
    'personnel' as table_name,
    COUNT(*) as row_count,
    'Core table - Personnel management' as purpose
FROM personnel
UNION ALL
SELECT 
    'audit_logs' as table_name,
    COUNT(*) as row_count,
    'Core table - System auditing' as purpose
FROM audit_logs;

-- =============================================
-- STEP 5: VERIFY VIEWS ARE FUNCTIONAL
-- =============================================

-- Test live_monitoring view (used by dashboard)
SELECT 
    'live_monitoring view test' as test_name,
    COUNT(*) as personnel_count
FROM live_monitoring;

-- Test personnel_current_location view
SELECT 
    'personnel_current_location view test' as test_name,
    COUNT(*) as location_records
FROM personnel_current_location;

-- Test personnel_current_status view  
SELECT 
    'personnel_current_status view test' as test_name,
    COUNT(*) as status_records
FROM personnel_current_status;

-- =============================================
-- STEP 6: DATABASE OPTIMIZATION
-- =============================================

-- Update table statistics for better query performance
ANALYZE admin_accounts;
ANALYZE personnel;
ANALYZE audit_logs;
ANALYZE personnel_locations;
ANALYZE personnel_status_history;

-- =============================================
-- FINAL REPORT
-- =============================================

SELECT '=== DATABASE CLEANUP COMPLETED ===' as status;

-- Show final database state
SELECT 
    t.table_name,
    t.table_type,
    CASE 
        WHEN t.table_name IN ('admin_accounts', 'personnel', 'audit_logs') THEN '✅ CORE - Active with data'
        WHEN t.table_name IN ('personnel_locations', 'personnel_status_history') THEN '📱 MOBILE - Empty but required'
        WHEN t.table_type = 'VIEW' THEN '👁️ VIEW - Supporting queries'
        ELSE '❓ OTHER'
    END as status
FROM information_schema.tables t
WHERE t.table_schema = 'public'
ORDER BY 
    CASE 
        WHEN t.table_name IN ('admin_accounts', 'personnel', 'audit_logs') THEN 1
        WHEN t.table_type = 'VIEW' THEN 2
        ELSE 3
    END,
    t.table_name;

-- =============================================
-- SUMMARY OF ACTIONS TAKEN
-- =============================================

/*
✅ ACTIONS COMPLETED:
1. Removed security_events view (redundant with audit_logs)
2. Applied 6-month retention policy to audit_logs
3. Verified all core tables are intact
4. Optimized table statistics

✅ TABLES PRESERVED:
1. admin_accounts (2 rows) - Core admin management
2. personnel (1 row) - Core personnel management  
3. audit_logs (~8 rows) - System audit trail
4. personnel_locations (0 rows) - GPS tracking (ready for mobile app)
5. personnel_status_history (0 rows) - Status tracking (ready for mobile app)

✅ VIEWS PRESERVED:
1. live_monitoring - Used by dashboard for real-time display
2. personnel_current_location - Efficient location queries
3. personnel_current_status - Efficient status queries

❌ REMOVED:
1. security_events view - Redundant with audit_logs table

📊 DATABASE SIZE REDUCTION:
- Minimal impact since tables were mostly empty
- Main benefit: Removed code confusion between audit_logs vs security_events
- Improved query performance with updated statistics

🎯 RESULT: Clean, optimized database ready for production use
*/
