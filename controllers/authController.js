const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

exports.register = async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;

    console.log("Register request body:", req.body); // Debug log

    // Check required fields
    if (!name || !phone || !password) {
      const missingFields = [];
      if (!name) missingFields.push("name");
      if (!phone) missingFields.push("phone");
      if (!password) missingFields.push("password");
      
      return res.status(400).json({ 
        message: `Missing required fields: ${missingFields.join(", ")}` 
      });
    }

    // Check if phone already exists
    const [phoneExists] = await pool.query('SELECT * FROM users WHERE phone = ?', [phone]);
    if (phoneExists.length > 0) {
      return res.status(400).json({ message: 'Phone number already registered' });
    }

    // Check email uniqueness if provided
    if (email) {
      const [emailExists] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      if (emailExists.length > 0) {
        return res.status(400).json({ message: 'Email already registered' });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const [result] = await pool.query(
      'INSERT INTO users (name, phone, email, password) VALUES (?, ?, ?, ?)',
      [name, phone, email || null, hashedPassword]
    );

    // Generate token
    const token = jwt.sign({ id: result.insertId }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });

    res.status(201).json({
      token,
      user: { 
        id: result.insertId, 
        name, 
        phone,
        email 
      }
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    console.log("Login request body:", req.body); // Debug log

    // Check required fields
    if (!phone || !password) {
      const missingFields = [];
      if (!phone) missingFields.push("phone");
      if (!password) missingFields.push("password");
      
      return res.status(400).json({ 
        message: `Missing required fields: ${missingFields.join(", ")}` 
      });
    }

    // Check user exists
    const [users] = await pool.query('SELECT * FROM users WHERE phone = ?', [phone]);
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, users[0].password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign({ id: users[0].id }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });

    res.json({
      token,
      user: {
        id: users[0].id,
        name: users[0].name,
        phone: users[0].phone,
        email: users[0].email
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const [user] = await pool.query(
      'SELECT id, name, phone, email FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (user.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user[0]);
  } catch (error) {
    console.error("GetMe error:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
