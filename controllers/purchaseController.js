const pool = require('../config/db');

// Add new purchase (and update stock inventory)
const addPurchase = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    console.log('Add purchase request received:', req.body);
    console.log('User from auth:', req.user);
      const { product_id, quantity, cost_price, selling_price } = req.body;
    const user_id = req.user.id; // Get user ID from auth middleware
    
    if (!product_id || !quantity || !cost_price || !selling_price) {
      return res.status(400).json({ 
        message: 'Product ID, quantity, cost price, and selling price are required' 
      });
    }

    // Validate numeric values
    if (quantity <= 0 || cost_price <= 0 || selling_price <= 0) {
      return res.status(400).json({ 
        message: 'Quantity, cost price, and selling price must be positive numbers' 
      });
    }

    // Check if product exists
    const productQuery = 'SELECT id FROM products WHERE id = ?';
    const [products] = await connection.execute(productQuery, [product_id]);
    
    if (products.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Product not found' });
    }    // 1. Insert purchase record
    const purchaseQuery = `
      INSERT INTO purchases (product_id, user_id, quantity, cost_price, selling_price, created_at) 
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    const [purchaseResult] = await connection.execute(purchaseQuery, [product_id, user_id, quantity, cost_price, selling_price]);
    
    // 2. Update or insert stock inventory
    const checkStockQuery = 'SELECT * FROM stock WHERE product_id = ?';
    const [existingStock] = await connection.execute(checkStockQuery, [product_id]);
    
    if (existingStock.length > 0) {
      // Update existing stock - add new quantity
      const newQuantity = existingStock[0].quantity + parseInt(quantity);
      const updateStockQuery = `
        UPDATE stock 
        SET quantity = ?, 
            updated_at = NOW() 
        WHERE product_id = ?
      `;
      await connection.execute(updateStockQuery, [newQuantity, product_id]);
    } else {
      // Insert new stock record
      const insertStockQuery = `
        INSERT INTO stock (product_id, quantity, created_at, updated_at) 
        VALUES (?, ?, NOW(), NOW())
      `;
      await connection.execute(insertStockQuery, [product_id, quantity]);
    }
    
    await connection.commit();
      res.status(201).json({
      message: 'Purchase added and stock updated successfully',
      purchase: {
        id: purchaseResult.insertId,
        product_id,
        user_id,
        quantity,
        cost_price,
        selling_price
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error in addPurchase:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    connection.release();
  }
};

// Get all purchases
const getAllPurchases = async (req, res) => {
  try {
    console.log('Get all purchases request received');
    console.log('User from auth:', req.user);
    
    const { start_date, end_date, product_id } = req.query;
    
    let query = `
      SELECT p.*, pr.name as product_name, u.name as user_name
      FROM purchases p 
      JOIN products pr ON p.product_id = pr.id 
      JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;
    
    const conditions = [];
    const params = [];
    
    if (start_date && end_date) {
      conditions.push('DATE(p.created_at) BETWEEN ? AND ?');
      params.push(start_date, end_date);
    }
    
    if (product_id) {
      conditions.push('p.product_id = ?');
      params.push(product_id);
    }
    
    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY p.id DESC';
    
    const [purchases] = await pool.execute(query, params);
    
    console.log('Purchases retrieved:', purchases.length);
    
    res.json({
      message: 'Purchases retrieved successfully',
      purchases,
      count: purchases.length
    });
  } catch (error) {
    console.error('Error in getAllPurchases:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get single purchase
const getPurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    
    const query = `
      SELECT p.*, pr.name as product_name, u.name as user_name
      FROM purchases p 
      JOIN products pr ON p.product_id = pr.id 
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ? AND p.user_id = ?
    `;
    const [purchases] = await pool.execute(query, [id, user_id]);
    
    if (purchases.length === 0) {
      return res.status(404).json({ message: 'Purchase not found' });
    }
    
    res.json({
      message: 'Purchase retrieved successfully',
      purchase: purchases[0]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update purchase
const updatePurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const { product_id, quantity, cost_price, selling_price } = req.body;
    const user_id = req.user.id;
    
    if (!product_id || !quantity || !cost_price || !selling_price) {
      return res.status(400).json({ 
        message: 'Product ID, quantity, cost price, and selling price are required' 
      });
    }

    // Validate numeric values
    if (quantity <= 0 || cost_price <= 0 || selling_price <= 0) {
      return res.status(400).json({ 
        message: 'Quantity, cost price, and selling price must be positive numbers' 
      });
    }

    // Check if product exists
    const productQuery = 'SELECT id FROM products WHERE id = ?';
    const [products] = await pool.execute(productQuery, [product_id]);
    
    if (products.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const query = `
      UPDATE purchases 
      SET product_id = ?, quantity = ?, cost_price = ?, selling_price = ? 
      WHERE id = ? AND user_id = ?
    `;
    const [result] = await pool.execute(query, [product_id, quantity, cost_price, selling_price, id, user_id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Purchase not found' });
    }
    
    res.json({
      message: 'Purchase updated successfully',
      purchase: { id, product_id, quantity, cost_price, selling_price }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete purchase
const deletePurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    
    const query = 'DELETE FROM purchases WHERE id = ? AND user_id = ?';
    const [result] = await pool.execute(query, [id, user_id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Purchase not found' });
    }
    
    res.json({ message: 'Purchase deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get purchase summary
const getPurchaseSummary = async (req, res) => {
  try {
    const { start_date, end_date, product_id } = req.query;
    const user_id = req.user.id;
    
    let query = `
      SELECT 
        COUNT(*) as total_purchases,
        SUM(quantity) as total_quantity,
        SUM(quantity * cost_price) as total_cost,
        SUM(quantity * selling_price) as potential_revenue,
        AVG(cost_price) as avg_cost_price,
        AVG(selling_price) as avg_selling_price
      FROM purchases p
      WHERE p.user_id = ?
    `;
    
    const conditions = [];
    const params = [user_id];
    
    if (start_date && end_date) {
      conditions.push('DATE(p.created_at) BETWEEN ? AND ?');
      params.push(start_date, end_date);
    }
    
    if (product_id) {
      conditions.push('p.product_id = ?');
      params.push(product_id);
    }
    
    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }
    
    const [summary] = await pool.execute(query, params);
    
    res.json({
      message: 'Purchase summary retrieved successfully',
      summary: summary[0],
      filters: { start_date, end_date, product_id }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  addPurchase,
  getAllPurchases,
  getPurchase,
  updatePurchase,
  deletePurchase,
  getPurchaseSummary
};