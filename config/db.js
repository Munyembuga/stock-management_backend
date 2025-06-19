const mysql = require('mysql2/promise');
require('dotenv').config();

// Aiven MySQL Configuration
const config = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false // Aiven accepts this setting
  } : false,
  connectTimeout: 60000,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Create pool
const pool = mysql.createPool(config);

// Test the connection
pool.getConnection()
  .then(connection => {
    console.log('✅ Connected to Aiven MySQL successfully');
    console.log(`🌐 Host: ${process.env.DB_HOST}`);
    console.log(`📂 Database: ${process.env.DB_NAME}`);
    connection.release();
  })
  .catch(err => {
    console.error('❌ Error connecting to the database:', err.message);
    console.error('🔍 Connection config:', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      database: process.env.DB_NAME,
      ssl: process.env.DB_SSL
    });
  });

module.exports = pool;
