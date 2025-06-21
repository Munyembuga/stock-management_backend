const pool = require('../config/db');

// Add new expense
const addExpense = async (req, res) => {
  try {
    console.log('Add expense request received:', req.body);
    console.log('User from auth:', req.user);
    
    const { 
      expense_type, 
      product_id, 
      category, 
      description, 
      amount, 
      expense_date 
    } = req.body;
    const user_id = req.user.id; // Get user ID from auth middleware
    
    // Validation
    if (!expense_type || !category || !description || !amount) {
      return res.status(400).json({ 
        message: 'Expense type, category, description, and amount are required' 
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ 
        message: 'Amount must be greater than 0' 
      });
    }

    // Validate expense_type
    if (!['specific', 'general'].includes(expense_type)) {
      return res.status(400).json({ 
        message: 'Expense type must be either "specific" or "general"' 
      });
    }

    // If specific expense, product_id is required
    if (expense_type === 'specific' && !product_id) {
      return res.status(400).json({ 
        message: 'Product ID is required for specific expenses' 
      });
    }

    // If specific expense, check if product exists
    if (expense_type === 'specific') {
      const productQuery = 'SELECT id, name FROM products WHERE id = ?';
      const [products] = await pool.execute(productQuery, [product_id]);
      
      if (products.length === 0) {
        return res.status(404).json({ message: 'Product not found' });
      }
    }

    const finalExpenseDate = expense_date || new Date().toISOString().split('T')[0];

    const query = `
      INSERT INTO expenses (user_id, expense_type, product_id, category, description, amount, expense_date, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    const [result] = await pool.execute(query, [
      user_id,
      expense_type, 
      expense_type === 'specific' ? product_id : null, 
      category, 
      description, 
      amount, 
      finalExpenseDate
    ]);
    
    res.status(201).json({
      message: 'Expense added successfully',
      expense: {
        id: result.insertId,
        user_id,
        expense_type,
        product_id: expense_type === 'specific' ? product_id : null,
        category,
        description,
        amount,
        expense_date: finalExpenseDate
      }
    });
  } catch (error) {
    console.error('Error in addExpense:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all expenses
const getAllExpenses = async (req, res) => {
  try {
    console.log('Get all expenses request received');
    console.log('User from auth:', req.user);
    
    const { expense_type, category, start_date, end_date } = req.query;
    const user_id = req.user.id;
    
    let query = `
      SELECT e.*, p.name as product_name, u.name as user_name
      FROM expenses e 
      LEFT JOIN products p ON e.product_id = p.id 
      JOIN users u ON e.user_id = u.id
      WHERE e.user_id = ?
    `;
    const queryParams = [user_id];
    
    // Add filters
    if (expense_type) {
      query += ' AND e.expense_type = ?';
      queryParams.push(expense_type);
    }
    
    if (category) {
      query += ' AND e.category = ?';
      queryParams.push(category);
    }
    
    if (start_date) {
      query += ' AND e.expense_date >= ?';
      queryParams.push(start_date);
    }
    
    if (end_date) {
      query += ' AND e.expense_date <= ?';
      queryParams.push(end_date);
    }
    
    query += ' ORDER BY e.expense_date DESC, e.id DESC';
    
    const [expenses] = await pool.execute(query, queryParams);
    
    console.log('Expenses retrieved:', expenses.length);
    
    res.json({
      message: 'Expenses retrieved successfully',
      expenses,
      count: expenses.length,
      filters: { expense_type, category, start_date, end_date }
    });
  } catch (error) {
    console.error('Error in getAllExpenses:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get single expense
const getExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    
    const query = `
      SELECT e.*, p.name as product_name, u.name as user_name
      FROM expenses e 
      LEFT JOIN products p ON e.product_id = p.id 
      JOIN users u ON e.user_id = u.id
      WHERE e.id = ? AND e.user_id = ?
    `;
    const [expenses] = await pool.execute(query, [id, user_id]);
    
    if (expenses.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    res.json({
      message: 'Expense retrieved successfully',
      expense: expenses[0]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update expense
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      expense_type, 
      product_id, 
      category, 
      description, 
      amount, 
      expense_date 
    } = req.body;
    const user_id = req.user.id;
    
    if (!expense_type || !category || !description || !amount) {
      return res.status(400).json({ 
        message: 'Expense type, category, description, and amount are required' 
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ 
        message: 'Amount must be greater than 0' 
      });
    }

    if (!['specific', 'general'].includes(expense_type)) {
      return res.status(400).json({ 
        message: 'Expense type must be either "specific" or "general"' 
      });
    }

    if (expense_type === 'specific' && !product_id) {
      return res.status(400).json({ 
        message: 'Product ID is required for specific expenses' 
      });
    }

    // Check if expense exists and belongs to user
    const existingQuery = 'SELECT * FROM expenses WHERE id = ? AND user_id = ?';
    const [existing] = await pool.execute(existingQuery, [id, user_id]);
    
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // If specific expense, check if product exists
    if (expense_type === 'specific') {
      const productQuery = 'SELECT id FROM products WHERE id = ?';
      const [products] = await pool.execute(productQuery, [product_id]);
      
      if (products.length === 0) {
        return res.status(404).json({ message: 'Product not found' });
      }
    }

    const finalExpenseDate = expense_date || existing[0].expense_date;

    const query = `
      UPDATE expenses 
      SET expense_type = ?, product_id = ?, category = ?, description = ?, amount = ?, expense_date = ? 
      WHERE id = ? AND user_id = ?
    `;
    const [result] = await pool.execute(query, [
      expense_type, 
      expense_type === 'specific' ? product_id : null, 
      category, 
      description, 
      amount, 
      finalExpenseDate, 
      id,
      user_id
    ]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    res.json({
      message: 'Expense updated successfully',
      expense: { 
        id, 
        expense_type, 
        product_id: expense_type === 'specific' ? product_id : null, 
        category, 
        description, 
        amount, 
        expense_date: finalExpenseDate 
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete expense
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    
    const query = 'DELETE FROM expenses WHERE id = ? AND user_id = ?';
    const [result] = await pool.execute(query, [id, user_id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get expense summary
const getExpenseSummary = async (req, res) => {
  try {
    const { start_date, end_date, product_id } = req.query;
    const user_id = req.user.id;
    
    let dateFilter = 'WHERE user_id = ?';
    const queryParams = [user_id];
    
    if (start_date && end_date) {
      dateFilter = 'WHERE user_id = ? AND expense_date BETWEEN ? AND ?';
      queryParams.push(start_date, end_date);
    } else if (start_date) {
      dateFilter = 'WHERE user_id = ? AND expense_date >= ?';
      queryParams.push(start_date);
    } else if (end_date) {
      dateFilter = 'WHERE user_id = ? AND expense_date <= ?';
      queryParams.push(end_date);
    }
    
    // Get total expenses by type
    const totalQuery = `
      SELECT 
        expense_type,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM expenses 
      ${dateFilter}
      GROUP BY expense_type
    `;
    const [totals] = await pool.execute(totalQuery, queryParams);
    
    // Get expenses by category
    const categoryQuery = `
      SELECT 
        category,
        expense_type,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM expenses 
      ${dateFilter}
      GROUP BY category, expense_type
      ORDER BY total_amount DESC
    `;
    const [categories] = await pool.execute(categoryQuery, queryParams);
    
    // If product_id specified, get specific product expenses
    let productExpenses = null;
    if (product_id) {
      const productParams = [...queryParams, product_id];
      const productFilter = dateFilter + ' AND product_id = ?';
      
      const productQuery = `
        SELECT 
          SUM(amount) as total_amount,
          COUNT(*) as count
        FROM expenses 
        ${productFilter}
      `;
      const [productResult] = await pool.execute(productQuery, productParams);
      productExpenses = productResult[0];
    }
    
    res.json({
      message: 'Expense summary retrieved successfully',
      summary: {
        totals,
        by_category: categories,
        product_expenses: productExpenses,
        period: { start_date, end_date }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  addExpense,
  getAllExpenses,
  getExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary
};
