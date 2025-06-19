const express = require('express');
const router = express.Router();

console.log('Expense routes file loaded');

try {
  const {
    addExpense,
    getAllExpenses,
    getExpense,
    updateExpense,
    deleteExpense,
    getExpenseSummary
  } = require('../controllers/expenseController');
  
  const auth = require('../middleware/auth');
  
  console.log('Expense controller functions loaded:', {
    addExpense: typeof addExpense,
    getAllExpenses: typeof getAllExpenses,
    getExpense: typeof getExpense,
    updateExpense: typeof updateExpense,
    deleteExpense: typeof deleteExpense,
    getExpenseSummary: typeof getExpenseSummary
  });

  // All routes are protected
  router.post('/', auth, addExpense);
  router.get('/', auth, getAllExpenses);
  router.get('/summary', auth, getExpenseSummary);
  router.get('/:id', auth, getExpense);
  router.put('/:id', auth, updateExpense);
  router.delete('/:id', auth, deleteExpense);

  console.log('Expense routes defined successfully');

} catch (error) {
  console.error('Error in expense routes:', error);
  throw error;
}

module.exports = router;
