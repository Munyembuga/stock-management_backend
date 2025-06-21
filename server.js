const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./config/db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Stock Management API' });
});

// Test DB Connection route
app.get('/api/test-connection', async (req, res) => {
  try {
    const [result] = await pool.query('SELECT 1');
    res.json({
      success: true,
      message: 'Database connection successful',
      database: process.env.DB_NAME,
      host: process.env.DB_HOST
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Debug route to list all routes
app.get('/api/debug-routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  res.json({ routes });
});

// Import and use routes with specific error handling
try {
  console.log('Loading auth routes...');
  const authRoutes = require('./routes/authRoutes');
  console.log('Auth routes module loaded');
  
  app.use('/api/auth', authRoutes);
  console.log('Auth routes registered successfully');

  console.log('Loading product routes...');
  const productRoutes = require('./routes/productRoutes');
  console.log('Product routes module loaded');
  
  app.use('/api/products', productRoutes);
  console.log('Product routes registered successfully');

  console.log('Loading purchase routes...');
  const purchaseRoutes = require('./routes/purchaseRoutes');
  console.log('Purchase routes module loaded');
  
  app.use('/api/purchases', purchaseRoutes);
  console.log('Purchase routes registered successfully');

  console.log('Loading stock routes...');
  const stockRoutes = require('./routes/stockRoutes');
  console.log('Stock routes module loaded');
  
  app.use('/api/stock', stockRoutes);
  console.log('Stock routes registered successfully');

  console.log('Loading stock out routes...');
  const stockOutRoutes = require('./routes/stockOutRoutes');
  console.log('Stock out routes module loaded successfully');
  
  app.use('/api/stock-out', stockOutRoutes);
  console.log('Stock out routes registered successfully at /api/stock-out');

  console.log('Loading expense routes...');
  const expenseRoutes = require('./routes/expenseRoutes');
  console.log('Expense routes module loaded successfully');
  
  app.use('/api/expenses', expenseRoutes);
  console.log('Expense routes registered successfully at /api/expenses');

  console.log('Loading report routes...');
  const reportRoutes = require('./routes/reportRoutes');
  console.log('Report routes module loaded successfully');
  
  app.use('/api/reports', reportRoutes);
  console.log('Report routes registered successfully at /api/reports');

} catch (error) {
  console.error('Error in route setup:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}

// Simple 404 handler (no wildcards)
app.use((req, res, next) => {
  console.log('404 handler hit for path:', req.path);
  res.status(404).json({ message: 'Route not found', path: req.path });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error handler:', err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

try {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('All routes registered successfully!');
    console.log('Available routes:');
    console.log('- /api/auth');
    console.log('- /api/products');
    console.log('- /api/stock');
    console.log('- /api/stock-out');
    console.log('- /api/expenses');
    console.log('- /api/reports');
    console.log('\nTo test the API:');
    console.log('1. First run the SQL script to create tables');
    console.log('2. Use /api/test-connection to verify database');
    console.log('3. Use /api/auth/register to create a user');
    console.log('4. Use /api/auth/login to get a token');
  });
} catch (error) {
  console.error('Error starting server:', error);
  process.exit(1);
}