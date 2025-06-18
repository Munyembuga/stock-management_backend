const pool = require('../config/db');

// Helper function to get current stock for a product
const getCurrentStock = async (product_id) => {
  try {
    // Get total stock in
    const stockInQuery = 'SELECT COALESCE(SUM(quantity), 0) as total_in FROM stock WHERE product_id = ?';
    const [stockInResult] = await pool.execute(stockInQuery, [product_id]);
    
    // Get total stock out
    const stockOutQuery = 'SELECT COALESCE(SUM(quantity), 0) as total_out FROM stock_out WHERE product_id = ?';
    const [stockOutResult] = await pool.execute(stockOutQuery, [product_id]);
    
    const totalIn = stockInResult[0].total_in || 0;
    const totalOut = stockOutResult[0].total_out || 0;
    const currentStock = totalIn - totalOut;
    
    return {
      total_in: totalIn,
      total_out: totalOut,
      current_stock: Math.max(0, currentStock) // Ensure non-negative
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
    const currentStock = stockInfo.current_stock;
    
    console.log(`Current stock for product ${product_id}: ${currentStock}, Requested: ${quantity}`);
    
    // Validate sufficient stock
    if (currentStock < quantity) {
      return res.status(400).json({ 
        message: 'Insufficient stock available',
        available_stock: currentStock,
        requested_quantity: quantity,
        shortage: quantity - currentStock
      });
    }

    // Calculate remaining quantity after this sale
    const remaining_quantity = currentStock - quantity;
    
    // Calculate total amount
    const total_amount = quantity * selling_price;

    // Insert stock out record with remaining quantity
    const query = `
      INSERT INTO stock_out (product_id, quantity, selling_price, total_amount, remaining_quantity, created_at) 
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    const [result] = await pool.execute(query, [product_id, quantity, selling_price, total_amount, remaining_quantity]);
    
    res.status(201).json({
      message: 'Stock out recorded successfully',
      stock_out: {
        id: result.insertId,
        product_id,
        product_name: products[0].name,
        quantity,
        selling_price,
        total_amount,
        remaining_quantity,
        previous_stock: currentStock
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
    
    const query = `
      SELECT so.*, p.name as product_name 
      FROM stock_out so 
      JOIN products p ON so.product_id = p.id 
      ORDER BY so.id DESC
    `;
    const [stockOut] = await pool.execute(query);
    
    console.log('Stock out records retrieved:', stockOut.length);
    
    res.json({
      message: 'Stock out records retrieved successfully',
      stock_out: stockOut
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
    
    const query = `
      SELECT so.*, p.name as product_name 
      FROM stock_out so 
      JOIN products p ON so.product_id = p.id 
      WHERE so.id = ?
    `;
    const [stockOut] = await pool.execute(query, [id]);
    
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

    // Check if stock out record exists
    const existingQuery = 'SELECT * FROM stock_out WHERE id = ?';
    const [existing] = await pool.execute(existingQuery, [id]);
    
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
    const availableStock = stockInfo.current_stock + existing[0].quantity; // Add back old quantity
    
    if (availableStock < quantity) {
      return res.status(400).json({ 
        message: 'Insufficient stock available for update',
        available_stock: availableStock,
        requested_quantity: quantity
      });
    }

    // Calculate new remaining quantity
    const remaining_quantity = availableStock - quantity;
    const total_amount = quantity * selling_price;

    const query = `
      UPDATE stock_out 
      SET product_id = ?, quantity = ?, selling_price = ?, total_amount = ?, remaining_quantity = ? 
      WHERE id = ?
    `;
    const [result] = await pool.execute(query, [product_id, quantity, selling_price, total_amount, remaining_quantity, id]);
    
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
        total_amount, 
        remaining_quantity 
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
    
    const query = 'DELETE FROM stock_out WHERE id = ?';
    const [result] = await pool.execute(query, [id]);
    
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
        total_stock_in: stockInfo.total_in,
        total_stock_out: stockInfo.total_out,
        current_stock: stockInfo.current_stock,
        stock_status: stockInfo.current_stock > 0 ? 'Available' : 'Out of Stock'
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
