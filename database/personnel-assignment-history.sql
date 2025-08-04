-- =============================================
-- UNIT ASSIGNMENT HISTORY TABLE
-- Track personnel unit/subunit reassignments
-- =============================================

-- Create table for tracking unit assignment changes
CREATE TABLE IF NOT EXISTS personnel_assignment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    personnel_id UUID NOT NULL REFERENCES personnel(id) ON DELETE CASCADE,
    
    -- Previous assignment
    previous_unit TEXT,
    previous_sub_unit TEXT,
    previous_province TEXT,
    
    -- New assignment  
    new_unit TEXT NOT NULL,
    new_sub_unit TEXT NOT NULL,
    new_province TEXT NOT NULL,
    
    -- Assignment details
    assignment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by UUID REFERENCES auth.users(id),
    reason TEXT,
    notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_personnel_assignment_history_personnel_id 
ON personnel_assignment_history(personnel_id);

CREATE INDEX IF NOT EXISTS idx_personnel_assignment_history_date 
ON personnel_assignment_history(assignment_date DESC);

-- Enable RLS
ALTER TABLE personnel_assignment_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy - only superadmins can view assignment history
CREATE POLICY "Superadmin can view assignment history" ON personnel_assignment_history
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM admin_accounts 
        WHERE id = auth.uid() 
        AND role = 'superadmin' 
        AND is_active = true
    )
);

-- RLS Policy - only superadmins can insert assignment history
CREATE POLICY "Superadmin can insert assignment history" ON personnel_assignment_history
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM admin_accounts 
        WHERE id = auth.uid() 
        AND role = 'superadmin' 
        AND is_active = true
    )
);

-- Function to automatically create assignment history when personnel unit changes
CREATE OR REPLACE FUNCTION track_personnel_assignment_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Only track if unit/sub_unit/province actually changed
    IF (OLD.unit != NEW.unit OR OLD.sub_unit != NEW.sub_unit OR OLD.province != NEW.province) THEN
        INSERT INTO personnel_assignment_history (
            personnel_id,
            previous_unit,
            previous_sub_unit, 
            previous_province,
            new_unit,
            new_sub_unit,
            new_province,
            assigned_by,
            reason
        ) VALUES (
            NEW.id,
            OLD.unit,
            OLD.sub_unit,
            OLD.province,
            NEW.unit,
            NEW.sub_unit,
            NEW.province,
            auth.uid(),
            'Unit reassignment via admin panel'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically track assignment changes
DROP TRIGGER IF EXISTS personnel_assignment_trigger ON personnel;
CREATE TRIGGER personnel_assignment_trigger
    AFTER UPDATE ON personnel
    FOR EACH ROW
    EXECUTE FUNCTION track_personnel_assignment_changes();

-- Add assignment history to audit logs
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS assignment_change BOOLEAN DEFAULT FALSE;

SELECT 'Personnel assignment history tracking enabled' as status;
