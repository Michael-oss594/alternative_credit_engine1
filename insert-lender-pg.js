require("dotenv").config();
const pg = require("pg");

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

async function insertLender() {
  try {
    await client.connect();
    console.log("Connected to database");

    // lender with hashed password
    const query = `
      INSERT INTO public.lenders (email, password, verified, created_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (email) DO UPDATE 
      SET password = $2, verified = $3
      RETURNING *;
    `;

    const result = await client.query(query, [
      "lender@example.com",
      "$2b$10$YeOjfWgpdaDP.fF23cQPPuP6JmkyPKnSxvjzHRgveulLvaT.tUMom",
      true,
    ]);

    console.log("Lender inserted/updated successfully:");
    console.log(result.rows[0]);
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.end();
  }
}

insertLender();
