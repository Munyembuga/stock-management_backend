const pool = require('../config/db');

// Add new product
const addProduct = async (req, res) => {
  try {
    console.log('Add product request received:', req.body);
    console.log('User from auth:', req.user);
    
    const { name } = req.body;
    
    if (!name) {
      console.log('Product name missing in request');
      return res.status(400).json({ message: 'Product name is required' });
    }

    console.log('Attempting to insert product with name:', name);
    const query = 'INSERT INTO products (name) VALUES (?)';
    const [result] = await pool.execute(query, [name]);
    
    console.log('Product insert result:', result);
    
    res.status(201).json({
      message: 'Product added successfully',
      product: {
        id: result.insertId,
        name
      }
    });
  } catch (error) {
    console.error('Error in addProduct:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all products
const getAllProducts = async (req, res) => {
  try {
    console.log('Get all products request received');
    console.log('User from auth:', req.user);
    
    const query = 'SELECT * FROM products ORDER BY id DESC';
    const [products] = await pool.execute(query);
    
    console.log('Products retrieved:', products.length);
    
    res.json({
      message: 'Products retrieved successfully',
      products
    });
  } catch (error) {
    console.error('Error in getAllProducts:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get single product
const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'SELECT * FROM products WHERE id = ?';
    const [products] = await pool.execute(query, [id]);
    
    if (products.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({
      message: 'Product retrieved successfully',
      product: products[0]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Product name is required' });
    }

    const query = 'UPDATE products SET name = ? WHERE id = ?';
    const [result] = await pool.execute(query, [name, id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({
      message: 'Product updated successfully',
      product: { id, name }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'DELETE FROM products WHERE id = ?';
    const [result] = await pool.execute(query, [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  addProduct,
  getAllProducts,
  getProduct,
  updateProduct,
  deleteProduct
};
