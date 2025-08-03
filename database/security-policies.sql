-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================
-- Run this after creating the tables

-- Enable RLS
ALTER TABLE personnel_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel_status ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PERSONNEL LOCATIONS POLICIES
-- =============================================

-- Personnel can insert their own location
CREATE POLICY "Personnel can insert own location" ON personnel_locations
    FOR INSERT TO authenticated
    WITH CHECK (
        personnel_id IN (
            SELECT id FROM personnel 
            WHERE user_id = auth.uid()
        )
    );

-- Superadmin can read all locations
CREATE POLICY "Superadmin can read all locations" ON personnel_locations
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin 
            WHERE user_id = auth.uid() 
            AND role = 'superadmin'
        )
    );

-- Regional admin can read all regional locations
CREATE POLICY "Regional admin can read regional locations" ON personnel_locations
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin a
            WHERE a.user_id = auth.uid() 
            AND a.role = 'regional'
            AND a.region = 'MIMAROPA'
        )
    );

-- Provincial admin can read their province locations
CREATE POLICY "Provincial admin can read provincial locations" ON personnel_locations
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin a
            JOIN personnel p ON personnel_locations.personnel_id = p.id
            WHERE a.user_id = auth.uid() 
            AND a.role = 'provincial'
            AND a.province = p.province
        )
    );

-- Station admin can read their station locations
CREATE POLICY "Station admin can read station locations" ON personnel_locations
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin a
            JOIN personnel p ON personnel_locations.personnel_id = p.id
            WHERE a.user_id = auth.uid() 
            AND a.role = 'station'
            AND a.unit = p.unit
            AND a.sub_unit = p.sub_unit
        )
    );

-- =============================================
-- PERSONNEL STATUS POLICIES
-- =============================================

-- Personnel can update their own status
CREATE POLICY "Personnel can update own status" ON personnel_status
    FOR INSERT TO authenticated
    WITH CHECK (
        personnel_id IN (
            SELECT id FROM personnel 
            WHERE user_id = auth.uid()
        )
    );

-- Superadmin can read all status
CREATE POLICY "Superadmin can read all status" ON personnel_status
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin 
            WHERE user_id = auth.uid() 
            AND role = 'superadmin'
        )
    );

-- Regional admin can read regional status
CREATE POLICY "Regional admin can read regional status" ON personnel_status
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin a
            WHERE a.user_id = auth.uid() 
            AND a.role = 'regional'
            AND a.region = 'MIMAROPA'
        )
    );

-- Provincial admin can read provincial status
CREATE POLICY "Provincial admin can read provincial status" ON personnel_status
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin a
            JOIN personnel p ON personnel_status.personnel_id = p.id
            WHERE a.user_id = auth.uid() 
            AND a.role = 'provincial'
            AND a.province = p.province
        )
    );

-- Station admin can read station status
CREATE POLICY "Station admin can read station status" ON personnel_status
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin a
            JOIN personnel p ON personnel_status.personnel_id = p.id
            WHERE a.user_id = auth.uid() 
            AND a.role = 'station'
            AND a.unit = p.unit
            AND a.sub_unit = p.sub_unit
        )
    );
