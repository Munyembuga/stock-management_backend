const pool = require('../config/db');

// Helper function to get current stock for a product
const getCurrentStock = async (product_id) => {
  try {
    // Get current stock from stock table (this reflects purchases)
    const stockQuery = 'SELECT COALESCE(quantity, 0) as current_quantity FROM stock WHERE product_id = ?';
    const [stockResult] = await pool.execute(stockQuery, [product_id]);
    
    // Get total sold from stock_out table
    const stockOutQuery = 'SELECT COALESCE(SUM(quantity), 0) as total_sold FROM stock_out WHERE product_id = ?';
    const [stockOutResult] = await pool.execute(stockOutQuery, [product_id]);
    
    const totalInStock = stockResult[0]?.current_quantity || 0;
    const totalSold = stockOutResult[0].total_sold || 0;
    const availableStock = totalInStock - totalSold;
    
    return {
      total_in_stock: totalInStock,
      total_sold: totalSold,
      available_stock: Math.max(0, availableStock) // Ensure non-negative
    };
  } catch (error) {
    throw new Error('Error calculating current stock: ' + error.message);
  }
};

// Add stock out (sale)
const addStockOut = async (req, res) => {
  try {
    console.log('Add stock out request received:', req.body);
    console.log('User from auth:', req.user);
    
    const { product_id, quantity, selling_price } = req.body;
    const user_id = req.user.id; // Get user ID from auth middleware
    
    // Validation
    if (!product_id || !quantity || !selling_price) {
      return res.status(400).json({ 
        message: 'Product ID, quantity, and selling price are required' 
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({ 
        message: 'Quantity must be greater than 0' 
      });
    }

    if (selling_price <= 0) {
      return res.status(400).json({ 
        message: 'Selling price must be greater than 0' 
      });
    }

    // Check if product exists
    const productQuery = 'SELECT id, name FROM products WHERE id = ?';
    const [products] = await pool.execute(productQuery, [product_id]);
    
    if (products.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Get current stock information
    const stockInfo = await getCurrentStock(product_id);
    const availableStock = stockInfo.available_stock;
    
    console.log(`Available stock for product ${product_id}: ${availableStock}, Requested: ${quantity}`);
    
    // Validate sufficient stock
    if (availableStock < quantity) {
      return res.status(400).json({ 
        message: 'Insufficient stock available',
        available_stock: availableStock,
        requested_quantity: quantity,
        shortage: quantity - availableStock
      });
    }

    // Calculate total amount
    const total_amount = quantity * selling_price;

    // Insert stock out record
    const query = `
      INSERT INTO stock_out (product_id, user_id, quantity, selling_price, total_amount, created_at) 
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    const [result] = await pool.execute(query, [product_id, user_id, quantity, selling_price, total_amount]);
    
    // Calculate remaining stock after this sale
    const remaining_stock = availableStock - quantity;
    
    res.status(201).json({
      message: 'Stock out recorded successfully',
      stock_out: {
        id: result.insertId,
        product_id,
        user_id,
        product_name: products[0].name,
        quantity,
        selling_price,
        total_amount,
        previous_stock: availableStock,
        remaining_stock: remaining_stock
      }
    });
  } catch (error) {
    console.error('Error in addStockOut:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all stock out records
const getAllStockOut = async (req, res) => {
  try {
    console.log('Get all stock out request received');
    console.log('User from auth:', req.user);
    
    const { start_date, end_date, product_id } = req.query;
    const user_id = req.user.id;
    
    let query = `
      SELECT so.*, p.name as product_name, u.name as user_name
      FROM stock_out so 
      JOIN products p ON so.product_id = p.id 
      JOIN users u ON so.user_id = u.id
      WHERE so.user_id = ?
    `;
    
    const conditions = [];
    const params = [user_id];
    
    if (start_date && end_date) {
      conditions.push('DATE(so.created_at) BETWEEN ? AND ?');
      params.push(start_date, end_date);
    }
    
    if (product_id) {
      conditions.push('so.product_id = ?');
      params.push(product_id);
    }
    
    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY so.id DESC';
    
    const [stockOut] = await pool.execute(query, params);
    
    console.log('Stock out records retrieved:', stockOut.length);
    
    res.json({
      message: 'Stock out records retrieved successfully',
      stock_out: stockOut,
      count: stockOut.length
    });
  } catch (error) {
    console.error('Error in getAllStockOut:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get single stock out record
const getStockOut = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    
    const query = `
      SELECT so.*, p.name as product_name, u.name as user_name
      FROM stock_out so 
      JOIN products p ON so.product_id = p.id 
      JOIN users u ON so.user_id = u.id
      WHERE so.id = ? AND so.user_id = ?
    `;
    const [stockOut] = await pool.execute(query, [id, user_id]);
    
    if (stockOut.length === 0) {
      return res.status(404).json({ message: 'Stock out record not found' });
    }
    
    res.json({
      message: 'Stock out record retrieved successfully',
      stock_out: stockOut[0]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update stock out record
const updateStockOut = async (req, res) => {
  try {
    const { id } = req.params;
    const { product_id, quantity, selling_price } = req.body;
    const user_id = req.user.id;
    
    if (!product_id || !quantity || !selling_price) {
      return res.status(400).json({ 
        message: 'Product ID, quantity, and selling price are required' 
      });
    }

    if (quantity <= 0 || selling_price <= 0) {
      return res.status(400).json({ 
        message: 'Quantity and selling price must be greater than 0' 
      });
    }

    // Check if stock out record exists and belongs to user
    const existingQuery = 'SELECT * FROM stock_out WHERE id = ? AND user_id = ?';
    const [existing] = await pool.execute(existingQuery, [id, user_id]);
    
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Stock out record not found' });
    }

    // Check if product exists
    const productQuery = 'SELECT id FROM products WHERE id = ?';
    const [products] = await pool.execute(productQuery, [product_id]);
    
    if (products.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Get current stock (add back the old quantity first)
    const stockInfo = await getCurrentStock(product_id);
    const availableStock = stockInfo.available_stock + existing[0].quantity; // Add back old quantity
    
    if (availableStock < quantity) {
      return res.status(400).json({ 
        message: 'Insufficient stock available for update',
        available_stock: availableStock - existing[0].quantity, // Show actual available
        requested_quantity: quantity
      });
    }

    const total_amount = quantity * selling_price;

    const query = `
      UPDATE stock_out 
      SET product_id = ?, quantity = ?, selling_price = ?, total_amount = ? 
      WHERE id = ? AND user_id = ?
    `;
    const [result] = await pool.execute(query, [product_id, quantity, selling_price, total_amount, id, user_id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Stock out record not found' });
    }
    
    res.json({
      message: 'Stock out record updated successfully',
      stock_out: { 
        id, 
        product_id, 
        quantity, 
        selling_price, 
        total_amount
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete stock out record
const deleteStockOut = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    
    const query = 'DELETE FROM stock_out WHERE id = ? AND user_id = ?';
    const [result] = await pool.execute(query, [id, user_id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Stock out record not found' });
    }
    
    res.json({ message: 'Stock out record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get stock summary for a product
const getStockSummary = async (req, res) => {
  try {
    const { product_id } = req.params;
    
    // Get detailed stock information
    const stockInfo = await getCurrentStock(product_id);
    
    // Get product name
    const productQuery = 'SELECT name FROM products WHERE id = ?';
    const [products] = await pool.execute(productQuery, [product_id]);
    
    if (products.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({
      message: 'Stock summary retrieved successfully',
      summary: {
        product_id: parseInt(product_id),
        product_name: products[0].name,
        total_stock_in: stockInfo.total_in_stock,
        total_stock_out: stockInfo.total_sold,
        available_stock: stockInfo.available_stock,
        stock_status: stockInfo.available_stock > 0 ? 'Available' : 'Out of Stock'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  addStockOut,
  getAllStockOut,
  getStockOut,
  updateStockOut,
  deleteStockOut,
  getStockSummary
};
