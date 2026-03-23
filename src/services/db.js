const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: process.env.NODE_ENV === 'production' ? 3 : 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  query_timeout: 5000,
});

pool.connect()
  .then(() => console.log("Postgresql DB Connected"))
  .catch(err => console.error("DB Connection Error:", err.message));

// Health check
module.exports = pool;
