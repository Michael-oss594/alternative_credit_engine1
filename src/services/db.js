const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  ssl: {
    rejectUnauthorized: false, 
  },

  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20,
  min: 2,
});

// Handle pool connection
pool.on("connect", () => {
  console.log("DB Connected");
});

// Handle pool errors
pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

// Test initial connection
pool.connect()
  .then((client) => {
    console.log("DB Connected Successfully");
    client.release();
  })
  .catch(err => {
    console.error("DB Connection Error:", err.message);
    process.exit(1);
  });

module.exports = pool;