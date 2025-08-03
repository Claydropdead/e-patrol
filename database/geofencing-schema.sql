-- Geofencing Database Schema for PNP E-Patrol MIMAROPA
-- This schema supports patrol beat management and geofencing violations

-- Enable PostGIS extension for geographic calculations
CREATE EXTENSION IF NOT EXISTS postgis;

-- Table for storing geofenced patrol beats
CREATE TABLE geofence_beats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Geographic data
    center_lat DECIMAL(10, 8) NOT NULL,
    center_lng DECIMAL(11, 8) NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 500,
    geometry GEOMETRY(Polygon, 4326), -- PostGIS geometry for precise calculations
    
    -- Administrative hierarchy
    province VARCHAR(100) NOT NULL,
    unit VARCHAR(100) NOT NULL,
    sub_unit VARCHAR(100),
    
    -- Beat status and metadata
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    priority_level INTEGER DEFAULT 1 CHECK (priority_level BETWEEN 1 AND 5),
    
    -- Audit fields
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_coordinates CHECK (
        center_lat BETWEEN -90 AND 90 AND 
        center_lng BETWEEN -180 AND 180
    ),
    CONSTRAINT valid_radius CHECK (radius_meters BETWEEN 50 AND 5000)
);

-- Table for assigning personnel to beats
CREATE TABLE geofence_beat_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    beat_id UUID NOT NULL REFERENCES geofence_beats(id) ON DELETE CASCADE,
    personnel_id UUID NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
    
    -- Assignment details
    assigned_by UUID NOT NULL REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    
    -- Assignment status
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    notes TEXT,
    
    -- Prevent duplicate active assignments
    UNIQUE(beat_id, personnel_id, status) DEFERRABLE INITIALLY DEFERRED
);

-- Table for tracking geofence violations
CREATE TABLE geofence_violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    beat_id UUID NOT NULL REFERENCES geofence_beats(id),
    personnel_id UUID NOT NULL REFERENCES personnel(id),
    
    -- Violation details
    violation_type VARCHAR(50) NOT NULL CHECK (violation_type IN ('exit', 'enter', 'unauthorized', 'timeout')),
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Location data at time of violation
    location_lat DECIMAL(10, 8) NOT NULL,
    location_lng DECIMAL(11, 8) NOT NULL,
    distance_from_center DECIMAL(10, 2), -- in meters
    
    -- Violation status and resolution
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'resolved', 'ignored')),
    severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    -- Resolution details
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    -- Auto-acknowledgment for certain types
    auto_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledgment_deadline TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for geofence settings and configurations
CREATE TABLE geofence_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    beat_id UUID NOT NULL REFERENCES geofence_beats(id) ON DELETE CASCADE,
    
    -- Timing settings
    check_interval_seconds INTEGER DEFAULT 60, -- How often to check location
    grace_period_minutes INTEGER DEFAULT 5, -- Grace period before violation
    auto_resolve_hours INTEGER DEFAULT 24, -- Auto-resolve violations after hours
    
    -- Notification settings
    notify_on_exit BOOLEAN DEFAULT TRUE,
    notify_on_enter BOOLEAN DEFAULT FALSE,
    notify_on_timeout BOOLEAN DEFAULT TRUE,
    escalation_minutes INTEGER DEFAULT 30, -- Escalate unresolved violations
    
    -- Alert thresholds
    max_violations_per_day INTEGER DEFAULT 10,
    max_distance_variance_meters INTEGER DEFAULT 100,
    
    -- Configuration metadata
    configured_by UUID NOT NULL REFERENCES auth.users(id),
    configured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(beat_id)
);

-- Table for real-time location tracking within beats
CREATE TABLE geofence_location_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    personnel_id UUID NOT NULL REFERENCES personnel(id),
    beat_id UUID REFERENCES geofence_beats(id),
    
    -- Location data
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    accuracy_meters DECIMAL(6, 2),
    altitude_meters DECIMAL(8, 2),
    
    -- Status within geofence
    is_within_beat BOOLEAN NOT NULL DEFAULT FALSE,
    distance_from_center DECIMAL(10, 2), -- in meters
    
    -- Device and app info
    device_id VARCHAR(255),
    app_version VARCHAR(50),
    battery_level INTEGER CHECK (battery_level BETWEEN 0 AND 100),
    
    -- Timing
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Index for performance
    INDEX idx_location_logs_personnel_time (personnel_id, recorded_at),
    INDEX idx_location_logs_beat_time (beat_id, recorded_at)
);

-- Indexes for better performance
CREATE INDEX idx_geofence_beats_status ON geofence_beats(status);
CREATE INDEX idx_geofence_beats_province ON geofence_beats(province);
CREATE INDEX idx_geofence_beats_geometry ON geofence_beats USING GIST(geometry);

