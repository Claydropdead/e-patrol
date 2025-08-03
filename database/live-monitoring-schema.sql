-- =============================================
-- PNP E-Patrol Live Monitoring Database Schema
-- =============================================
-- This schema creates the necessary tables for real-time personnel tracking
-- and live monitoring functionality in the MIMAROPA region

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. PERSONNEL LOCATIONS TABLE
-- =============================================
-- Stores real-time GPS location data from personnel devices
CREATE TABLE IF NOT EXISTS personnel_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    personnel_id UUID NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL, -- Precision for GPS coordinates
    longitude DECIMAL(11, 8) NOT NULL, -- Precision for GPS coordinates
    accuracy DECIMAL(8, 2), -- GPS accuracy in meters
    altitude DECIMAL(8, 2), -- Altitude in meters (optional)
    speed DECIMAL(6, 2), -- Speed in km/h (optional)
    heading DECIMAL(5, 2), -- Direction in degrees (optional)
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- When location was recorded
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries on personnel location history
CREATE INDEX IF NOT EXISTS idx_personnel_locations_personnel_id ON personnel_locations(personnel_id);
CREATE INDEX IF NOT EXISTS idx_personnel_locations_timestamp ON personnel_locations(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_personnel_locations_personnel_timestamp ON personnel_locations(personnel_id, timestamp DESC);

-- =============================================
-- 2. PERSONNEL STATUS HISTORY TABLE
-- =============================================
-- Tracks duty status changes (Alert, Standby, On Duty)
CREATE TABLE IF NOT EXISTS personnel_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    personnel_id UUID NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('alert', 'standby', 'on_duty', 'off_duty')),
    previous_status TEXT CHECK (previous_status IN ('alert', 'standby', 'on_duty', 'off_duty')),
    status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    changed_by UUID REFERENCES auth.users(id), -- Who made the change (admin or self)
    notes TEXT, -- Optional notes for status change
    location_lat DECIMAL(10, 8), -- Location when status changed
    location_lng DECIMAL(11, 8), -- Location when status changed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries on personnel status history
CREATE INDEX IF NOT EXISTS idx_personnel_status_history_personnel_id ON personnel_status_history(personnel_id);
CREATE INDEX IF NOT EXISTS idx_personnel_status_history_timestamp ON personnel_status_history(status_changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_personnel_status_history_current ON personnel_status_history(personnel_id, status_changed_at DESC);

-- =============================================
-- 3. PERSONNEL CURRENT STATUS VIEW
-- =============================================
-- View to get the most recent status for each personnel
CREATE OR REPLACE VIEW personnel_current_status AS
SELECT DISTINCT ON (personnel_id)
    personnel_id,
    status,
    status_changed_at,
    changed_by,
    notes,
    location_lat,
    location_lng
FROM personnel_status_history
ORDER BY personnel_id, status_changed_at DESC;

-- =============================================
-- 4. PERSONNEL CURRENT LOCATION VIEW
-- =============================================
-- View to get the most recent location for each personnel
CREATE OR REPLACE VIEW personnel_current_location AS
SELECT DISTINCT ON (personnel_id)
    personnel_id,
    latitude,
    longitude,
    accuracy,
    altitude,
    speed,
    heading,
    timestamp as last_update
FROM personnel_locations
ORDER BY personnel_id, timestamp DESC;

-- =============================================
-- 5. LIVE MONITORING VIEW
-- =============================================
-- Complete view combining personnel info, current status, and location
CREATE OR REPLACE VIEW live_monitoring AS
SELECT 
    p.id,
    p.full_name,
    p.rank,
    p.email,
    p.contact_number,
    p.province,
    p.unit,
    p.sub_unit,
    p.is_active,
    
    -- Current Status
    COALESCE(ps.status, 'off_duty') as status,
    ps.status_changed_at,
    ps.notes as status_notes,
    
    -- Current Location
    pl.latitude,
    pl.longitude,
    pl.accuracy,
    pl.last_update,
    
    -- Calculate time since last update
    EXTRACT(EPOCH FROM (NOW() - pl.last_update))/60 as minutes_since_update,
    
    -- Online status (considered online if location updated within 10 minutes)
    CASE 
        WHEN pl.last_update > NOW() - INTERVAL '10 minutes' THEN true 
        ELSE false 
    END as is_online
    
FROM personnel p
LEFT JOIN personnel_current_status ps ON p.id = ps.personnel_id
LEFT JOIN personnel_current_location pl ON p.id = pl.personnel_id
WHERE p.is_active = true
ORDER BY p.full_name;

-- =============================================
-- 6. TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to personnel_locations
CREATE TRIGGER update_personnel_locations_updated_at
    BEFORE UPDATE ON personnel_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE personnel_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel_status_history ENABLE ROW LEVEL SECURITY;

-- Personnel can insert their own location data
CREATE POLICY "Personnel can insert own location" ON personnel_locations
    FOR INSERT TO authenticated
    WITH CHECK (
        personnel_id = auth.uid()
    );

-- Personnel can update their own status
CREATE POLICY "Personnel can update own status" ON personnel_status_history
    FOR INSERT TO authenticated
    WITH CHECK (
        personnel_id = auth.uid()
    );

-- Superadmin can read all location data
CREATE POLICY "Superadmin can read all locations" ON personnel_locations
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_accounts 
            WHERE id = auth.uid() 
            AND role = 'superadmin'
        )
    );

