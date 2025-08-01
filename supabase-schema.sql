-- PNP E-Patrol MIMAROPA Database Schema - Admin & Personnel Management
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user role types
DO $$ BEGIN
    CREATE TYPE admin_role AS ENUM ('superadmin', 'regional', 'provincial', 'station');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Admin accounts table (for superadmin, regional, provincial, station)
CREATE TABLE IF NOT EXISTS admin_accounts (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  rank TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role admin_role NOT NULL,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Personnel table (for personnel only)
CREATE TABLE IF NOT EXISTS personnel (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  rank TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  contact_number TEXT,
  
  -- MIMAROPA specific structure
  region TEXT DEFAULT 'MIMAROPA' NOT NULL,
  province TEXT NOT NULL CHECK (province IN (
    'Oriental Mindoro PPO',
    'Occidental Mindoro PPO',
    'Marinduque PPO',
    'Romblon PPO',
    'Palawan PPO',
    'Puerto Princesa CPO',
    'RMFB'
  )),
  unit TEXT NOT NULL, -- Same as province
  sub_unit TEXT NOT NULL,
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_accounts_role ON admin_accounts(role);
CREATE INDEX IF NOT EXISTS idx_admin_accounts_active ON admin_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_personnel_province ON personnel(province);
CREATE INDEX IF NOT EXISTS idx_personnel_unit ON personnel(unit);
CREATE INDEX IF NOT EXISTS idx_personnel_active ON personnel(is_active);

-- Row Level Security (RLS) Policies
ALTER TABLE admin_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Admin can view own account" ON admin_accounts;
DROP POLICY IF EXISTS "Admin can insert own account" ON admin_accounts;
DROP POLICY IF EXISTS "Admin can update own account" ON admin_accounts;
DROP POLICY IF EXISTS "Personnel can view own profile" ON personnel;
DROP POLICY IF EXISTS "Personnel can insert own profile" ON personnel;
DROP POLICY IF EXISTS "Personnel can update own profile" ON personnel;

-- Admin accounts policies
CREATE POLICY "Admin can view own account" ON admin_accounts
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admin can insert own account" ON admin_accounts
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Admin can update own account" ON admin_accounts
  FOR UPDATE USING (id = auth.uid());

-- Personnel policies
CREATE POLICY "Personnel can view own profile" ON personnel
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Personnel can insert own profile" ON personnel
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Personnel can update own profile" ON personnel
  FOR UPDATE USING (id = auth.uid());

-- Functions for automatic timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_admin_accounts_updated_at ON admin_accounts;
CREATE TRIGGER update_admin_accounts_updated_at 
  BEFORE UPDATE ON admin_accounts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_personnel_updated_at ON personnel;
CREATE TRIGGER update_personnel_updated_at 
  BEFORE UPDATE ON personnel 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
