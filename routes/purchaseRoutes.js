const express = require('express');
const router = express.Router();

console.log('Purchase routes file loaded');

try {
  const {
    addPurchase,
    getAllPurchases,
    getPurchase,
    updatePurchase,
    deletePurchase,
    getPurchaseSummary
  } = require('../controllers/purchaseController');
  
  const auth = require('../middleware/auth');
  
  console.log('Purchase controller functions loaded:', {
    addPurchase: typeof addPurchase,
    getAllPurchases: typeof getAllPurchases,
    getPurchase: typeof getPurchase,
    updatePurchase: typeof updatePurchase,
    deletePurchase: typeof deletePurchase,
    getPurchaseSummary: typeof getPurchaseSummary
  });

  // All routes are protected with authentication
  router.post('/', auth, addPurchase);
  router.get('/', auth, getAllPurchases);
  router.get('/summary', auth, getPurchaseSummary);
  router.get('/:id', auth, getPurchase);
  router.put('/:id', auth, updatePurchase);
  router.delete('/:id', auth, deletePurchase);

  console.log('Purchase routes defined successfully');

} catch (error) {
  console.error('Error in purchase routes:', error);
  throw error;
}

module.exports = router;