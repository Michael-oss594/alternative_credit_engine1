const pool = require("../services/db");
const { body, validationResult } = require("express-validator");

exports.verifyIdentity = async (req, res) => {
  try {
    console.log('req.body:', req.body);
    console.log('borrower_id type:', typeof req.body.borrower_id);

    const { borrower_id, bvn_nin, dob, mothers_maiden_name } = req.body;

    // Check borrower exists
    const borrowerCheck = await pool.query("SELECT id FROM borrowers WHERE id = $1", [borrower_id]);
    if (borrowerCheck.rows.length === 0) {
      return res.status(404).json({ message: "Borrower not found" });
    }

    // Check if already verified
    const existing = await pool.query(
      "SELECT id FROM borrower_identities WHERE borrower_id = $1", 
      [borrower_id]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Identity already submitted" });
    }

    // Insert identity
    await pool.query(
      "INSERT INTO borrower_identities (borrower_id, bvn_nin, dob, mothers_maiden_name) VALUES ($1, $2, $3, $4)",
      [borrower_id, bvn_nin, dob, mothers_maiden_name]
    );

    res.status(201).json({ 
      message: "Identity verification submitted successfully. Pending review.",
      borrower_id
    });

  } catch (error) {
    console.error("Identity verification error:", error);
    res.status(500).json({ message: "Internal Server error" });
  }
};
