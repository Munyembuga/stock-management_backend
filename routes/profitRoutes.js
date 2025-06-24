const express = require('express');
const router = express.Router();

console.log('Profit routes file loaded');

try {
  const {
    addProfit,
    getAllProfits,
    getProfit,
    updateProfit,
    deleteProfit,
    getProfitSummary
  } = require('../controllers/profitController');
  
  const auth = require('../middleware/auth');
  
  console.log('Profit controller functions loaded:', {
    addProfit: typeof addProfit,
    getAllProfits: typeof getAllProfits,
    getProfit: typeof getProfit,
    updateProfit: typeof updateProfit,
    deleteProfit: typeof deleteProfit,
    getProfitSummary: typeof getProfitSummary
  });

  // All routes are protected with authentication
  router.post('/', auth, addProfit);
  router.get('/', auth, getAllProfits);
  router.get('/summary', auth, getProfitSummary);
  router.get('/:id', auth, getProfit);
  router.put('/:id', auth, updateProfit);
  router.delete('/:id', auth, deleteProfit);

  console.log('Profit routes defined successfully');

} catch (error) {
  console.error('Error in profit routes:', error);
  throw error;
}

module.exports = router;
