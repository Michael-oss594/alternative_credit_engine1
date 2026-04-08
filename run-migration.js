require("dotenv").config();
const pg = require("pg");
const fs = require("fs");
const path = require("path");

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  try {
    await client.connect();
    console.log("Connected to database");

    // Read migration file
    const migrationPath = path.join(
      __dirname,
      "prisma/migrations/20260407_apply_raw_migrations/migration.sql"
    );
    const sql = fs.readFileSync(migrationPath, "utf8");

    // Split by semicolon and execute each statement
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      console.log("Executing:", statement.substring(0, 50) + "...");
      await client.query(statement);
    }

    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.end();
  }
}

runMigration();
