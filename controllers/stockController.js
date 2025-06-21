const pool = require('../config/db');

// Get current stock for a product (used internally)
const getCurrentStockLevel = async (product_id) => {
  try {
    const query = 'SELECT quantity FROM stock WHERE product_id = ?';
    const [stock] = await pool.execute(query, [product_id]);
    return stock.length > 0 ? stock[0].quantity : 0;
  } catch (error) {
    console.error('Error getting current stock level:', error);
    return 0;
  }
};

// Adjust stock manually (for corrections, damages, etc.)
const adjustStock = async (req, res) => {
  try {
    console.log('Adjust stock request received:', req.body);
    console.log('User from auth:', req.user);
    
    const { product_id, adjustment_quantity, adjustment_type, reason } = req.body;
    
    if (!product_id || !adjustment_quantity || !adjustment_type) {
      return res.status(400).json({ 
        message: 'Product ID, adjustment quantity, and adjustment type are required' 
      });
    }

    if (!['increase', 'decrease'].includes(adjustment_type)) {
      return res.status(400).json({ 
        message: 'Adjustment type must be either "increase" or "decrease"' 
      });
    }

    // Check if product exists
    const productQuery = 'SELECT id FROM products WHERE id = ?';
    const [products] = await pool.execute(productQuery, [product_id]);
    
    if (products.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Get current stock
    const currentStock = await getCurrentStockLevel(product_id);
    
    // Calculate new quantity
    let newQuantity;
    if (adjustment_type === 'increase') {
      newQuantity = currentStock + parseInt(adjustment_quantity);
    } else {
      newQuantity = currentStock - parseInt(adjustment_quantity);
      if (newQuantity < 0) {
        return res.status(400).json({ 
          message: 'Cannot reduce stock below zero. Current stock: ' + currentStock 
        });
      }
    }

    // Update stock
    if (currentStock > 0) {
      const updateQuery = `
        UPDATE stock 
        SET quantity = ?, updated_at = NOW() 
        WHERE product_id = ?
      `;
      await pool.execute(updateQuery, [newQuantity, product_id]);    } else if (adjustment_type === 'increase') {
      // Create new stock record if it doesn't exist and we're increasing
      const insertQuery = `
        INSERT INTO stock (product_id, quantity, created_at, updated_at) 
        VALUES (?, ?, NOW(), NOW())
      `;
      await pool.execute(insertQuery, [product_id, newQuantity]);
    } else {
      return res.status(400).json({ message: 'Cannot decrease stock that doesn\'t exist' });
    }
    
    res.json({
      message: 'Stock adjusted successfully',
      adjustment: {
        product_id,
        previous_quantity: currentStock,
        adjustment_quantity: parseInt(adjustment_quantity),
        adjustment_type,
        new_quantity: newQuantity,
        reason: reason || 'Manual adjustment'
      }
    });
  } catch (error) {
    console.error('Error in adjustStock:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all current stock levels
const getAllStock = async (req, res) => {
  try {
    console.log('Get all stock request received');
    console.log('User from auth:', req.user);
    
    const query = `
      SELECT s.*, p.name as product_name,
        COALESCE(purchased.total_purchased, 0) as total_purchased,
        COALESCE(sold.total_sold, 0) as total_sold
      FROM stock s 
      JOIN products p ON s.product_id = p.id 
      LEFT JOIN (
        SELECT product_id, SUM(quantity) as total_purchased
        FROM purchases GROUP BY product_id
      ) purchased ON s.product_id = purchased.product_id
      LEFT JOIN (
        SELECT product_id, SUM(quantity) as total_sold
        FROM stock_out GROUP BY product_id
      ) sold ON s.product_id = sold.product_id
      ORDER BY s.id DESC
    `;
    const [stock] = await pool.execute(query);
    
    console.log('Stock retrieved:', stock.length);
    
    res.json({
      message: 'Current stock levels retrieved successfully',
      stock
    });
  } catch (error) {
    console.error('Error in getAllStock:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get single stock
const getStock = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT s.*, p.name as product_name 
      FROM stock s 
      JOIN products p ON s.product_id = p.id 
      WHERE s.id = ?
    `;
    const [stock] = await pool.execute(query, [id]);
    
    if (stock.length === 0) {
      return res.status(404).json({ message: 'Stock not found' });
    }
    
    res.json({
      message: 'Stock retrieved successfully',
      stock: stock[0]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update stock
const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { product_id, quantity } = req.body;
    
    if (!product_id || !quantity) {
      return res.status(400).json({ 
        message: 'Product ID and quantity are required' 
      });
    }

    // Check if product exists
    const productQuery = 'SELECT id FROM products WHERE id = ?';
    const [products] = await pool.execute(productQuery, [product_id]);
    
    if (products.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const query = `
      UPDATE stock 
      SET product_id = ?, quantity = ?, updated_at = NOW()
      WHERE id = ?
    `;
    const [result] = await pool.execute(query, [product_id, quantity, id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Stock not found' });
    }
    
    res.json({
      message: 'Stock updated successfully',
      stock: { id, product_id, quantity }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete stock
const deleteStock = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'DELETE FROM stock WHERE id = ?';
    const [result] = await pool.execute(query, [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Stock not found' });
    }
    
    res.json({ message: 'Stock deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  adjustStock,
  getAllStock,
  getStock,
  updateStock,
  deleteStock,
  getCurrentStockLevel
};
