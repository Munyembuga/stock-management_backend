const express = require('express');
const router = express.Router();
const {
  addProduct,
  getAllProducts,
  getProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');
const auth = require('../middleware/auth');

// All routes are protected
router.post('/', auth, addProduct);
router.get('/', auth, getAllProducts);
router.get('/:id', auth, getProduct);
router.put('/:id', auth, updateProduct);
router.delete('/:id', auth, deleteProduct);

module.exports = router;
