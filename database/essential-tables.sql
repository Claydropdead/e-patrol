-- =============================================
-- ESSENTIAL TABLES ONLY - Live Monitoring
-- =============================================
-- Run this first if you want to create tables step by step

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Personnel Locations Table
CREATE TABLE personnel_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    personnel_id UUID NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(8, 2),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Personnel Status Table  
CREATE TABLE personnel_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    personnel_id UUID NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('alert', 'standby', 'on_duty', 'off_duty')),
    status_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    changed_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Basic Indexes
CREATE INDEX idx_personnel_locations_personnel_id ON personnel_locations(personnel_id);
CREATE INDEX idx_personnel_locations_timestamp ON personnel_locations(timestamp DESC);
CREATE INDEX idx_personnel_status_personnel_id ON personnel_status(personnel_id);
CREATE INDEX idx_personnel_status_timestamp ON personnel_status(status_changed_at DESC);

-- 4. Enable Real-time
ALTER PUBLICATION supabase_realtime ADD TABLE personnel_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE personnel_status;
