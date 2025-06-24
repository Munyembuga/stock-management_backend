const express = require('express');
const router = express.Router();

console.log('Capital routes file loaded');

try {
  const {
    addCapitalInvestment,
    getAllCapitalInvestments,
    getUserCapitalInvestments,
    getCapitalInvestment,
    updateCapitalInvestment,
    deleteCapitalInvestment,
    getCapitalInvestmentSummary
  } = require('../controllers/capitalController');
  
  const auth = require('../middleware/auth');
  
  console.log('Capital controller functions loaded:', {
    addCapitalInvestment: typeof addCapitalInvestment,
    getAllCapitalInvestments: typeof getAllCapitalInvestments,
    getUserCapitalInvestments: typeof getUserCapitalInvestments,
    getCapitalInvestment: typeof getCapitalInvestment,
    updateCapitalInvestment: typeof updateCapitalInvestment,
    deleteCapitalInvestment: typeof deleteCapitalInvestment,
    getCapitalInvestmentSummary: typeof getCapitalInvestmentSummary
  });

  // All routes are protected with authentication
  router.post('/', auth, addCapitalInvestment);
  router.get('/', auth, getAllCapitalInvestments);
  router.get('/my-investments', auth, getUserCapitalInvestments);
  router.get('/summary', auth, getCapitalInvestmentSummary);
  router.get('/:id', auth, getCapitalInvestment);
  router.put('/:id', auth, updateCapitalInvestment);
  router.delete('/:id', auth, deleteCapitalInvestment);

  console.log('Capital routes defined successfully');

} catch (error) {
  console.error('Error in capital routes:', error);
  throw error;
}

module.exports = router;
