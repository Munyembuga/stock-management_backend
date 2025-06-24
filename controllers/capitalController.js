const pool = require('../config/db');

// Add new capital investment
const addCapitalInvestment = async (req, res) => {
  try {
    console.log('Add capital investment request received:', req.body);
    console.log('User from auth:', req.user);
    
    const { amount, investment_date, notes, investment_type } = req.body;
    const user_id = req.user.id; // Get user ID from auth middleware
    
    // Validation
    if (!amount) {
      return res.status(400).json({ 
        message: 'Investment amount is required' 
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ 
        message: 'Investment amount must be greater than 0' 
      });
    }

    // Set default investment date to today if not provided
    const finalInvestmentDate = investment_date || new Date().toISOString().split('T')[0];
    
    // Set default investment type if not provided
    const finalInvestmentType = investment_type || 'cash';

    // Insert capital investment record
    const query = `
      INSERT INTO capital_investments (user_id, amount, investment_date, notes, investment_type, created_at) 
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    const [result] = await pool.execute(query, [
      user_id, 
      amount, 
      finalInvestmentDate, 
      notes || null,
      finalInvestmentType
    ]);
    
    res.status(201).json({
      message: 'Capital investment recorded successfully',
      investment: {
        id: result.insertId,
        user_id,
        amount,
        investment_date: finalInvestmentDate,
        investment_type: finalInvestmentType,
        notes
      }
    });
  } catch (error) {
    console.error('Error in addCapitalInvestment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all capital investments
const getAllCapitalInvestments = async (req, res) => {
  try {
    console.log('Get all capital investments request received');
    console.log('User from auth:', req.user);
    
    const { start_date, end_date, investment_type, user_id } = req.query;
    
    let query = `
      SELECT ci.*, u.name as investor_name, u.phone as investor_phone
      FROM capital_investments ci 
      JOIN users u ON ci.user_id = u.id
      WHERE 1=1
    `;
    
    const conditions = [];
    const params = [];
    
    // Filter by date range
    if (start_date && end_date) {
      conditions.push('DATE(ci.investment_date) BETWEEN ? AND ?');
      params.push(start_date, end_date);
    }
    
    // Filter by investment type
    if (investment_type) {
      conditions.push('ci.investment_type = ?');
      params.push(investment_type);
    }
    
    // Filter by specific user (for admin view)
    if (user_id) {
      conditions.push('ci.user_id = ?');
      params.push(user_id);
    }
    
    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY ci.investment_date DESC, ci.id DESC';
    
    const [investments] = await pool.execute(query, params);
    
    console.log('Capital investments retrieved:', investments.length);
    
    res.json({
      message: 'Capital investments retrieved successfully',
      investments,
      count: investments.length
    });
  } catch (error) {
    console.error('Error in getAllCapitalInvestments:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get user's own capital investments
const getUserCapitalInvestments = async (req, res) => {
  try {
    console.log('Get user capital investments request received');
    console.log('User from auth:', req.user);
    
    const { start_date, end_date, investment_type } = req.query;
    const user_id = req.user.id;
    
    let query = `
      SELECT ci.*, u.name as investor_name
      FROM capital_investments ci 
      JOIN users u ON ci.user_id = u.id
      WHERE ci.user_id = ?
    `;
    
    const params = [user_id];
    
    // Filter by date range
    if (start_date && end_date) {
      query += ' AND DATE(ci.investment_date) BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }
    
    // Filter by investment type
    if (investment_type) {
      query += ' AND ci.investment_type = ?';
      params.push(investment_type);
    }
    
    query += ' ORDER BY ci.investment_date DESC, ci.id DESC';
    
    const [investments] = await pool.execute(query, params);
    
    // Calculate user's total investment
    const totalQuery = `
      SELECT 
        SUM(amount) as total_investment,
        COUNT(*) as total_transactions
      FROM capital_investments 
      WHERE user_id = ?
    `;
    const [totalResult] = await pool.execute(totalQuery, [user_id]);
    
    res.json({
      message: 'User capital investments retrieved successfully',
      investments,
      summary: {
        total_investment: totalResult[0].total_investment || 0,
        total_transactions: totalResult[0].total_transactions || 0
      },
      count: investments.length
    });
  } catch (error) {
    console.error('Error in getUserCapitalInvestments:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get single capital investment
const getCapitalInvestment = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    
    console.log(`Getting capital investment with ID: ${id}`);
    
    const query = `
      SELECT ci.*, u.name as investor_name, u.phone as investor_phone
      FROM capital_investments ci 
      JOIN users u ON ci.user_id = u.id
      WHERE ci.id = ? AND ci.user_id = ?
    `;
    const [investments] = await pool.execute(query, [id, user_id]);
    
    if (investments.length === 0) {
      return res.status(404).json({ message: 'Capital investment not found' });
    }
    
    res.json({
      message: 'Capital investment retrieved successfully',
      investment: investments[0]
    });
  } catch (error) {
    console.error('Error in getCapitalInvestment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update capital investment
const updateCapitalInvestment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, investment_date, notes, investment_type } = req.body;
    const user_id = req.user.id;
    
    console.log(`Updating capital investment ID: ${id}`, req.body);
    
    if (!amount) {
      return res.status(400).json({ 
        message: 'Investment amount is required' 
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ 
        message: 'Investment amount must be greater than 0' 
      });
    }

    // Check if investment exists and belongs to user
    const existingQuery = 'SELECT * FROM capital_investments WHERE id = ? AND user_id = ?';
    const [existing] = await pool.execute(existingQuery, [id, user_id]);
    
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Capital investment not found' });
    }

    const finalInvestmentDate = investment_date || existing[0].investment_date;
    const finalInvestmentType = investment_type || existing[0].investment_type;

    // Update capital investment record
    const updateQuery = `
      UPDATE capital_investments 
      SET amount = ?, investment_date = ?, notes = ?, investment_type = ?, updated_at = NOW()
      WHERE id = ? AND user_id = ?
    `;
    const [result] = await pool.execute(updateQuery, [
      amount, 
      finalInvestmentDate, 
      notes, 
      finalInvestmentType, 
      id, 
      user_id
    ]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Capital investment not found' });
    }
    
    res.json({
      message: 'Capital investment updated successfully',
      investment: { 
        id, 
        amount, 
        investment_date: finalInvestmentDate,
        investment_type: finalInvestmentType,
        notes
      }
    });
  } catch (error) {
    console.error('Error in updateCapitalInvestment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete capital investment
const deleteCapitalInvestment = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    
    console.log(`Deleting capital investment ID: ${id}`);
    
    // Get investment details before deleting
    const getInvestmentQuery = 'SELECT * FROM capital_investments WHERE id = ? AND user_id = ?';
    const [investments] = await pool.execute(getInvestmentQuery, [id, user_id]);
    
    if (investments.length === 0) {
      return res.status(404).json({ message: 'Capital investment not found' });
    }
    
    const investment = investments[0];
    
    // Delete the investment record
    const deleteQuery = 'DELETE FROM capital_investments WHERE id = ? AND user_id = ?';
    const [result] = await pool.execute(deleteQuery, [id, user_id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Capital investment not found' });
    }
    
    res.json({ 
      message: 'Capital investment deleted successfully',
      deleted_investment: {
        id: investment.id,
        amount: investment.amount,
        investment_date: investment.investment_date,
        investment_type: investment.investment_type
      }
    });
  } catch (error) {
    console.error('Error in deleteCapitalInvestment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get capital investment summary
const getCapitalInvestmentSummary = async (req, res) => {
  try {
    const { start_date, end_date, user_id } = req.query;
    
    let dateFilter = 'WHERE 1=1';
    const queryParams = [];
    
    if (start_date && end_date) {
      dateFilter = 'WHERE investment_date BETWEEN ? AND ?';
      queryParams.push(start_date, end_date);
    }
    
    if (user_id) {
      dateFilter += queryParams.length > 0 ? ' AND user_id = ?' : ' AND user_id = ?';
      queryParams.push(user_id);
    }
    
    // Get overall investment summary
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_investments,
        SUM(amount) as total_capital,
        AVG(amount) as avg_investment,
        MIN(amount) as min_investment,
        MAX(amount) as max_investment,
        COUNT(DISTINCT user_id) as unique_investors
      FROM capital_investments 
      ${dateFilter}
    `;
    const [summary] = await pool.execute(summaryQuery, queryParams);
    
    // Get investments by type
    const typeQuery = `
      SELECT 
        investment_type,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM capital_investments 
      ${dateFilter}
      GROUP BY investment_type
      ORDER BY total_amount DESC
    `;
    const [byType] = await pool.execute(typeQuery, queryParams);
    
    // Get top investors
    const topInvestorsQuery = `
      SELECT 
        u.name as investor_name,
        ci.user_id,
        COUNT(*) as investment_count,
        SUM(ci.amount) as total_invested,
        AVG(ci.amount) as avg_investment
      FROM capital_investments ci
      JOIN users u ON ci.user_id = u.id
      ${dateFilter}
      GROUP BY ci.user_id, u.name
      ORDER BY total_invested DESC
      LIMIT 10
    `;
    const [topInvestors] = await pool.execute(topInvestorsQuery, queryParams);
    
    // Get monthly investment trends
    const trendsQuery = `
      SELECT 
        DATE_FORMAT(investment_date, '%Y-%m') as month,
        COUNT(*) as investment_count,
        SUM(amount) as total_amount
      FROM capital_investments 
      ${dateFilter}
      GROUP BY DATE_FORMAT(investment_date, '%Y-%m')
      ORDER BY month DESC
      LIMIT 12
    `;
    const [trends] = await pool.execute(trendsQuery, queryParams);
    
    res.json({
      message: 'Capital investment summary retrieved successfully',
      summary: {
        overall: summary[0],
        by_type: byType,
        top_investors: topInvestors,
        monthly_trends: trends
      },
      filters: { start_date, end_date, user_id }
    });
  } catch (error) {
    console.error('Error in getCapitalInvestmentSummary:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  addCapitalInvestment,
  getAllCapitalInvestments,
  getUserCapitalInvestments,
  getCapitalInvestment,
  updateCapitalInvestment,
  deleteCapitalInvestment,
  getCapitalInvestmentSummary
};
