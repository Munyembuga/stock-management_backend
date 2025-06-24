const pool = require('../config/db');

// Add profit record for a sale
const addProfit = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    console.log('Add profit request received:', req.body);
    console.log('User from auth:', req.user);
    
    const { 
      product_id, 
      stock_out_id, 
      quantity_sold, 
      cost_price, 
      selling_price, 
      market_price, 
      sale_date,
      notes 
    } = req.body;
    const user_id = req.user.id;
    
    // Validation
    if (!product_id || !quantity_sold || !cost_price || !selling_price || !market_price) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Product ID, quantity sold, cost price, selling price, and market price are required' 
      });
    }

    if (quantity_sold <= 0 || cost_price <= 0 || selling_price <= 0 || market_price <= 0) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'All prices and quantity must be positive numbers' 
      });
    }

    // Check if product exists
    const productQuery = 'SELECT id, name FROM products WHERE id = ?';
    const [products] = await connection.execute(productQuery, [product_id]);
    
    if (products.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if stock_out record exists (if provided)
    if (stock_out_id) {
      const stockOutQuery = 'SELECT id FROM stock_out WHERE id = ?';
      const [stockOut] = await connection.execute(stockOutQuery, [stock_out_id]);
      
      if (stockOut.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'Stock out record not found' });
      }
    }

    // Calculate profit metrics
    const total_cost = quantity_sold * cost_price;
    const total_revenue = quantity_sold * market_price;
    const gross_profit = total_revenue - total_cost;
    const profit_margin = ((gross_profit / total_revenue) * 100).toFixed(2);
    const profit_per_unit = market_price - cost_price;

    const finalSaleDate = sale_date || new Date().toISOString().split('T')[0];

    // Insert profit record
    const profitQuery = `
      INSERT INTO profits (
        user_id, product_id, stock_out_id, quantity_sold, 
        cost_price, selling_price, market_price, 
        total_cost, total_revenue, gross_profit, 
        profit_margin, profit_per_unit, sale_date, notes, created_at
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    const [result] = await connection.execute(profitQuery, [
      user_id, product_id, stock_out_id, quantity_sold,
      cost_price, selling_price, market_price,
      total_cost, total_revenue, gross_profit,
      profit_margin, profit_per_unit, finalSaleDate, notes
    ]);
    
    await connection.commit();
    
    res.status(201).json({
      message: 'Profit record added successfully',
      profit: {
        id: result.insertId,
        product_id,
        product_name: products[0].name,
        stock_out_id,
        quantity_sold,
        cost_price,
        selling_price,
        market_price,
        total_cost,
        total_revenue,
        gross_profit,
        profit_margin: parseFloat(profit_margin),
        profit_per_unit,
        sale_date: finalSaleDate,
        notes
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error in addProfit:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    connection.release();
  }
};

// Get all profit records
const getAllProfits = async (req, res) => {
  try {
    console.log('Get all profits request received');
    console.log('User from auth:', req.user);
    
    const { start_date, end_date, product_id } = req.query;
    const user_id = req.user.id;
    
    let query = `
      SELECT p.*, pr.name as product_name, u.name as user_name
      FROM profits p 
      JOIN products pr ON p.product_id = pr.id 
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ?
    `;
    
    const params = [user_id];
    
    if (start_date && end_date) {
      query += ' AND DATE(p.sale_date) BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }
    
    if (product_id) {
      query += ' AND p.product_id = ?';
      params.push(product_id);
    }
    
    query += ' ORDER BY p.sale_date DESC, p.id DESC';
    
    const [profits] = await pool.execute(query, params);
    
    console.log('Profits retrieved:', profits.length);
    
    res.json({
      message: 'Profit records retrieved successfully',
      profits,
      count: profits.length
    });
  } catch (error) {
    console.error('Error in getAllProfits:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get single profit record
const getProfit = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    
    console.log(`Getting profit with ID: ${id}`);
    
    const query = `
      SELECT p.*, pr.name as product_name, u.name as user_name
      FROM profits p 
      JOIN products pr ON p.product_id = pr.id 
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ? AND p.user_id = ?
    `;
    const [profits] = await pool.execute(query, [id, user_id]);
    
    if (profits.length === 0) {
      return res.status(404).json({ message: 'Profit record not found' });
    }
    
    res.json({
      message: 'Profit record retrieved successfully',
      profit: profits[0]
    });
  } catch (error) {
    console.error('Error in getProfit:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update profit record
const updateProfit = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { 
      product_id, 
      stock_out_id, 
      quantity_sold, 
      cost_price, 
      selling_price, 
      market_price, 
      sale_date,
      notes 
    } = req.body;
    const user_id = req.user.id;
    
    console.log(`Updating profit ID: ${id}`, req.body);
    
    if (!product_id || !quantity_sold || !cost_price || !selling_price || !market_price) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'Product ID, quantity sold, cost price, selling price, and market price are required' 
      });
    }

    if (quantity_sold <= 0 || cost_price <= 0 || selling_price <= 0 || market_price <= 0) {
      await connection.rollback();
      return res.status(400).json({ 
        message: 'All prices and quantity must be positive numbers' 
      });
    }

    // Check if profit record exists and belongs to user
    const existingQuery = 'SELECT * FROM profits WHERE id = ? AND user_id = ?';
    const [existing] = await connection.execute(existingQuery, [id, user_id]);
    
    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Profit record not found' });
    }

    // Check if product exists
    const productQuery = 'SELECT id FROM products WHERE id = ?';
    const [products] = await connection.execute(productQuery, [product_id]);
    
    if (products.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Product not found' });
    }

    // Recalculate profit metrics
    const total_cost = quantity_sold * cost_price;
    const total_revenue = quantity_sold * market_price;
    const gross_profit = total_revenue - total_cost;
    const profit_margin = ((gross_profit / total_revenue) * 100).toFixed(2);
    const profit_per_unit = market_price - cost_price;

    const finalSaleDate = sale_date || existing[0].sale_date;

    // Update profit record
    const updateQuery = `
      UPDATE profits 
      SET product_id = ?, stock_out_id = ?, quantity_sold = ?, 
          cost_price = ?, selling_price = ?, market_price = ?,
          total_cost = ?, total_revenue = ?, gross_profit = ?,
          profit_margin = ?, profit_per_unit = ?, sale_date = ?, 
          notes = ?, updated_at = NOW()
      WHERE id = ? AND user_id = ?
    `;
    const [result] = await connection.execute(updateQuery, [
      product_id, stock_out_id, quantity_sold,
      cost_price, selling_price, market_price,
      total_cost, total_revenue, gross_profit,
      profit_margin, profit_per_unit, finalSaleDate,
      notes, id, user_id
    ]);
    
    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Profit record not found' });
    }
    
    await connection.commit();
    
    res.json({
      message: 'Profit record updated successfully',
      profit: { 
        id, 
        product_id, 
        stock_out_id,
        quantity_sold, 
        cost_price, 
        selling_price,
        market_price,
        total_cost,
        total_revenue,
        gross_profit,
        profit_margin: parseFloat(profit_margin),
        profit_per_unit,
        sale_date: finalSaleDate,
        notes
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error in updateProfit:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    connection.release();
  }
};

// Delete profit record
const deleteProfit = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    
    console.log(`Deleting profit ID: ${id}`);
    
    // Get profit details before deleting
    const getProfitQuery = 'SELECT * FROM profits WHERE id = ? AND user_id = ?';
    const [profits] = await pool.execute(getProfitQuery, [id, user_id]);
    
    if (profits.length === 0) {
      return res.status(404).json({ message: 'Profit record not found' });
    }
    
    const profit = profits[0];
    
    // Delete the profit record
    const deleteQuery = 'DELETE FROM profits WHERE id = ? AND user_id = ?';
    const [result] = await pool.execute(deleteQuery, [id, user_id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Profit record not found' });
    }
    
    res.json({ 
      message: 'Profit record deleted successfully',
      deleted_profit: {
        id: profit.id,
        product_id: profit.product_id,
        quantity_sold: profit.quantity_sold,
        gross_profit: profit.gross_profit,
        sale_date: profit.sale_date
      }
    });
  } catch (error) {
    console.error('Error in deleteProfit:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get profit summary
const getProfitSummary = async (req, res) => {
  try {
    const { start_date, end_date, product_id } = req.query;
    const user_id = req.user.id;
    
    let dateFilter = 'WHERE user_id = ?';
    const queryParams = [user_id];
    
    if (start_date && end_date) {
      dateFilter = 'WHERE user_id = ? AND sale_date BETWEEN ? AND ?';
      queryParams.push(start_date, end_date);
    }
    
    if (product_id) {
      dateFilter += ' AND product_id = ?';
      queryParams.push(product_id);
    }
    
    // Get overall profit summary
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_sales,
        SUM(quantity_sold) as total_quantity_sold,
        SUM(total_cost) as total_cost,
        SUM(total_revenue) as total_revenue,
        SUM(gross_profit) as total_profit,
        AVG(profit_margin) as avg_profit_margin,
        MIN(profit_margin) as min_profit_margin,
        MAX(profit_margin) as max_profit_margin
      FROM profits 
      ${dateFilter}
    `;
    const [summary] = await pool.execute(summaryQuery, queryParams);
    
    // Get top profitable products
    const topProductsQuery = `
      SELECT 
        pr.name as product_name,
        p.product_id,
        COUNT(*) as sales_count,
        SUM(p.quantity_sold) as total_quantity,
        SUM(p.gross_profit) as total_profit,
        AVG(p.profit_margin) as avg_margin
      FROM profits p
      JOIN products pr ON p.product_id = pr.id
      ${dateFilter}
      GROUP BY p.product_id, pr.name
      ORDER BY total_profit DESC
      LIMIT 5
    `;
    const [topProducts] = await pool.execute(topProductsQuery, queryParams);
    
    // Get profit trends by month
    const trendsQuery = `
      SELECT 
        DATE_FORMAT(sale_date, '%Y-%m') as month,
        COUNT(*) as sales_count,
        SUM(gross_profit) as total_profit,
        AVG(profit_margin) as avg_margin
      FROM profits 
      ${dateFilter}
      GROUP BY DATE_FORMAT(sale_date, '%Y-%m')
      ORDER BY month DESC
      LIMIT 12
    `;
    const [trends] = await pool.execute(trendsQuery, queryParams);
    
    res.json({
      message: 'Profit summary retrieved successfully',
      summary: {
        overall: summary[0],
        top_products: topProducts,
        monthly_trends: trends
      },
      filters: { start_date, end_date, product_id }
    });
  } catch (error) {
    console.error('Error in getProfitSummary:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  addProfit,
  getAllProfits,
  getProfit,
  updateProfit,
  deleteProfit,
  getProfitSummary
};
