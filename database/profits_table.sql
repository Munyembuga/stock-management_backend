-- Create profits table
CREATE TABLE profits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    stock_out_id INT NULL,
    quantity_sold INT NOT NULL,
    cost_price DECIMAL(10, 2) NOT NULL,
    selling_price DECIMAL(10, 2) NOT NULL,
    market_price DECIMAL(10, 2) NOT NULL,
    total_cost DECIMAL(12, 2) NOT NULL,
    total_revenue DECIMAL(12, 2) NOT NULL,
    gross_profit DECIMAL(12, 2) NOT NULL,
    profit_margin DECIMAL(5, 2) NOT NULL,
    profit_per_unit DECIMAL(10, 2) NOT NULL,
    sale_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (stock_out_id) REFERENCES stock_out(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX idx_profits_user_id ON profits(user_id);
CREATE INDEX idx_profits_product_id ON profits(product_id);
CREATE INDEX idx_profits_sale_date ON profits(sale_date);
CREATE INDEX idx_profits_stock_out_id ON profits(stock_out_id);

-- Show table structure
DESCRIBE profits;
