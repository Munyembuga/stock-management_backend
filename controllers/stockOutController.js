const pool = require('../config/db');

// Helper function to get current stock for a product
const getCurrentStock = async (product_id) => {
  try {
    // Get current stock from stock table (this reflects real-time inventory)
    const stockQuery = 'SELECT COALESCE(quantity, 0) as current_quantity FROM stock WHERE product_id = ?';
    const [stockResult] = await pool.execute(stockQuery, [product_id]);
    
    const availableStock = stockResult[0]?.current_quantity || 0;
    
    return {
      available_stock: Math.max(0, availableStock) // Ensure non-negative
    };
  } catch (error) {
    throw new Error('Error calculating current stock: ' + error.message);
  }
};

// Add stock out (sale) and update stock
const addStockOut = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    console.log('Add stock out request received:', req.body);
    console.log('User from auth:', req.user);
    
    const { product_id, quantity, selling_price } = req.body;
    const user_id = req.user.id; // Get user ID from auth middleware
    
    // Validation
    if (!product_id || !quantity || !selling_price) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Product ID, quantity, and selling price are required' 
      });
    }

    if (quantity <= 0) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Quantity must be greater than 0' 
      });
    }

    if (selling_price <= 0) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Selling price must be greater than 0' 
      });
    }

    // Check if product exists
    const productQuery = 'SELECT id, name FROM products WHERE id = ?';
    const [products] = await connection.execute(productQuery, [product_id]);
    
    if (products.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Product not found' });
    }

    // Get current stock from stock table
    const stockQuery = 'SELECT quantity FROM stock WHERE product_id = ?';
    const [stockResult] = await connection.execute(stockQuery, [product_id]);
    
    if (stockResult.length === 0) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'No stock available for this product. Please add purchases first.' 
      });
    }

    const currentStock = stockResult[0].quantity || 0;
    
    console.log(`Current stock for product ${product_id}: ${currentStock}, Requested: ${quantity}`);
    
    // Validate sufficient stock
    if (currentStock < quantity) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Insufficient stock available',
        available_stock: currentStock,
        requested_quantity: quantity,
        shortage: quantity - currentStock
      });
    }

    // Calculate total amount
    const total_amount = quantity * selling_price;

    // 1. Insert stock out record
    const stockOutQuery = `
      INSERT INTO stock_out (product_id, user_id, quantity, selling_price, total_amount, created_at) 
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    const [stockOutResult] = await connection.execute(stockOutQuery, [product_id, user_id, quantity, selling_price, total_amount]);
    
    // 2. Update stock table - reduce quantity
    const newStockQuantity = currentStock - quantity;
    const updateStockQuery = `
      UPDATE stock 
      SET quantity = ?, updated_at = NOW() 
      WHERE product_id = ?
    `;
    await connection.execute(updateStockQuery, [newStockQuantity, product_id]);
    
    await connection.commit();
    
    res.status(201).json({
      message: 'Stock out recorded and inventory updated successfully',
      stock_out: {
        id: stockOutResult.insertId,
        product_id,
        user_id,
        product_name: products[0].name,
        quantity,
        selling_price,
        total_amount,
        previous_stock: currentStock,
        remaining_stock: newStockQuantity
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error in addStockOut:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    connection.release();
  }
};

// Get all stock out records
const getAllStockOut = async (req, res) => {
  try {
    console.log('Get all stock out request received');
    console.log('User from auth:', req.user);
    
    const { start_date, end_date, product_id } = req.query;
    
    let query = `
      SELECT so.*, p.name as product_name, u.name as user_name
      FROM stock_out so 
      JOIN products p ON so.product_id = p.id 
      JOIN users u ON so.user_id = u.id
      WHERE 1=1
    `;
    
    const conditions = [];
    const params = [];
    
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
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { product_id, quantity, selling_price } = req.body;
    const user_id = req.user.id;
    
    if (!product_id || !quantity || !selling_price) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Product ID, quantity, and selling price are required' 
      });
    }

    if (quantity <= 0 || selling_price <= 0) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Quantity and selling price must be greater than 0' 
      });
    }

    // Check if stock out record exists and belongs to user
    const existingQuery = 'SELECT * FROM stock_out WHERE id = ? AND user_id = ?';
    const [existing] = await connection.execute(existingQuery, [id, user_id]);
    
    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Stock out record not found' });
    }

    // Check if product exists
    const productQuery = 'SELECT id FROM products WHERE id = ?';
    const [products] = await connection.execute(productQuery, [product_id]);
    
    if (products.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Product not found' });
    }

    // Get current stock and add back the old quantity first
    const stockQuery = 'SELECT quantity FROM stock WHERE product_id = ?';
    const [stockResult] = await connection.execute(stockQuery, [product_id]);
    
    if (stockResult.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'Stock record not found for this product' });
    }

    const currentStock = stockResult[0].quantity || 0;
    const oldQuantity = existing[0].quantity;
    const availableStock = currentStock + oldQuantity; // Add back old quantity
    
    // Validate sufficient stock for new quantity
    if (availableStock < quantity) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Insufficient stock available for update',
        available_stock: currentStock, // Show actual current stock
        requested_quantity: quantity,
        old_quantity: oldQuantity
      });
    }

    const total_amount = quantity * selling_price;

    // 1. Update stock out record
    const updateStockOutQuery = `
      UPDATE stock_out 
      SET product_id = ?, quantity = ?, selling_price = ?, total_amount = ? 
      WHERE id = ? AND user_id = ?
    `;
    const [result] = await connection.execute(updateStockOutQuery, [product_id, quantity, selling_price, total_amount, id, user_id]);
    
    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Stock out record not found' });
    }

    // 2. Update stock table - adjust quantity based on difference
    const newStockQuantity = availableStock - quantity;
    const updateStockQuery = `
      UPDATE stock 
      SET quantity = ?, updated_at = NOW() 
      WHERE product_id = ?
    `;
    await connection.execute(updateStockQuery, [newStockQuantity, product_id]);
    
    await connection.commit();
    
    res.json({
      message: 'Stock out record updated and inventory adjusted successfully',
      stock_out: { 
        id, 
        product_id, 
        quantity, 
        selling_price, 
        total_amount,
        stock_adjustment: {
          old_quantity: oldQuantity,
          new_quantity: quantity,
          stock_before: currentStock,
          stock_after: newStockQuantity
        }
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error in updateStockOut:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    connection.release();
  }
};

// Delete stock out record and restore stock
const deleteStockOut = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const user_id = req.user.id;
    
    // Get the stock out record to know how much to restore
    const stockOutQuery = 'SELECT * FROM stock_out WHERE id = ? AND user_id = ?';
    const [stockOutResult] = await connection.execute(stockOutQuery, [id, user_id]);
    
    if (stockOutResult.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Stock out record not found' });
    }
    
    const stockOutRecord = stockOutResult[0];
    
    // Delete the stock out record
    const deleteQuery = 'DELETE FROM stock_out WHERE id = ? AND user_id = ?';
    const [result] = await connection.execute(deleteQuery, [id, user_id]);
    
    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Stock out record not found' });
    }
    
    // Restore stock quantity
    const updateStockQuery = `
      UPDATE stock 
      SET quantity = quantity + ?, updated_at = NOW() 
      WHERE product_id = ?
    `;
    await connection.execute(updateStockQuery, [stockOutRecord.quantity, stockOutRecord.product_id]);
    
    await connection.commit();
    
    res.json({ 
      message: 'Stock out record deleted and inventory restored successfully',
      restored_quantity: stockOutRecord.quantity,
      product_id: stockOutRecord.product_id
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error in deleteStockOut:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    connection.release();
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
    
    // Get total sold from stock_out table
    const totalSoldQuery = 'SELECT COALESCE(SUM(quantity), 0) as total_sold FROM stock_out WHERE product_id = ?';
    const [totalSoldResult] = await pool.execute(totalSoldQuery, [product_id]);
    
    res.json({
      message: 'Stock summary retrieved successfully',
      summary: {
        product_id: parseInt(product_id),
        product_name: products[0].name,
        current_stock: stockInfo.available_stock,
        total_sold: totalSoldResult[0].total_sold || 0,
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
