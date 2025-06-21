const pool = require('../config/db');

// Dashboard Summary Report
const getDashboardSummary = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let dateFilter = '';
    const queryParams = [];
    
    if (start_date && end_date) {
      dateFilter = 'WHERE DATE(created_at) BETWEEN ? AND ?';
      queryParams.push(start_date, end_date);
    }

    // Get total products
    const [productCount] = await pool.execute('SELECT COUNT(*) as total_products FROM products');
    
    // Get total stock value
    const [stockValue] = await pool.execute(`
      SELECT 
        COUNT(*) as total_stock_entries,
        SUM(quantity) as total_quantity,
        SUM(quantity * cost_price) as total_stock_value,
        SUM(quantity * selling_price) as potential_revenue
      FROM stock
    `);
    
    // Get sales summary
    const salesQuery = `
      SELECT 
        COUNT(*) as total_sales,
        SUM(quantity) as total_quantity_sold,
        SUM(total_amount) as total_sales_amount
      FROM stock_out 
      ${dateFilter}
    `;
    const [salesSummary] = await pool.execute(salesQuery, queryParams);
    
    // Get expense summary
    const expenseQuery = `
      SELECT 
        COUNT(*) as total_expenses,
        SUM(amount) as total_expense_amount
      FROM expenses 
      ${dateFilter}
    `;
    const [expenseSummary] = await pool.execute(expenseQuery, queryParams);
    
    // Calculate profit (sales - expenses - cost of goods sold)
    const salesAmount = salesSummary[0].total_sales_amount || 0;
    const expenseAmount = expenseSummary[0].total_expense_amount || 0;
    
    // Get cost of goods sold
    const [cogsSummary] = await pool.execute(`
      SELECT SUM(so.quantity * s.cost_price) as total_cogs
      FROM stock_out so
      JOIN stock s ON so.product_id = s.product_id
      ${dateFilter.replace('created_at', 'so.created_at')}
    `, queryParams);
    
    const totalCogs = cogsSummary[0].total_cogs || 0;
    const grossProfit = salesAmount - totalCogs;
    const netProfit = grossProfit - expenseAmount;

    res.json({
      message: 'Dashboard summary retrieved successfully',
      summary: {
        products: productCount[0],
        stock: stockValue[0],
        sales: salesSummary[0],
        expenses: expenseSummary[0],
        profitability: {
          gross_profit: grossProfit,
          net_profit: netProfit,
          profit_margin: salesAmount > 0 ? ((netProfit / salesAmount) * 100).toFixed(2) : 0
        },
        period: { start_date, end_date }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Sales Report
const getSalesReport = async (req, res) => {
  try {
    const { start_date, end_date, product_id, group_by = 'day' } = req.query;
    
    let dateFilter = '';
    const queryParams = [];
    
    if (start_date && end_date) {
      dateFilter = 'WHERE DATE(so.created_at) BETWEEN ? AND ?';
      queryParams.push(start_date, end_date);
    }
    
    if (product_id) {
      dateFilter += dateFilter ? ' AND so.product_id = ?' : 'WHERE so.product_id = ?';
      queryParams.push(product_id);
    }

    // Sales by period
    let groupByClause;
    switch (group_by) {
      case 'month':
        groupByClause = 'DATE_FORMAT(so.created_at, "%Y-%m")';
        break;
      case 'week':
        groupByClause = 'YEARWEEK(so.created_at)';
        break;
      default:
        groupByClause = 'DATE(so.created_at)';
    }

    const salesByPeriodQuery = `
      SELECT 
        ${groupByClause} as period,
        COUNT(*) as total_transactions,
        SUM(so.quantity) as total_quantity,
        SUM(so.total_amount) as total_sales,
        AVG(so.total_amount) as avg_sale_amount
      FROM stock_out so
      ${dateFilter}
      GROUP BY ${groupByClause}
      ORDER BY period DESC
    `;
    const [salesByPeriod] = await pool.execute(salesByPeriodQuery, queryParams);

    // Top selling products
    const topProductsQuery = `
      SELECT 
        p.name as product_name,
        so.product_id,
        COUNT(*) as total_transactions,
        SUM(so.quantity) as total_quantity_sold,
        SUM(so.total_amount) as total_sales_amount,
        AVG(so.selling_price) as avg_selling_price
      FROM stock_out so
      JOIN products p ON so.product_id = p.id
      ${dateFilter}
      GROUP BY so.product_id, p.name
      ORDER BY total_sales_amount DESC
      LIMIT 10
    `;
    const [topProducts] = await pool.execute(topProductsQuery, queryParams);

    res.json({
      message: 'Sales report retrieved successfully',
      report: {
        sales_by_period: salesByPeriod,
        top_selling_products: topProducts,
        filters: { start_date, end_date, product_id, group_by }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Inventory Report
const getInventoryReport = async (req, res) => {
  try {
    const { low_stock_threshold = 10 } = req.query;

    // Current stock levels for all products
    const stockLevelsQuery = `
      SELECT 
        p.id as product_id,
        p.name as product_name,
        COALESCE(stock_in.total_in, 0) as total_stock_in,
        COALESCE(stock_out.total_out, 0) as total_stock_out,
        COALESCE(stock_in.total_in, 0) - COALESCE(stock_out.total_out, 0) as current_stock,
        COALESCE(stock_in.avg_cost_price, 0) as avg_cost_price,
        COALESCE(stock_in.avg_selling_price, 0) as avg_selling_price,
        COALESCE(stock_in.total_value, 0) as total_stock_value
      FROM products p
      LEFT JOIN (
        SELECT 
          product_id, 
          SUM(quantity) as total_in,
          AVG(cost_price) as avg_cost_price,
          AVG(selling_price) as avg_selling_price,
          SUM(quantity * cost_price) as total_value
        FROM stock 
        GROUP BY product_id
      ) stock_in ON p.id = stock_in.product_id
      LEFT JOIN (
        SELECT product_id, SUM(quantity) as total_out
        FROM stock_out 
        GROUP BY product_id
      ) stock_out ON p.id = stock_out.product_id
      ORDER BY current_stock ASC
    `;
    const [stockLevels] = await pool.execute(stockLevelsQuery);

    // Low stock products
    const lowStockProducts = stockLevels.filter(item => 
      item.current_stock <= parseInt(low_stock_threshold) && item.current_stock >= 0
    );

    // Out of stock products
    const outOfStockProducts = stockLevels.filter(item => item.current_stock <= 0);

    // Overstocked products (more than 100 units)
    const overstockedProducts = stockLevels.filter(item => item.current_stock > 100);

    // Stock value summary
    const totalStockValue = stockLevels.reduce((sum, item) => 
      sum + (item.current_stock * item.avg_cost_price), 0
    );

    res.json({
      message: 'Inventory report retrieved successfully',
      report: {
        all_products: stockLevels,
        low_stock_products: lowStockProducts,
        out_of_stock_products: outOfStockProducts,
        overstocked_products: overstockedProducts,
        summary: {
          total_products: stockLevels.length,
          low_stock_count: lowStockProducts.length,
          out_of_stock_count: outOfStockProducts.length,
          total_stock_value: totalStockValue.toFixed(2),
          low_stock_threshold: parseInt(low_stock_threshold)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Profit & Loss Report
const getProfitLossReport = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let dateFilter = '';
    const queryParams = [];
    
    if (start_date && end_date) {
      dateFilter = 'WHERE DATE(created_at) BETWEEN ? AND ?';
      queryParams.push(start_date, end_date);
    }

    // Revenue (Sales)
    const revenueQuery = `
      SELECT 
        SUM(total_amount) as total_revenue,
        COUNT(*) as total_transactions
      FROM stock_out 
      ${dateFilter}
    `;
    const [revenue] = await pool.execute(revenueQuery, queryParams);

    // Cost of Goods Sold
    const cogsQuery = `
      SELECT SUM(so.quantity * s.cost_price) as total_cogs
      FROM stock_out so
      JOIN stock s ON so.product_id = s.product_id
      ${dateFilter.replace('created_at', 'so.created_at')}
    `;
    const [cogs] = await pool.execute(cogsQuery, queryParams);

    // Operating Expenses by Category
    const expensesQuery = `
      SELECT 
        category,
        expense_type,
        SUM(amount) as total_amount,
        COUNT(*) as count
      FROM expenses 
      ${dateFilter.replace('created_at', 'expense_date')}
      GROUP BY category, expense_type
      ORDER BY total_amount DESC
    `;
    const [expensesByCategory] = await pool.execute(expensesQuery, 
      start_date && end_date ? [start_date, end_date] : []
    );

    // Calculate totals
    const totalRevenue = revenue[0].total_revenue || 0;
    const totalCogs = cogs[0].total_cogs || 0;
    const grossProfit = totalRevenue - totalCogs;
    
    const totalExpenses = expensesByCategory.reduce((sum, exp) => sum + exp.total_amount, 0);
    const netProfit = grossProfit - totalExpenses;
    
    const grossMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100) : 0;
    const netMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0;

    res.json({
      message: 'Profit & Loss report retrieved successfully',
      report: {
        revenue: {
          total_revenue: totalRevenue,
          total_transactions: revenue[0].total_transactions
        },
        cost_of_goods_sold: totalCogs,
        gross_profit: grossProfit,
        operating_expenses: {
          by_category: expensesByCategory,
          total_expenses: totalExpenses
        },
        net_profit: netProfit,
        margins: {
          gross_margin: parseFloat(grossMargin.toFixed(2)),
          net_margin: parseFloat(netMargin.toFixed(2))
        },
        period: { start_date, end_date }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Product Performance Report
const getProductPerformanceReport = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let dateFilter = '';
    const queryParams = [];
    
    if (start_date && end_date) {
      dateFilter = 'WHERE DATE(so.created_at) BETWEEN ? AND ?';
      queryParams.push(start_date, end_date);
    }

    const performanceQuery = `
      SELECT 
        p.id as product_id,
        p.name as product_name,
        COUNT(so.id) as total_sales_transactions,
        SUM(so.quantity) as total_quantity_sold,
        SUM(so.total_amount) as total_sales_revenue,
        AVG(so.selling_price) as avg_selling_price,
        MIN(so.selling_price) as min_selling_price,
        MAX(so.selling_price) as max_selling_price,
        -- Current stock calculation
        COALESCE(stock_in.total_in, 0) - COALESCE(all_sales.total_out, 0) as current_stock,
        -- Profitability
        SUM(so.total_amount) - SUM(so.quantity * s.cost_price) as total_profit,
        -- Stock turnover
        CASE 
          WHEN COALESCE(stock_in.total_in, 0) > 0 
          THEN COALESCE(all_sales.total_out, 0) / COALESCE(stock_in.total_in, 1)
          ELSE 0 
        END as stock_turnover_ratio
      FROM products p
      LEFT JOIN stock_out so ON p.id = so.product_id ${dateFilter.replace('WHERE', 'AND')}
      LEFT JOIN stock s ON p.id = s.product_id
      LEFT JOIN (
        SELECT product_id, SUM(quantity) as total_in
        FROM stock GROUP BY product_id
      ) stock_in ON p.id = stock_in.product_id
      LEFT JOIN (
        SELECT product_id, SUM(quantity) as total_out
        FROM stock_out GROUP BY product_id
      ) all_sales ON p.id = all_sales.product_id
      GROUP BY p.id, p.name, stock_in.total_in, all_sales.total_out
      ORDER BY total_sales_revenue DESC
    `;
    
    const [performance] = await pool.execute(performanceQuery, queryParams);

    // Calculate additional metrics
    const enhancedPerformance = performance.map(product => ({
      ...product,
      profit_margin: product.total_sales_revenue > 0 ? 
        ((product.total_profit / product.total_sales_revenue) * 100).toFixed(2) : 0,
      avg_sale_size: product.total_sales_transactions > 0 ? 
        (product.total_quantity_sold / product.total_sales_transactions).toFixed(2) : 0,
      performance_status: product.total_quantity_sold > 50 ? 'High' : 
                         product.total_quantity_sold > 20 ? 'Medium' : 'Low'
    }));

    res.json({
      message: 'Product performance report retrieved successfully',
      report: {
        products: enhancedPerformance,
        summary: {
          total_products_analyzed: enhancedPerformance.length,
          high_performers: enhancedPerformance.filter(p => p.performance_status === 'High').length,
          medium_performers: enhancedPerformance.filter(p => p.performance_status === 'Medium').length,
          low_performers: enhancedPerformance.filter(p => p.performance_status === 'Low').length
        },
        period: { start_date, end_date }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getDashboardSummary,
  getSalesReport,
  getInventoryReport,
  getProfitLossReport,
  getProductPerformanceReport
};
