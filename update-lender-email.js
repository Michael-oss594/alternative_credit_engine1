require("dotenv").config();
const pg = require("pg");

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

async function updateLenderEmail() {
  try {
    await client.connect();
    console.log("Connected to database");

    // Update lender email
    const query = `
      UPDATE public.lenders
      SET email = $1
      WHERE email = $2
      RETURNING *;
    `;

    const result = await client.query(query, [
      "testlender6@gmail.com",
      "testlender123!@gmail.com",
    ]);

    if (result.rows.length > 0) {
      console.log("Lender email updated successfully:");
      console.log(result.rows[0]);
    } else {
      console.log("No lender found with email: lender@example.com");
    }
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.end();
  }
}

updateLenderEmail();
