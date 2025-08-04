-- =============================================
-- SAMPLE DATA FOR LIVE MONITORING TESTING
-- =============================================
-- Add sample location and status data for immediate testing

-- First, get the existing personnel ID
DO $$
DECLARE
    existing_personnel_id UUID;
    sample_coords DECIMAL[][] := ARRAY[
        ARRAY[13.4117, 121.1803], -- Oriental Mindoro
        ARRAY[11.1949, 119.4094], -- Palawan
        ARRAY[12.5778, 122.2681], -- Romblon
        ARRAY[13.4548, 121.8431], -- Marinduque
        ARRAY[13.2186, 120.5947]  -- Occidental Mindoro
    ];
BEGIN
    -- Get the first personnel ID
    SELECT id INTO existing_personnel_id FROM personnel LIMIT 1;
    
    IF existing_personnel_id IS NOT NULL THEN
        -- Add status history for existing personnel
        INSERT INTO personnel_status_history (personnel_id, status, notes, status_changed_at)
        VALUES 
            (existing_personnel_id, 'on_duty', 'Regular patrol duty', NOW() - INTERVAL '5 minutes'),
            (existing_personnel_id, 'alert', 'Emergency response', NOW() - INTERVAL '2 minutes'),
            (existing_personnel_id, 'on_duty', 'Back to regular patrol', NOW())
        ON CONFLICT DO NOTHING;
        
        -- Add location data for existing personnel
        INSERT INTO personnel_locations (personnel_id, latitude, longitude, accuracy, timestamp)
        VALUES 
            (existing_personnel_id, 13.4117, 121.1803, 8.5, NOW() - INTERVAL '10 minutes'),
            (existing_personnel_id, 13.4120, 121.1805, 6.2, NOW() - INTERVAL '5 minutes'),
            (existing_personnel_id, 13.4125, 121.1810, 4.8, NOW() - INTERVAL '2 minutes'),
            (existing_personnel_id, 13.4130, 121.1815, 5.1, NOW())
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Sample data added for existing personnel: %', existing_personnel_id;
    END IF;
    
    -- Create additional sample personnel for testing
    INSERT INTO personnel (id, full_name, rank, email, province, unit, sub_unit, is_active)
    VALUES 
        (uuid_generate_v4(), 'PO1 Juan Dela Cruz', 'PO1', 'juan.delacruz@pnp.gov.ph', 'Oriental Mindoro PPO', 'Oriental Mindoro PPO', 'Calapan CPS', true),
        (uuid_generate_v4(), 'PO2 Maria Santos', 'PO2', 'maria.santos@pnp.gov.ph', 'Palawan PPO', 'Palawan PPO', 'El Nido MPS', true),
        (uuid_generate_v4(), 'PO3 Roberto Garcia', 'PO3', 'roberto.garcia@pnp.gov.ph', 'Romblon PPO', 'Romblon PPO', 'Romblon MPS', true),
        (uuid_generate_v4(), 'SPO1 Carmen Lopez', 'SPO1', 'carmen.lopez@pnp.gov.ph', 'Marinduque PPO', 'Marinduque PPO', 'Boac MPS', true),
        (uuid_generate_v4(), 'PO1 Miguel Rivera', 'PO1', 'miguel.rivera@pnp.gov.ph', 'Occidental Mindoro PPO', 'Occidental Mindoro PPO', 'Mamburao MPS', true)
    ON CONFLICT (email) DO NOTHING;
    
    -- Add status and location data for new personnel
    DECLARE
        person_record RECORD;
        coord_index INTEGER := 1;
    BEGIN
        FOR person_record IN 
            SELECT id, full_name FROM personnel 
            WHERE full_name IN ('PO1 Juan Dela Cruz', 'PO2 Maria Santos', 'PO3 Roberto Garcia', 'SPO1 Carmen Lopez', 'PO1 Miguel Rivera')
        LOOP
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
            
            -- Insert location data
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
                RANDOM() * 10 + 5,
                NOW() - INTERVAL '1 minute' * FLOOR(RANDOM() * 10)
            )
            ON CONFLICT DO NOTHING;
            
            coord_index := coord_index + 1;
            IF coord_index > 5 THEN coord_index := 1; END IF;
            
            RAISE NOTICE 'Added data for: %', person_record.full_name;
        END LOOP;
    END;
    
    RAISE NOTICE 'Sample data setup completed successfully!';
END $$;

-- Test the live monitoring view
SELECT 
    full_name,
    rank,
    province,
    status,
    CASE 
        WHEN latitude IS NOT NULL AND longitude IS NOT NULL 
        THEN CONCAT('Lat: ', ROUND(latitude::numeric, 4), ', Lng: ', ROUND(longitude::numeric, 4))
        ELSE 'No location data'
    END as location,
    is_online,
    COALESCE(ROUND(minutes_since_update::numeric, 1), 0) as minutes_ago
FROM live_monitoring 
ORDER BY full_name;
