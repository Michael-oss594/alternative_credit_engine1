const { Pool } = require("pg");

// Ensure dotenv is loaded before using environment variables
if (!process.env.DATABASE_URL) {
  require("dotenv").config();
}

// Remove channel_binding parameter if present - it can cause issues with some drivers
const dbUrl = new URL(process.env.DATABASE_URL);
dbUrl.searchParams.delete("channel_binding");
const cleanConnectionString = dbUrl.toString();

console.log("Connecting to database...");

const pool = new Pool({
  connectionString: cleanConnectionString,

  ssl: {
    rejectUnauthorized: false, 
  },

  // Neon can take longer to establish initial connections
  connectionTimeoutMillis: 30000, 
  idleTimeoutMillis: 240000, 
  statementTimeoutMillis: 30000, 
  max: 10,
  min: 0, 
  allowExitOnIdle: false,
});

// Event handlers
pool.on("connect", () => {
  console.log("New DB connection established");
});

pool.on("error", (err) => {
  console.error("Pool error:", err.message);
});

pool.on("remove", () => {
  console.log("Connection removed from pool");
});

// Test connection with retry logic
let retryCount = 0;
const maxRetries = 3;

const testConnection = async () => {
  try {
    console.log(`Attempting database connection (attempt ${retryCount + 1}/${maxRetries + 1})...`);
    const client = await pool.connect();
    const result = await client.query("SELECT NOW()");
    client.release();
    console.log("Database connected successfully at", result.rows[0].now);
    return true;
  } catch (err) {
    retryCount++;
    console.error(`Connection attempt ${retryCount} failed:`, err.message);
    
    if (retryCount <= maxRetries) {
      console.log(`Retrying in 3 seconds... (${retryCount}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      return testConnection();
    }
    
    console.error("✗ Failed to connect to database after", maxRetries + 1, "attempts");
    return false;
  }
};

// Run connection test
testConnection().catch(err => {
  console.error("Connection test error:", err);
});

module.exports = pool;