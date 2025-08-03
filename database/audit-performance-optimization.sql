-- Audit Logs Performance Optimization
-- Add indexes for faster query performance on the audit_logs table

-- Note: Basic indexes already exist, this adds additional optimization indexes

-- Composite index for common filter combinations (table + operation + time)
CREATE INDEX IF NOT EXISTS idx_audit_logs_composite_filter 
ON audit_logs (table_name, operation, changed_at DESC);

-- Index for user-specific audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_activity 
ON audit_logs (changed_by, changed_at DESC);

-- Index for recent activity queries (covering index with operation)
CREATE INDEX IF NOT EXISTS idx_audit_logs_recent_activity 
ON audit_logs (changed_at DESC) 
WHERE changed_at >= NOW() - INTERVAL '30 days';

-- Optimize the audit_logs table for better performance
ANALYZE audit_logs;

-- Create a materialized view for audit statistics (optional - for very large datasets)
-- This pre-calculates statistics to avoid expensive COUNT queries
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_stats AS
SELECT 
  COUNT(*) as total_events,
  COUNT(CASE WHEN changed_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as recent_events,
  table_name,
  COUNT(*) as table_count
FROM audit_logs 
GROUP BY table_name;

-- Create index on the materialized view
CREATE INDEX IF NOT EXISTS idx_audit_stats_table ON audit_stats (table_name);

-- Refresh the materialized view (run this periodically via a cron job)
-- REFRESH MATERIALIZED VIEW audit_stats;

-- Performance notes:
-- 1. Composite index covers the most common filter combination (table + operation + time)
-- 2. User activity index optimized for user-specific audit queries
-- 3. Partial index on recent activity reduces index size and improves performance
-- 4. ANALYZE updates table statistics for better query planning
-- 5. Materialized view pre-calculates expensive aggregate queries
-- 6. Basic indexes (table_name, operation, changed_by, changed_at) already exist from schema
