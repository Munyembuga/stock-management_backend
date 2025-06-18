-- Create stock_out table
CREATE TABLE IF NOT EXISTS stock_out (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    selling_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    remaining_quantity INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Add remaining_quantity column if table already exists
ALTER TABLE stock_out ADD COLUMN IF NOT EXISTS remaining_quantity INT NOT NULL DEFAULT 0;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_out_product_id ON stock_out(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_out_created_at ON stock_out(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_out_remaining_qty ON stock_out(remaining_quantity);
