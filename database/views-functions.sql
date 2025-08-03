-- =============================================
-- VIEWS AND HELPER FUNCTIONS
-- =============================================
-- Run this after creating tables and policies

-- =============================================
-- 1. CURRENT STATUS VIEW
-- =============================================
CREATE OR REPLACE VIEW personnel_current_status AS
SELECT DISTINCT ON (personnel_id)
    personnel_id,
    status,
    status_changed_at,
    changed_by,
    notes
FROM personnel_status
ORDER BY personnel_id, status_changed_at DESC;

-- =============================================
-- 2. CURRENT LOCATION VIEW
-- =============================================
CREATE OR REPLACE VIEW personnel_current_location AS
SELECT DISTINCT ON (personnel_id)
    personnel_id,
    latitude,
    longitude,
    accuracy,
    timestamp as last_update
FROM personnel_locations
ORDER BY personnel_id, timestamp DESC;

-- =============================================
-- 3. LIVE MONITORING VIEW (Main View)
-- =============================================
CREATE OR REPLACE VIEW live_monitoring AS
SELECT 
    p.id,
    p.full_name,
    p.rank,
    p.badge_number,
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
-- 4. STATISTICS VIEW
-- =============================================
CREATE OR REPLACE VIEW live_monitoring_stats AS
SELECT 
    COUNT(*) as total_personnel,
    COUNT(CASE WHEN status = 'alert' THEN 1 END) as alert_count,
    COUNT(CASE WHEN status = 'standby' THEN 1 END) as standby_count,
    COUNT(CASE WHEN status = 'on_duty' THEN 1 END) as on_duty_count,
    COUNT(CASE WHEN status = 'off_duty' THEN 1 END) as off_duty_count,
    COUNT(CASE WHEN is_online = true THEN 1 END) as online_count,
    COUNT(CASE WHEN is_online = false THEN 1 END) as offline_count
FROM live_monitoring;

-- =============================================
-- 5. PROVINCE STATISTICS VIEW
-- =============================================
CREATE OR REPLACE VIEW province_stats AS
SELECT 
    province,
    COUNT(*) as total_personnel,
    COUNT(CASE WHEN status = 'alert' THEN 1 END) as alert_count,
    COUNT(CASE WHEN status = 'standby' THEN 1 END) as standby_count,
    COUNT(CASE WHEN status = 'on_duty' THEN 1 END) as on_duty_count,
    COUNT(CASE WHEN is_online = true THEN 1 END) as online_count
FROM live_monitoring
GROUP BY province
ORDER BY province;

-- =============================================
-- 6. HELPER FUNCTIONS
-- =============================================

-- Function to get personnel within radius
CREATE OR REPLACE FUNCTION get_personnel_within_radius(
    center_lat DECIMAL,
    center_lng DECIMAL,
    radius_km DECIMAL
)
RETURNS TABLE(
    personnel_id UUID,
    full_name TEXT,
    status TEXT,
    distance_km DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lm.id,
        lm.full_name,
        lm.status,
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

-- Function to update personnel status
CREATE OR REPLACE FUNCTION update_personnel_status(
    p_personnel_id UUID,
    p_status TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO personnel_status (personnel_id, status, notes, changed_by)
    VALUES (p_personnel_id, p_status, p_notes, auth.uid());
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to insert location
CREATE OR REPLACE FUNCTION insert_personnel_location(
    p_personnel_id UUID,
    p_latitude DECIMAL,
    p_longitude DECIMAL,
    p_accuracy DECIMAL DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO personnel_locations (personnel_id, latitude, longitude, accuracy)
    VALUES (p_personnel_id, p_latitude, p_longitude, p_accuracy);
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
