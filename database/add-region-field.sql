-- Add assigned_region field to admin_accounts table
ALTER TABLE admin_accounts 
ADD COLUMN IF NOT EXISTS assigned_region TEXT;

-- Update existing regional admins to have MIMAROPA region
UPDATE admin_accounts 
SET assigned_region = 'MIMAROPA' 
WHERE role = 'regional';

-- For provincial and station admins, also set to MIMAROPA (since this is a MIMAROPA-only system)
UPDATE admin_accounts 
SET assigned_region = 'MIMAROPA' 
WHERE role IN ('provincial', 'station') AND assigned_region IS NULL;
