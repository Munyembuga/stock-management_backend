const express = require('express');
const router = express.Router();
const {
  adjustStock,
  getAllStock,
  getStock,
  updateStock,
  deleteStock
} = require('../controllers/stockController');
const auth = require('../middleware/auth');

// All routes are protected
router.post('/adjust', auth, adjustStock); // Manual stock adjustments
router.get('/', auth, getAllStock);
router.get('/:id', auth, getStock);
router.put('/:id', auth, updateStock);
router.delete('/:id', auth, deleteStock);

module.exports = router;
