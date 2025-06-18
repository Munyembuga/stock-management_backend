module.exports = {
  // Production settings
  host: process.env.AIVEN_DB_HOST,
  port: process.env.PORT || 5000,
  database: {
    host: process.env.AIVEN_DB_HOST,
    port: process.env.AIVEN_DB_PORT,
    user: process.env.AIVEN_DB_USER,
    password: process.env.AIVEN_DB_PASSWORD,
    database: process.env.AIVEN_DB_NAME,
    ssl: {
      rejectUnauthorized: true,
      ca: process.env.AIVEN_CA_CERT
    }
  }
};