-- Regional admin can read locations in their region
CREATE POLICY "Regional admin can read regional locations" ON personnel_locations
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_accounts a
            JOIN personnel p ON personnel_locations.personnel_id = p.id
            WHERE a.id = auth.uid() 
            AND a.role = 'regional'
        )
    );

-- Provincial admin can read locations in their province
CREATE POLICY "Provincial admin can read provincial locations" ON personnel_locations
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_accounts a
            JOIN personnel p ON personnel_locations.personnel_id = p.id
            WHERE a.id = auth.uid() 
            AND a.role = 'provincial'
            AND a.assigned_province = p.province
        )
    );

-- Station admin can read locations in their unit
CREATE POLICY "Station admin can read station locations" ON personnel_locations
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_accounts a
            JOIN personnel p ON personnel_locations.personnel_id = p.id
            WHERE a.id = auth.uid() 
            AND a.role = 'station'
            AND a.assigned_unit = p.unit
            AND a.assigned_sub_unit = p.sub_unit
        )
    );

-- Similar policies for personnel_status_history table
CREATE POLICY "Superadmin can read all status" ON personnel_status_history
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_accounts 
            WHERE id = auth.uid() 
            AND role = 'superadmin'
        )
    );

CREATE POLICY "Regional admin can read regional status" ON personnel_status_history
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_accounts a
            JOIN personnel p ON personnel_status_history.personnel_id = p.id
            WHERE a.id = auth.uid() 
            AND a.role = 'regional'
        )
    );

CREATE POLICY "Provincial admin can read provincial status" ON personnel_status_history
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_accounts a
            JOIN personnel p ON personnel_status_history.personnel_id = p.id
            WHERE a.id = auth.uid() 
            AND a.role = 'provincial'
            AND a.assigned_province = p.province
        )
    );

CREATE POLICY "Station admin can read station status" ON personnel_status_history
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_accounts a
            JOIN personnel p ON personnel_status_history.personnel_id = p.id
            WHERE a.id = auth.uid() 
            AND a.role = 'station'
            AND a.assigned_unit = p.unit
            AND a.assigned_sub_unit = p.sub_unit
        )
    );

-- =============================================
-- 8. REAL-TIME SUBSCRIPTIONS
-- =============================================
-- Enable real-time for live monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE personnel_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE personnel_status_history;

-- =============================================
-- 9. SAMPLE DATA FOR TESTING
-- =============================================
-- Insert sample location data for testing (optional)
-- This will be removed in production

-- Note: Replace these with actual personnel IDs from your personnel table
-- INSERT INTO personnel_locations (personnel_id, latitude, longitude, accuracy) 
-- VALUES 
--     ('your-personnel-id-1', 13.4102, 121.1827, 10.0),
--     ('your-personnel-id-2', 9.7392, 118.7353, 15.0);

-- INSERT INTO personnel_status_history (personnel_id, status, notes)
-- VALUES 
--     ('your-personnel-id-1', 'alert', 'Responding to emergency call'),
--     ('your-personnel-id-2', 'on_duty', 'Regular patrol');

-- =============================================
-- 10. USEFUL FUNCTIONS
-- =============================================

-- Function to get personnel within a radius (for geofencing)
CREATE OR REPLACE FUNCTION get_personnel_within_radius(
    center_lat DECIMAL,
    center_lng DECIMAL,
    radius_km DECIMAL
)
RETURNS TABLE(
    personnel_id UUID,
    full_name TEXT,
    distance_km DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lm.id,
        lm.full_name,
        (
            6371 * acos(
                cos(radians(center_lat)) * 
                cos(radians(lm.latitude)) * 
                cos(radians(lm.longitude) - radians(center_lng)) + 
                sin(radians(center_lat)) * 
                sin(radians(lm.latitude))
            )
        )::DECIMAL as distance_km
    FROM live_monitoring lm
    WHERE lm.latitude IS NOT NULL 
    AND lm.longitude IS NOT NULL
    AND lm.is_online = true
    AND (
        6371 * acos(
            cos(radians(center_lat)) * 
            cos(radians(lm.latitude)) * 
            cos(radians(lm.longitude) - radians(center_lng)) + 
            sin(radians(center_lat)) * 
            sin(radians(lm.latitude))
        )
    ) <= radius_km
    ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SCHEMA CREATION COMPLETE
-- =============================================
-- Run this script in your Supabase SQL editor
-- Make sure to enable real-time in your Supabase dashboard for:
-- - personnel_locations table
-- - personnel_status_history table
-- =============================================
