const pool = require("../services/db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const emailService = require("../services/email.service");

exports.loginLender = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const result = await pool.query("SELECT * FROM lenders WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const lender = result.rows[0];

    const isMatch = await bcrypt.compare(password, lender.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    bcrypt.hash("testpass123", 10).then(console.log);

    const otp = crypto.randomInt(1000, 10000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      "UPDATE lenders SET otp=$1, otp_expires_at=$2 WHERE email=$3",
      [otp, expiresAt, email]
    );
 
console.log(`Lender login OTP: ${otp} for ${email}`);

    res.status(200).json({ message: "Login OTP sent" });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal Server error" });
  }
};
