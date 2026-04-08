const pool = require("../services/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendOtpEmail } = require("../services/email.service");

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

    const otp = crypto.randomInt(1000, 10000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      "UPDATE lenders SET otp=$1, otp_expires_at=$2 WHERE email=$3",
      [otp, expiresAt, email]
    );

    try {
      await sendOtpEmail(email, otp);
    } catch (emailError) {
      console.error("Failed to send OTP email:", emailError);
      return res.status(500).json({ message: "Failed to send OTP email" });
    }

    console.log(`Lender login OTP: ${otp} for ${email}`);

    res.status(200).json({ message: "Login OTP sent to email" });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal Server error" });
  }
};

exports.verifyOtpLenderLogin = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP required" });
    }

    const result = await pool.query("SELECT * FROM lenders WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const lender = result.rows[0];

    if (lender.otp !== otp || new Date() > new Date(lender.otp_expires_at)) {
      return res.status(401).json({ message: "Invalid OTP" });
    }

    await pool.query("UPDATE lenders SET otp = NULL, otp_expires_at = NULL WHERE email = $1", [email]);

    const token = jwt.sign(
      { lenderId: lender.id, email: lender.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const safeLender = { ...lender };
    delete safeLender.password;
    delete safeLender.otp;
    delete safeLender.otp_expires_at;

    res.status(200).json({
      message: "Login successful",
      token,
      lender: safeLender
    });

  } catch (error) {
    console.error("Lender OTP verification error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
