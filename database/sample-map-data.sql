-- =============================================
-- SAMPLE MAP DATA FOR TESTING
-- =============================================
-- Run this after deploying live-monitoring-schema.sql
-- This adds sample location and status data to test the map

-- IMPORTANT: Replace these UUIDs with actual personnel IDs from your personnel table
-- You can find them by running: SELECT id, full_name FROM personnel LIMIT 10;

-- Sample personnel IDs (REPLACE WITH YOUR ACTUAL PERSONNEL IDs)
-- Example:
-- INSERT INTO personnel_locations (personnel_id, latitude, longitude, accuracy) VALUES
-- ('your-actual-personnel-id-1', 13.4117, 121.1803, 10.0),  -- Calapan, Oriental Mindoro
-- ('your-actual-personnel-id-2', 9.7392, 118.7353, 15.0),   -- El Nido, Palawan
-- ('your-actual-personnel-id-3', 13.2186, 120.5947, 12.0),  -- Mamburao, Occidental Mindoro
-- ('your-actual-personnel-id-4', 12.5778, 122.2681, 8.0),   -- Romblon, Romblon
-- ('your-actual-personnel-id-5', 13.4548, 121.8431, 11.0);  -- Boac, Marinduque

-- Sample status data
-- INSERT INTO personnel_status_history (personnel_id, status, notes) VALUES
-- ('your-actual-personnel-id-1', 'alert', 'Emergency response in Calapan area'),
-- ('your-actual-personnel-id-2', 'on_duty', 'Regular patrol in El Nido'),
-- ('your-actual-personnel-id-3', 'standby', 'On standby at Mamburao station'),
-- ('your-actual-personnel-id-4', 'on_duty', 'Harbor patrol in Romblon'),
-- ('your-actual-personnel-id-5', 'alert', 'Traffic incident response');

-- =============================================
-- HOW TO USE THIS FILE:
-- =============================================
-- 1. First, run: SELECT id, full_name, unit, sub_unit FROM personnel LIMIT 10;
-- 2. Copy the actual UUIDs from your personnel table
-- 3. Replace the 'your-actual-personnel-id-X' placeholders above
-- 4. Uncomment the INSERT statements
-- 5. Run this script in Supabase SQL Editor
-- 6. Check the live map - you should see markers for your personnel!

-- =============================================
-- COORDINATES REFERENCE FOR MIMAROPA:
-- =============================================
-- Oriental Mindoro:
-- - Calapan: 13.4117, 121.1803
-- - Baco: 12.9617, 121.3144
-- - Puerto Galera: 13.5000, 120.9500

-- Occidental Mindoro:
-- - Mamburao: 13.2186, 120.5947
-- - San Jose: 12.3528, 121.0686
-- - Lubang: 13.8556, 120.1333

-- Palawan:
-- - Puerto Princesa: 9.7392, 118.7353
-- - El Nido: 11.1949, 119.4094
-- - Coron: 12.0033, 120.2069

-- Romblon:
-- - Romblon: 12.5778, 122.2681
-- - Odiongan: 12.4042, 122.1925
-- - Santa Fe: 12.1667, 122.0333

-- Marinduque:
-- - Boac: 13.4548, 121.8431
-- - Gasan: 13.3200, 121.8500
-- - Torrijos: 13.3167, 122.0833

-- =============================================
-- TESTING COMMANDS:
-- =============================================
-- View live monitoring data:
-- SELECT * FROM live_monitoring WHERE latitude IS NOT NULL;

-- Check recent locations:
-- SELECT p.full_name, pl.latitude, pl.longitude, pl.timestamp 
-- FROM personnel_locations pl 
-- JOIN personnel p ON pl.personnel_id = p.id 
-- ORDER BY pl.timestamp DESC;

-- Check current status:
-- SELECT p.full_name, ps.status, ps.status_changed_at 
-- FROM personnel_status_history ps 
-- JOIN personnel p ON ps.personnel_id = p.id 
-- ORDER BY ps.status_changed_at DESC;
