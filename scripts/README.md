# E-Patrol Database Scripts

This folder contains various database management and setup scripts for the E-Patrol system.

## 🎯 **Active Scripts (Currently Used)**

### Personnel Replacement System
- **`create-pg-replacement-table.js`** ✅ **MAIN SCRIPT**
  - Creates the `personnel_replacement_history` table
  - Adds foreign key constraints and indexes
  - Sets up Row Level Security policies
  - **Usage**: `node scripts/create-pg-replacement-table.js`
  - **Status**: ✅ Successfully executed

### Database Verification
- **`check-database.js`**
  - Verifies database structure and connectivity
  - Checks table relationships
  - **Usage**: `node scripts/check-database.js`

## 🗃️ **Legacy/Development Scripts**

### Schema Checking Scripts
- `check-beat-status.js` - Verifies beat status fields
- `check-foreign-keys.js` - Checks database foreign key relationships
- `check-locations-schema.js` - Validates locations table structure
- `check-personnel-schema.js` - Validates personnel table structure
- `check-replacement-schema.js` - Checks replacement-related schemas
- `check-replacement-table.js` - Validates replacement table structure

### Database Setup Scripts
- `setup-clean-database.js` - Clean database setup
- `setup-final-database.js` - Final database configuration
- `setup-simple-database.js` - Simple database setup for testing

### Column Management Scripts (DEPRECATED)
- `add-replacement-columns.js` ❌ **DEPRECATED** - Adds replacement columns to beat_personnel
- `remove-replacement-columns.js` ❌ **DEPRECATED** - Removes replacement columns
- `create-replacement-history-table.js` ❌ **DEPRECATED** - Old Supabase approach

### Testing Scripts
- `test-joins.js` - Tests database joins and relationships
- `verify-beat-api.js` - Verifies beat API functionality

## 📋 **How to Use Scripts**

### Prerequisites
```bash
# Ensure you have the required packages
npm install pg dotenv @supabase/supabase-js
```

### Environment Setup
Make sure your `.env.local` file contains:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Running Scripts
```bash
# From project root
node scripts/script-name.js

# Example: Create replacement history table
node scripts/create-pg-replacement-table.js
```

## 🏗️ **Database Architecture**

### Current Structure (After Scripts)
```
personnel_replacement_history
├── id (UUID, Primary Key)
├── beat_id (UUID, References beats.id)
├── old_personnel_id (UUID, References personnel.id)
├── new_personnel_id (UUID, References personnel.id)
├── replacement_reason (TEXT)
├── replaced_at (TIMESTAMP)
├── created_by (UUID, References auth.users.id)
└── created_at (TIMESTAMP)
```

### Indexes Created
- `idx_replacement_history_beat_id` - For beat-based queries
- `idx_replacement_history_old_personnel` - For old personnel lookups
- `idx_replacement_history_new_personnel` - For new personnel lookups
- `idx_replacement_history_replaced_at` - For temporal queries

## 🔒 **Security**

All scripts implement:
- ✅ Row Level Security (RLS) policies
- ✅ Proper foreign key constraints
- ✅ Secure database connections with SSL
- ✅ Environment variable protection

## 🚨 **Important Notes**

1. **Always backup your database** before running any schema modification scripts
2. **Test scripts on development environment** first
3. **Review connection strings** before execution
4. **Check script output** for any errors or warnings

## 📞 **Support**

If you encounter issues with any scripts:
1. Check the console output for error messages
2. Verify your database connection and permissions
3. Ensure all environment variables are set correctly
4. Review the script documentation above
