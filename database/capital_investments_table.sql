-- Create capital_investments table
CREATE TABLE capital_investments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    investment_date DATE NOT NULL,
    investment_type ENUM('cash', 'bank_transfer', 'check', 'asset', 'other') DEFAULT 'cash',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_capital_user_id ON capital_investments(user_id);
CREATE INDEX idx_capital_investment_date ON capital_investments(investment_date);
CREATE INDEX idx_capital_investment_type ON capital_investments(investment_type);

-- Insert sample data
INSERT INTO capital_investments (user_id, amount, investment_date, investment_type, notes) VALUES 
(1, 500000.00, '2024-01-01', 'cash', 'Initial business capital'),
(1, 200000.00, '2024-02-15', 'bank_transfer', 'Additional investment for expansion'),
(2, 300000.00, '2024-01-10', 'cash', 'Partner investment');

-- Show table structure
DESCRIBE capital_investments;

-- Show sample data
SELECT * FROM capital_investments;
