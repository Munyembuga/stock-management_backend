const pool = require('../config/db');

// Add new stock
const addStock = async (req, res) => {
  try {
    console.log('Add stock request received:', req.body);
    console.log('User from auth:', req.user);
    
    const { product_id, quantity, cost_price, selling_price } = req.body;
    
    if (!product_id || !quantity || !cost_price || !selling_price) {
      return res.status(400).json({ 
        message: 'Product ID, quantity, cost price, and selling price are required' 
      });
    }

    // Check if product exists
    const productQuery = 'SELECT id FROM products WHERE id = ?';
    const [products] = await pool.execute(productQuery, [product_id]);
    
    if (products.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const query = `
      INSERT INTO stock (product_id, quantity, cost_price, selling_price, created_at) 
      VALUES (?, ?, ?, ?, NOW())
    `;
    const [result] = await pool.execute(query, [product_id, quantity, cost_price, selling_price]);
    
    res.status(201).json({
      message: 'Stock added successfully',
      stock: {
        id: result.insertId,
        product_id,
        quantity,
        cost_price,
        selling_price
      }
    });
  } catch (error) {
    console.error('Error in addStock:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all stock
const getAllStock = async (req, res) => {
  try {
    console.log('Get all stock request received');
    console.log('User from auth:', req.user);
    
    const query = `
      SELECT s.*, p.name as product_name 
      FROM stock s 
      JOIN products p ON s.product_id = p.id 
      ORDER BY s.id DESC
    `;
    const [stock] = await pool.execute(query);
    
    console.log('Stock retrieved:', stock.length);
    
    res.json({
      message: 'Stock retrieved successfully',
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
    const { product_id, quantity, cost_price, selling_price } = req.body;
    
    if (!product_id || !quantity || !cost_price || !selling_price) {
      return res.status(400).json({ 
        message: 'Product ID, quantity, cost price, and selling price are required' 
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
      SET product_id = ?, quantity = ?, cost_price = ?, selling_price = ? 
      WHERE id = ?
    `;
    const [result] = await pool.execute(query, [product_id, quantity, cost_price, selling_price, id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Stock not found' });
    }
    
    res.json({
      message: 'Stock updated successfully',
      stock: { id, product_id, quantity, cost_price, selling_price }
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
  addStock,
  getAllStock,
  getStock,
  updateStock,
  deleteStock
};
