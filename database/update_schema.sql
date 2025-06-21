-- SQL Commands to Update Database Schema for User Authentication
-- Execute these commands in order to update your existing database

-- Step 1: Add user_id column to purchases table (if not exists)
ALTER TABLE purchases 
ADD COLUMN user_id INT AFTER product_id;

-- Step 2: Add user_id column to stock_out table (if not exists)
ALTER TABLE stock_out 
ADD COLUMN user_id INT AFTER product_id;

-- Step 3: Add user_id column to expenses table (if not exists)
ALTER TABLE expenses 
ADD COLUMN user_id INT AFTER id;

-- Step 4: Add selling_price column to purchases table (if not exists)
ALTER TABLE purchases 
ADD COLUMN selling_price DECIMAL(10, 2) AFTER cost_price;

-- Step 5: Add foreign key constraints for user_id columns
ALTER TABLE purchases 
ADD CONSTRAINT fk_purchases_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE stock_out 
ADD CONSTRAINT fk_stock_out_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE expenses 
ADD CONSTRAINT fk_expenses_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 6: Update existing records with default user_id (OPTIONAL)
-- Only run this if you have existing data and want to assign it to a specific user
-- Replace '1' with the actual user ID you want to assign the data to

-- Update purchases table
UPDATE purchases SET user_id = 1 WHERE user_id IS NULL;

-- Update stock_out table  
UPDATE stock_out SET user_id = 1 WHERE user_id IS NULL;

-- Update expenses table
UPDATE expenses SET user_id = 1 WHERE user_id IS NULL;

-- Step 7: Make user_id columns NOT NULL (after updating existing records)
ALTER TABLE purchases 
MODIFY COLUMN user_id INT NOT NULL;

ALTER TABLE stock_out 
MODIFY COLUMN user_id INT NOT NULL;

ALTER TABLE expenses 
MODIFY COLUMN user_id INT NOT NULL;

-- Step 8: Update purchases table to make selling_price NOT NULL (if needed)
-- First update existing records with a default value
UPDATE purchases SET selling_price = cost_price * 1.5 WHERE selling_price IS NULL;

-- Then make it NOT NULL
ALTER TABLE purchases 
MODIFY COLUMN selling_price DECIMAL(10, 2) NOT NULL;

-- Step 9: Create indexes for better performance
CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_stock_out_user_id ON stock_out(user_id);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);

-- Step 10: Verify the changes
DESCRIBE purchases;
DESCRIBE stock_out;
DESCRIBE expenses;

-- Step 11: Check if all tables exist and have correct structure
SHOW TABLES;

-- Step 12: Sample data verification queries
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM 
    INFORMATION_SCHEMA.COLUMNS 
WHERE 
    TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME IN ('users', 'products', 'purchases', 'stock', 'stock_out', 'expenses')
ORDER BY 
    TABLE_NAME, ORDINAL_POSITION;