const mysql = require('mysql2/promise');
require('dotenv').config();

// Determine if we're in production mode
const isProduction = process.env.NODE_ENV === 'production';

// Connection configuration
const config = isProduction ? 
  {
    host: process.env.AIVEN_DB_HOST,
    port: process.env.AIVEN_DB_PORT,
    user: process.env.AIVEN_DB_USER,
    password: process.env.AIVEN_DB_PASSWORD,
    database: process.env.AIVEN_DB_NAME,
    ssl: process.env.AIVEN_CA_CERT ? {
      rejectUnauthorized: true,
      ca: process.env.AIVEN_CA_CERT
    } : undefined
  } : 
  {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  };

const pool = mysql.createPool({
  ...config,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test the connection
pool.getConnection()
  .then(connection => {
    console.log(`Database connected successfully to ${isProduction ? 'Aiven' : 'local'} MySQL`);
    connection.release();
  })
  .catch(err => {
    console.error('Error connecting to the database:', err);
  });

module.exports = pool;
