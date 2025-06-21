const express = require('express');
const router = express.Router();

console.log('Report routes file loaded');

try {
  const {
    getDashboardSummary,
    getSalesReport,
    getInventoryReport,
    getProfitLossReport,
    getProductPerformanceReport
  } = require('../controllers/reportController');
  
  const auth = require('../middleware/auth');
  
  console.log('Report controller functions loaded:', {
    getDashboardSummary: typeof getDashboardSummary,
    getSalesReport: typeof getSalesReport,
    getInventoryReport: typeof getInventoryReport,
    getProfitLossReport: typeof getProfitLossReport,
    getProductPerformanceReport: typeof getProductPerformanceReport
  });

  // All routes are protected with authentication
  router.get('/dashboard', auth, getDashboardSummary);
  router.get('/sales', auth, getSalesReport);
  router.get('/inventory', auth, getInventoryReport);
  router.get('/profit-loss', auth, getProfitLossReport);
  router.get('/product-performance', auth, getProductPerformanceReport);

  console.log('Report routes defined successfully');

} catch (error) {
  console.error('Error in report routes:', error);
  throw error;
}

module.exports = router;
