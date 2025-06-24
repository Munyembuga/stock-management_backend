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
    
    // Remove user-specific filtering for viewing all purchases
    // if you want user-specific, uncomment the next 2 lines:
    // conditions.push('p.user_id = ?');
    // params.push(req.user.id);
    
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
    
    console.log(`Getting purchase with ID: ${id}`);
    
    const query = `
      SELECT p.*, pr.name as product_name, u.name as user_name
      FROM purchases p 
      JOIN products pr ON p.product_id = pr.id 
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `;
    const [purchases] = await pool.execute(query, [id]);
    
    if (purchases.length === 0) {
      return res.status(404).json({ message: 'Purchase not found' });
    }
    
    res.json({
      message: 'Purchase retrieved successfully',
      purchase: purchases[0]
    });
  } catch (error) {
    console.error('Error in getPurchase:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update purchase
const updatePurchase = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { product_id, quantity, cost_price, selling_price } = req.body;
    
    console.log(`Updating purchase ID: ${id}`, req.body);
    
    if (!product_id || !quantity || !cost_price || !selling_price) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Product ID, quantity, cost price, and selling price are required' 
      });
    }

    // Validate numeric values
    if (quantity <= 0 || cost_price <= 0 || selling_price <= 0) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Quantity, cost price, and selling price must be positive numbers' 
      });
    }

    // Check if purchase exists
    const existingQuery = 'SELECT * FROM purchases WHERE id = ?';
    const [existing] = await connection.execute(existingQuery, [id]);
    
    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Purchase not found' });
    }

    const oldPurchase = existing[0];

    // Check if product exists
    const productQuery = 'SELECT id FROM products WHERE id = ?';
    const [products] = await connection.execute(productQuery, [product_id]);
    
    if (products.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Product not found' });
    }

    // Update purchase record
    const updatePurchaseQuery = `
      UPDATE purchases 
      SET product_id = ?, quantity = ?, cost_price = ?, selling_price = ?, updated_at = NOW()
      WHERE id = ?
    `;
    const [result] = await connection.execute(updatePurchaseQuery, [product_id, quantity, cost_price, selling_price, id]);
    
    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Purchase not found' });
    }

    // Update stock if product changed or quantity changed
    if (oldPurchase.product_id !== product_id || oldPurchase.quantity !== quantity) {
      // Reverse old purchase effect on stock
      const revertStockQuery = `
        UPDATE stock 
        SET quantity = quantity - ?, updated_at = NOW() 
        WHERE product_id = ?
      `;
      await connection.execute(revertStockQuery, [oldPurchase.quantity, oldPurchase.product_id]);
      
      // Apply new purchase effect on stock
      const checkNewStockQuery = 'SELECT * FROM stock WHERE product_id = ?';
      const [newStock] = await connection.execute(checkNewStockQuery, [product_id]);
      
      if (newStock.length > 0) {
        const updateNewStockQuery = `
          UPDATE stock 
          SET quantity = quantity + ?, updated_at = NOW() 
          WHERE product_id = ?
        `;
        await connection.execute(updateNewStockQuery, [quantity, product_id]);
      } else {
        const insertNewStockQuery = `
          INSERT INTO stock (product_id, quantity, created_at, updated_at) 
          VALUES (?, ?, NOW(), NOW())
        `;
        await connection.execute(insertNewStockQuery, [product_id, quantity]);
      }
    }
    
    await connection.commit();
    
    res.json({
      message: 'Purchase updated successfully',
      purchase: { 
        id, 
        product_id, 
        quantity, 
        cost_price, 
        selling_price,
        old_values: {
          product_id: oldPurchase.product_id,
          quantity: oldPurchase.quantity
        }
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error in updatePurchase:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    connection.release();
  }
};

// Delete purchase
const deletePurchase = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    console.log(`Deleting purchase ID: ${id}`);
    
    // Get purchase details before deleting
    const getPurchaseQuery = 'SELECT * FROM purchases WHERE id = ?';
    const [purchases] = await connection.execute(getPurchaseQuery, [id]);
    
    if (purchases.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Purchase not found' });
    }
    
    const purchase = purchases[0];
    
    // Delete the purchase record
    const deleteQuery = 'DELETE FROM purchases WHERE id = ?';
    const [result] = await connection.execute(deleteQuery, [id]);
    
    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Purchase not found' });
    }
    
    // Update stock - remove the purchased quantity
    const updateStockQuery = `
      UPDATE stock 
      SET quantity = GREATEST(0, quantity - ?), updated_at = NOW() 
      WHERE product_id = ?
    `;
    await connection.execute(updateStockQuery, [purchase.quantity, purchase.product_id]);
    
    await connection.commit();
    
    res.json({ 
      message: 'Purchase deleted successfully',
      deleted_purchase: {
        id: purchase.id,
        product_id: purchase.product_id,
        quantity: purchase.quantity,
        cost_price: purchase.cost_price,
        selling_price: purchase.selling_price
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error in deletePurchase:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    connection.release();
  }
};

// Get purchase summary
const getPurchaseSummary = async (req, res) => {
  try {
    const { start_date, end_date, product_id } = req.query;
    
    let query = `
      SELECT 
        COUNT(*) as total_purchases,
        SUM(quantity) as total_quantity,
        SUM(quantity * cost_price) as total_cost,
        SUM(quantity * selling_price) as potential_revenue,
        AVG(cost_price) as avg_cost_price,
        AVG(selling_price) as avg_selling_price,
        COUNT(DISTINCT product_id) as unique_products
      FROM purchases p
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
    
    const [summary] = await pool.execute(query, params);
    
    // Get top purchased products
    let topProductsQuery = `
      SELECT 
        pr.name as product_name,
        p.product_id,
        SUM(p.quantity) as total_quantity,
        SUM(p.quantity * p.cost_price) as total_cost,
        COUNT(*) as purchase_count
      FROM purchases p
      JOIN products pr ON p.product_id = pr.id
      WHERE 1=1
    `;
    
    if (conditions.length > 0) {
      topProductsQuery += ' AND ' + conditions.join(' AND ');
    }
    
    topProductsQuery += `
      GROUP BY p.product_id, pr.name
      ORDER BY total_quantity DESC
      LIMIT 5
    `;
    
    const [topProducts] = await pool.execute(topProductsQuery, params);
    
    res.json({
      message: 'Purchase summary retrieved successfully',
      summary: {
        ...summary[0],
        top_products: topProducts
      },
      filters: { start_date, end_date, product_id }
    });
  } catch (error) {
    console.error('Error in getPurchaseSummary:', error);
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