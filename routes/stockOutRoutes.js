const express = require('express');
const router = express.Router();

console.log('Stock out routes file loaded');

try {
  const {
    addStockOut,
    getAllStockOut,
    getStockOut,
    updateStockOut,
    deleteStockOut,
    getStockSummary
  } = require('../controllers/stockOutController');
  
  const auth = require('../middleware/auth');
  
  console.log('Stock out controller functions loaded:', {
    addStockOut: typeof addStockOut,
    getAllStockOut: typeof getAllStockOut,
    getStockOut: typeof getStockOut,
    updateStockOut: typeof updateStockOut,
    deleteStockOut: typeof deleteStockOut,
    getStockSummary: typeof getStockSummary
  });

  // All routes are protected
  router.post('/', auth, addStockOut);
  router.get('/', auth, getAllStockOut);
  router.get('/:id', auth, getStockOut);
  router.put('/:id', auth, updateStockOut);
  router.delete('/:id', auth, deleteStockOut);
  router.get('/summary/:product_id', auth, getStockSummary);

  console.log('Stock out routes defined successfully');

} catch (error) {
  console.error('Error in stock out routes:', error);
  throw error;
}

module.exports = router;
