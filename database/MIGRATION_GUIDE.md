# Database Migration Guide

## Option 1: Update Existing Database

If you have existing data and want to preserve it, use the **update_schema.sql** file:

```bash
# Connect to your MySQL database
mysql -u your_username -p your_database_name

# Execute the update script
source /path/to/update_schema.sql

# Or copy and paste the commands one by one
```

### Steps in update_schema.sql:
1. ✅ Add `user_id` columns to purchases, stock_out, and expenses tables
2. ✅ Add `selling_price` column to purchases table
3. ✅ Add foreign key constraints for data integrity
4. ✅ Update existing records with default user_id (optional)
5. ✅ Make user_id columns NOT NULL
6. ✅ Create performance indexes
7. ✅ Verify changes

## Option 2: Fresh Database Setup

If you want to start fresh with clean data, use the **fresh_setup.sql** file:

```bash
# Connect to your MySQL database
mysql -u your_username -p your_database_name

# Execute the fresh setup script
source /path/to/fresh_setup.sql
```

### What fresh_setup.sql does:
1. ✅ Drops all existing tables (if any)
2. ✅ Creates all tables with updated schema
3. ✅ Includes all user authentication fields
4. ✅ Sets up proper foreign key relationships
5. ✅ Creates performance indexes
6. ✅ Inserts sample data for testing

## Required Database Schema Changes Summary:

### 1. **purchases table** updates:
- ✅ Added `user_id INT NOT NULL`
- ✅ Added `selling_price DECIMAL(10,2) NOT NULL`
- ✅ Added foreign key to users table

### 2. **stock_out table** updates:
- ✅ Added `user_id INT NOT NULL`
- ✅ Added foreign key to users table

### 3. **expenses table** updates:
- ✅ Added `user_id INT NOT NULL`
- ✅ Added foreign key to users table

### 4. **New indexes** for performance:
- ✅ `idx_purchases_user_id`
- ✅ `idx_stock_out_user_id`
- ✅ `idx_expenses_user_id`

## Verification Commands:

After running either script, verify the changes:

```sql
-- Check table structures
DESCRIBE purchases;
DESCRIBE stock_out;
DESCRIBE expenses;

-- Check foreign key constraints
SELECT 
  TABLE_NAME,
  COLUMN_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM
  INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE
  REFERENCED_TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('purchases', 'stock_out', 'expenses');

-- Check sample data
SELECT * FROM users;
SELECT * FROM products;
```

## Important Notes:

### ⚠️ **Before Running Update Script:**
1. **Backup your database** first!
2. Make sure you have at least one user in the users table
3. Review the default user_id assignment in step 6

### 🔧 **Sample Login Credentials:**
- Phone: `0781234567`
- Password: `password123`

### 🚀 **After Database Update:**
1. Restart your Node.js server
2. Test authentication endpoints
3. Verify user-specific data isolation
4. Test stock validation features

## Troubleshooting:

### If you get foreign key constraint errors:
```sql
-- Temporarily disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;
-- Run your commands
SET FOREIGN_KEY_CHECKS = 1;
```

### If columns already exist:
The update script uses `ADD COLUMN` which will fail if column exists. You can:
1. Check if column exists first, or
2. Use the fresh setup option instead

Choose the option that best fits your situation!