CREATE INDEX idx_beat_assignments_beat ON geofence_beat_assignments(beat_id);
CREATE INDEX idx_beat_assignments_personnel ON geofence_beat_assignments(personnel_id);
CREATE INDEX idx_beat_assignments_active ON geofence_beat_assignments(status) WHERE status = 'active';

CREATE INDEX idx_violations_beat ON geofence_violations(beat_id);
CREATE INDEX idx_violations_personnel ON geofence_violations(personnel_id);
CREATE INDEX idx_violations_status ON geofence_violations(status);
CREATE INDEX idx_violations_time ON geofence_violations(occurred_at);
CREATE INDEX idx_violations_pending ON geofence_violations(status, occurred_at) WHERE status = 'pending';

-- Functions for geofence calculations

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance_meters(
    lat1 DECIMAL(10,8), 
    lng1 DECIMAL(11,8), 
    lat2 DECIMAL(10,8), 
    lng2 DECIMAL(11,8)
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    r DECIMAL := 6371000; -- Earth's radius in meters
    dlat DECIMAL;
    dlng DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    dlat := RADIANS(lat2 - lat1);
    dlng := RADIANS(lng2 - lng1);
    
    a := SIN(dlat/2) * SIN(dlat/2) + 
         COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * 
         SIN(dlng/2) * SIN(dlng/2);
    
    c := 2 * ATAN2(SQRT(a), SQRT(1-a));
    
    RETURN r * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if a point is within a geofence beat
CREATE OR REPLACE FUNCTION is_within_geofence(
    check_lat DECIMAL(10,8),
    check_lng DECIMAL(11,8),
    beat_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    beat_record RECORD;
    distance_meters DECIMAL(10,2);
BEGIN
    -- Get beat information
    SELECT center_lat, center_lng, radius_meters 
    INTO beat_record 
    FROM geofence_beats 
    WHERE id = beat_id_param AND status = 'active';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Calculate distance from center
    distance_meters := calculate_distance_meters(
        check_lat, check_lng,
        beat_record.center_lat, beat_record.center_lng
    );
    
    -- Check if within radius
    RETURN distance_meters <= beat_record.radius_meters;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to automatically generate geometry from center point and radius
CREATE OR REPLACE FUNCTION generate_beat_geometry()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate a circular polygon approximation
    NEW.geometry := ST_Buffer(
        ST_SetSRID(ST_MakePoint(NEW.center_lng, NEW.center_lat), 4326)::geography,
        NEW.radius_meters
    )::geometry;
    
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate geometry
CREATE TRIGGER trigger_generate_beat_geometry
    BEFORE INSERT OR UPDATE ON geofence_beats
    FOR EACH ROW
    EXECUTE FUNCTION generate_beat_geometry();

-- Function to detect geofence violations
CREATE OR REPLACE FUNCTION check_geofence_violation(
    personnel_id_param UUID,
    current_lat DECIMAL(10,8),
    current_lng DECIMAL(11,8),
    timestamp_param TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE(violation_detected BOOLEAN, violation_type VARCHAR(50), beat_id UUID) AS $$
DECLARE
    assigned_beat RECORD;
    is_inside BOOLEAN;
    last_location RECORD;
    was_inside BOOLEAN;
BEGIN
    -- Get active beat assignment for personnel
    SELECT gb.id, gb.center_lat, gb.center_lng, gb.radius_meters, gb.name
    INTO assigned_beat
    FROM geofence_beats gb
    JOIN geofence_beat_assignments gba ON gb.id = gba.beat_id
    WHERE gba.personnel_id = personnel_id_param 
    AND gba.status = 'active'
    AND gb.status = 'active'
    AND (gba.valid_until IS NULL OR gba.valid_until > timestamp_param)
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::VARCHAR(50), NULL::UUID;
        RETURN;
    END IF;
    
    -- Check if currently inside geofence
    is_inside := is_within_geofence(current_lat, current_lng, assigned_beat.id);
    
    -- Get last known location to determine if this is entry/exit
    SELECT is_within_beat 
    INTO last_location
    FROM geofence_location_logs
    WHERE personnel_id = personnel_id_param
    AND beat_id = assigned_beat.id
    ORDER BY recorded_at DESC
    LIMIT 1;
    
    was_inside := COALESCE(last_location.is_within_beat, FALSE);
    
    -- Determine violation type
    IF was_inside AND NOT is_inside THEN
        -- Personnel left the geofence
        RETURN QUERY SELECT TRUE, 'exit'::VARCHAR(50), assigned_beat.id;
    ELSIF NOT was_inside AND is_inside THEN
        -- Personnel entered the geofence (might be good or violation depending on context)
        RETURN QUERY SELECT TRUE, 'enter'::VARCHAR(50), assigned_beat.id;
    ELSIF NOT is_inside THEN
        -- Personnel remains outside (unauthorized location)
        RETURN QUERY SELECT TRUE, 'unauthorized'::VARCHAR(50), assigned_beat.id;
    ELSE
        -- No violation
        RETURN QUERY SELECT FALSE, NULL::VARCHAR(50), assigned_beat.id;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- RLS Policies for geofencing tables

-- Enable RLS on all geofencing tables
ALTER TABLE geofence_beats ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_beat_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_location_logs ENABLE ROW LEVEL SECURITY;

-- Geofence beats policies
CREATE POLICY "superadmin_full_access_beats" ON geofence_beats
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_accounts 
            WHERE admin_accounts.id = auth.uid() 
            AND admin_accounts.role = 'superadmin'
        )
    );

CREATE POLICY "regional_read_beats" ON geofence_beats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_accounts 
            WHERE admin_accounts.id = auth.uid() 
            AND admin_accounts.role IN ('regional', 'provincial', 'station')
        )
    );

