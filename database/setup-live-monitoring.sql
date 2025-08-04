-- =============================================
-- QUICK SETUP FOR LIVE MONITORING
-- =============================================
-- Run this in your Supabase SQL Editor to set up live monitoring

-- First, make sure personnel table exists with required columns
DO $$
BEGIN
    -- Add columns to personnel table if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'personnel' AND column_name = 'is_active') THEN
        ALTER TABLE personnel ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'personnel' AND column_name = 'contact_number') THEN
        ALTER TABLE personnel ADD COLUMN contact_number TEXT;
    END IF;
END $$;

-- =============================================
-- PERSONNEL LOCATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS personnel_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    personnel_id UUID NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(8, 2),
    altitude DECIMAL(8, 2),
    speed DECIMAL(6, 2),
    heading DECIMAL(5, 2),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_personnel_locations_personnel_id ON personnel_locations(personnel_id);
CREATE INDEX IF NOT EXISTS idx_personnel_locations_timestamp ON personnel_locations(timestamp DESC);

-- =============================================
-- PERSONNEL STATUS HISTORY TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS personnel_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    personnel_id UUID NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('alert', 'standby', 'on_duty', 'off_duty')),
    previous_status TEXT CHECK (previous_status IN ('alert', 'standby', 'on_duty', 'off_duty')),
    status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    changed_by UUID REFERENCES auth.users(id),
    notes TEXT,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_personnel_status_history_personnel_id ON personnel_status_history(personnel_id);
CREATE INDEX IF NOT EXISTS idx_personnel_status_history_timestamp ON personnel_status_history(status_changed_at DESC);

-- =============================================
-- VIEWS FOR CURRENT STATUS AND LOCATION
-- =============================================

-- Current status view
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

-- Current location view
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
-- MAIN LIVE MONITORING VIEW
-- =============================================
CREATE OR REPLACE VIEW live_monitoring AS
SELECT 
    p.id,
    p.full_name,
    p.rank,
    p.email,
    COALESCE(p.contact_number, '') as contact_number,
    p.province,
    p.unit,
    p.sub_unit,
    COALESCE(p.is_active, true) as is_active,
    
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
    CASE 
        WHEN pl.last_update IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (NOW() - pl.last_update))/60 
        ELSE NULL 
    END as minutes_since_update,
    
    -- Online status (considered online if location updated within 10 minutes)
    CASE 
        WHEN pl.last_update > NOW() - INTERVAL '10 minutes' THEN true 
        ELSE false 
    END as is_online
    
FROM personnel p
LEFT JOIN personnel_current_status ps ON p.id = ps.personnel_id
LEFT JOIN personnel_current_location pl ON p.id = pl.personnel_id
WHERE COALESCE(p.is_active, true) = true
ORDER BY p.full_name;

-- =============================================
-- SAMPLE DATA FOR TESTING
-- =============================================

-- Insert sample location data for testing (only if personnel exist)
DO $$
DECLARE
    person_record RECORD;
    sample_coords DECIMAL[][] := ARRAY[
        ARRAY[13.4117, 121.1803], -- Oriental Mindoro
        ARRAY[11.1949, 119.4094], -- Palawan
        ARRAY[12.5778, 122.2681], -- Romblon
        ARRAY[13.4548, 121.8431], -- Marinduque
        ARRAY[13.2186, 120.5947]  -- Occidental Mindoro
    ];
    coord_index INTEGER := 1;
BEGIN
    -- Only add sample data if personnel table has data
    IF EXISTS (SELECT 1 FROM personnel LIMIT 1) THEN
        
        -- Add sample status history for each personnel
        FOR person_record IN SELECT id FROM personnel WHERE is_active = true LIMIT 5 LOOP
            -- Insert status history
            INSERT INTO personnel_status_history (personnel_id, status, notes)
            VALUES (
                person_record.id, 
                CASE coord_index % 3 
                    WHEN 0 THEN 'alert'
                    WHEN 1 THEN 'on_duty' 
                    ELSE 'standby'
                END,
                CASE coord_index % 3 
                    WHEN 0 THEN 'Emergency response'
                    WHEN 1 THEN 'Regular patrol' 
                    ELSE 'Awaiting assignment'
                END
            )
            ON CONFLICT DO NOTHING;
            
            -- Insert location data with slight random offset
            INSERT INTO personnel_locations (
                personnel_id, 
                latitude, 
                longitude, 
                accuracy,
                timestamp
            )
            VALUES (
                person_record.id,
                sample_coords[coord_index][1] + (RANDOM() - 0.5) * 0.01,
                sample_coords[coord_index][2] + (RANDOM() - 0.5) * 0.01,
                RANDOM() * 10 + 5, -- 5-15 meter accuracy
                NOW() - INTERVAL '1 minute' * FLOOR(RANDOM() * 10) -- Random recent time
            )
            ON CONFLICT DO NOTHING;
            
            coord_index := coord_index + 1;
            IF coord_index > 5 THEN coord_index := 1; END IF;
        END LOOP;
        
        RAISE NOTICE 'Sample data inserted for live monitoring';
    ELSE
        RAISE NOTICE 'No personnel found, skipping sample data insertion';
    END IF;
END $$;

-- =============================================
-- ENABLE RLS (Row Level Security) IF NEEDED
-- =============================================
-- Uncomment these if you want to enable RLS
-- ALTER TABLE personnel_locations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE personnel_status_history ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
DO $$
BEGIN
    RAISE NOTICE 'Live monitoring setup completed successfully!';
    RAISE NOTICE 'You can now use the live_monitoring view in your application.';
    RAISE NOTICE 'Run: SELECT * FROM live_monitoring; to test the view.';
END $$;
