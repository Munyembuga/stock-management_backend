-- Updated Database Schema for Stock Management System
-- This script creates separate purchases and stock tables

-- Rename existing stock table to purchases (if migrating existing data)
-- ALTER TABLE stock RENAME TO purchases;

-- Create purchases table (tracks all purchase transactions)
CREATE TABLE IF NOT EXISTS purchases (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  cost_price DECIMAL(10, 2) NOT NULL,
  selling_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Create stock table (tracks current inventory levels)
CREATE TABLE IF NOT EXISTS stock (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL UNIQUE,
  quantity INT NOT NULL DEFAULT 0,
  cost_price DECIMAL(10, 2) NOT NULL,
  selling_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX idx_purchases_product_id ON purchases(product_id);
CREATE INDEX idx_purchases_created_at ON purchases(created_at);
CREATE INDEX idx_stock_product_id ON stock(product_id);

-- Sample data
INSERT INTO products (name) VALUES 
('Ibirayi'),
('Ibigori'),
('Amashaza');