-- Beat assignments policies
CREATE POLICY "admin_beat_assignments" ON geofence_beat_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_accounts 
            WHERE admin_accounts.id = auth.uid() 
            AND admin_accounts.role IN ('superadmin', 'regional', 'provincial', 'station')
        )
    );

-- Violations policies
CREATE POLICY "admin_violations" ON geofence_violations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_accounts 
            WHERE admin_accounts.id = auth.uid() 
            AND admin_accounts.role IN ('superadmin', 'regional', 'provincial', 'station')
        )
    );

-- Settings policies
CREATE POLICY "admin_settings" ON geofence_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_accounts 
            WHERE admin_accounts.id = auth.uid() 
            AND admin_accounts.role IN ('superadmin', 'regional', 'provincial')
        )
    );

-- Location logs policies
CREATE POLICY "personnel_own_logs" ON geofence_location_logs
    FOR INSERT WITH CHECK (personnel_id = auth.uid());

CREATE POLICY "admin_read_logs" ON geofence_location_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_accounts 
            WHERE admin_accounts.id = auth.uid() 
            AND admin_accounts.role IN ('superadmin', 'regional', 'provincial', 'station')
        )
        OR personnel_id = auth.uid()
    );

-- Create sample data for testing
INSERT INTO geofence_beats (
    name, description, center_lat, center_lng, radius_meters, 
    province, unit, sub_unit, status, priority_level, created_by
) VALUES 
(
    'Calapan City Center Beat',
    'Primary patrol area covering Calapan city center and government district',
    13.4119, 121.1805, 500,
    'Oriental Mindoro', 'Calapan CPS', 'Beat 1', 'active', 2,
    (SELECT id FROM auth.users WHERE email LIKE '%admin%' LIMIT 1)
),
(
    'Puerto Princesa Airport Beat',
    'High-security area covering Puerto Princesa International Airport',
    9.7419, 118.7591, 800,
    'Palawan', 'Puerto Princesa CPO', 'Airport Security', 'active', 4,
    (SELECT id FROM auth.users WHERE email LIKE '%admin%' LIMIT 1)
),
(
    'Boac Municipal Hall Beat',
    'Government district patrol area in Boac, Marinduque',
    13.4526, 121.8427, 300,
    'Marinduque', 'Boac MPS', 'Government District', 'maintenance', 3,
    (SELECT id FROM auth.users WHERE email LIKE '%admin%' LIMIT 1)
);

-- Insert default settings for each beat
INSERT INTO geofence_settings (
    beat_id, check_interval_seconds, grace_period_minutes, auto_resolve_hours,
    notify_on_exit, notify_on_enter, notify_on_timeout, escalation_minutes,
    max_violations_per_day, max_distance_variance_meters, configured_by
)
SELECT 
    id, 60, 5, 24, true, false, true, 30, 10, 100,
    (SELECT id FROM auth.users WHERE email LIKE '%admin%' LIMIT 1)
FROM geofence_beats;

-- Add comments for documentation
COMMENT ON TABLE geofence_beats IS 'Stores geofenced patrol beats with geographic boundaries';
COMMENT ON TABLE geofence_beat_assignments IS 'Links personnel to specific patrol beats';
COMMENT ON TABLE geofence_violations IS 'Records when personnel violate geofence boundaries';
COMMENT ON TABLE geofence_settings IS 'Configuration settings for each geofence beat';
COMMENT ON TABLE geofence_location_logs IS 'Real-time location tracking logs for personnel';

COMMENT ON FUNCTION calculate_distance_meters IS 'Calculates distance between two geographic points using Haversine formula';
COMMENT ON FUNCTION is_within_geofence IS 'Checks if coordinates are within a specific geofence beat';
COMMENT ON FUNCTION check_geofence_violation IS 'Detects and categorizes geofence violations for personnel';
