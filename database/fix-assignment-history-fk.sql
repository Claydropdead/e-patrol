-- =============================================
-- FIX ASSIGNMENT HISTORY FOREIGN KEY
-- Create proper relationship for JOINs to work
-- =============================================

-- First, let's add a proper foreign key constraint to the assigned_by field
-- that specifically references admin_accounts instead of auth.users

-- Drop the existing foreign key constraint if it exists
ALTER TABLE personnel_assignment_history 
DROP CONSTRAINT IF EXISTS personnel_assignment_history_assigned_by_fkey;

-- Add a new foreign key constraint that references admin_accounts
-- This will allow Supabase to understand the relationship for JOINs
ALTER TABLE personnel_assignment_history 
ADD CONSTRAINT personnel_assignment_history_assigned_by_admin_fkey 
FOREIGN KEY (assigned_by) REFERENCES admin_accounts(id) ON DELETE SET NULL;

-- Add an index for the foreign key for better performance
CREATE INDEX IF NOT EXISTS idx_personnel_assignment_history_assigned_by 
ON personnel_assignment_history(assigned_by);

-- Verify the constraint was created
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    confrelid::regclass as referenced_table
FROM pg_constraint 
WHERE conrelid = 'personnel_assignment_history'::regclass 
AND conname LIKE '%assigned_by%';
