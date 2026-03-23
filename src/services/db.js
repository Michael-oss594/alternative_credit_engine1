const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  ssl: {
    rejectUnauthorized: false, 
  },

  connectionTimeoutMillis: 10000,
});

pool.connect()
  .then(() => console.log("DB Connected"))
  .catch(err => console.error("DB Connection Error:", err.message));

module.exports = pool;