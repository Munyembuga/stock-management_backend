# Database Setup

## Quick Setup (New Database)

Run the complete schema setup:

```sql
-- Copy and paste the entire content of schema.sql into your MySQL client
-- This will create all tables with correct structure
```

## Migration (Existing Database)

If you already have tables but missing `updated_at` columns:

```sql
-- Copy and paste the entire content of migration.sql into your MySQL client
-- This will add missing columns without destroying existing data
```

## Table Structure

### users
- id (Primary Key)
- name, phone, email, password
- created_at, updated_at

### products  
- id (Primary Key)
- name, description
- created_at, updated_at

### purchases
- id (Primary Key)
- product_id (Foreign Key)
- user_id (Foreign Key)
- quantity, cost_price, selling_price
- created_at, updated_at

### stock
- id (Primary Key)
- product_id (Foreign Key, Unique)
- quantity
- created_at, updated_at

### stock_out
- id (Primary Key)
- product_id (Foreign Key)
- user_id (Foreign Key)
- quantity, selling_price, total_amount
- created_at, updated_at

### expenses
- id (Primary Key)
- user_id (Foreign Key)
- product_id (Foreign Key, Optional)
- expense_type ('general' or 'specific')
- category, description, amount, expense_date
- created_at, updated_at

## Testing the Setup

After running the SQL scripts, test your API endpoints:

1. GET /api/test-connection
2. POST /api/auth/register
3. POST /api/auth/login
4. POST /api/products
5. POST /api/purchases
