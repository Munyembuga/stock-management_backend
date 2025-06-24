-- Add updated_at column to existing tables if they don't have it

-- Check and add updated_at to users table
SET @exist_users_updated_at = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'users' 
    AND COLUMN_NAME = 'updated_at'
);

SET @sql_users = IF(@exist_users_updated_at > 0, 
    'SELECT "updated_at already exists in users table" as message',
    'ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
);
PREPARE stmt_users FROM @sql_users;
EXECUTE stmt_users;
DEALLOCATE PREPARE stmt_users;

-- Check and add updated_at to products table
SET @exist_products_updated_at = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'products' 
    AND COLUMN_NAME = 'updated_at'
);

SET @sql_products = IF(@exist_products_updated_at > 0, 
    'SELECT "updated_at already exists in products table" as message',
    'ALTER TABLE products ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
);
PREPARE stmt_products FROM @sql_products;
EXECUTE stmt_products;
DEALLOCATE PREPARE stmt_products;

-- Check and add updated_at to purchases table
SET @exist_purchases_updated_at = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'purchases' 
    AND COLUMN_NAME = 'updated_at'
);

SET @sql_purchases = IF(@exist_purchases_updated_at > 0, 
    'SELECT "updated_at already exists in purchases table" as message',
    'ALTER TABLE purchases ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
);
PREPARE stmt_purchases FROM @sql_purchases;
EXECUTE stmt_purchases;
DEALLOCATE PREPARE stmt_purchases;

-- Check and add updated_at to stock table
SET @exist_stock_updated_at = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'stock' 
    AND COLUMN_NAME = 'updated_at'
);

SET @sql_stock = IF(@exist_stock_updated_at > 0, 
    'SELECT "updated_at already exists in stock table" as message',
    'ALTER TABLE stock ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
);
PREPARE stmt_stock FROM @sql_stock;
EXECUTE stmt_stock;
DEALLOCATE PREPARE stmt_stock;

-- Check and add updated_at to stock_out table
SET @exist_stock_out_updated_at = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'stock_out' 
    AND COLUMN_NAME = 'updated_at'
);

SET @sql_stock_out = IF(@exist_stock_out_updated_at > 0, 
    'SELECT "updated_at already exists in stock_out table" as message',
    'ALTER TABLE stock_out ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
);
PREPARE stmt_stock_out FROM @sql_stock_out;
EXECUTE stmt_stock_out;
DEALLOCATE PREPARE stmt_stock_out;

-- Check and add updated_at to expenses table
SET @exist_expenses_updated_at = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'expenses' 
    AND COLUMN_NAME = 'updated_at'
);

SET @sql_expenses = IF(@exist_expenses_updated_at > 0, 
    'SELECT "updated_at already exists in expenses table" as message',
    'ALTER TABLE expenses ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
);
PREPARE stmt_expenses FROM @sql_expenses;
EXECUTE stmt_expenses;
DEALLOCATE PREPARE stmt_expenses;

-- Show final table structures
SELECT 'Final table structures:' as message;
SHOW TABLES;
