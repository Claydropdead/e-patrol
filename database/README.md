# Database Scripts

This folder contains all SQL scripts for the PNP E-Patrol MIMAROPA system database.

## Core Schema Files

### `supabase-schema.sql`
- **Purpose**: Main database schema definition
- **Contains**: Tables, types, constraints for the complete system
- **Usage**: Initial database setup
- **Tables**: `admin_accounts`, `personnel`, `location_logs`, `audit_logs`

## Setup & Configuration Scripts

### `secure-database-fix.sql`
- **Purpose**: Comprehensive security setup with RLS policies
- **Contains**: Row Level Security policies, audit triggers, admin constraints
- **Usage**: Apply security layers after schema creation
- **Features**: Role-based access control, audit logging system

### `add-region-field.sql`
- **Purpose**: Add assigned_region field to admin_accounts table
- **Contains**: ALTER TABLE statements for region assignment
- **Usage**: Database schema update for hierarchical assignments

## Admin Account Management

### `create-your-admin.sql`
- **Purpose**: Template for creating new admin accounts
- **Contains**: INSERT statements for admin_accounts table
- **Usage**: Manual admin account creation

### `quick-fix-superadmin.sql`
- **Purpose**: Quick superadmin account creation/verification
- **Contains**: Admin account queries and creation statements
- **Usage**: Emergency superadmin access

### `final-fix-admin.sql`
- **Purpose**: Final admin setup after troubleshooting
- **Contains**: Admin account corrections and validations
- **Usage**: Post-troubleshooting admin fixes

## Emergency & Troubleshooting

### `emergency-fix.sql`
- **Purpose**: Emergency RLS policy bypass and simplification
- **Contains**: Simplified RLS policies that resolved access issues
- **Usage**: When complex RLS policies cause access problems
- **Note**: Contains the working solution that resolved authentication issues

## Sample Data

### `sample-data.sql`
- **Purpose**: Sample data for testing and development
- **Contains**: Test personnel, locations, and demo data
- **Usage**: Development environment setup

## Execution Order

For a fresh database setup, execute in this order:

1. `supabase-schema.sql` - Core schema
2. `add-region-field.sql` - Schema updates
3. `emergency-fix.sql` - Working security policies
4. `sample-data.sql` - (Optional) Test data
5. `create-your-admin.sql` - Create your admin account

## Notes

- The `emergency-fix.sql` contains the current working RLS policies
- Complex RLS policies in `secure-database-fix.sql` caused circular dependencies
- Always backup before running any scripts
- Test in development environment first

## Security

- All scripts implement proper Row Level Security (RLS)
- Admin accounts have hierarchical access control
- Audit logging is enabled for all administrative actions
- Role-based permissions: superadmin > regional > provincial > station
