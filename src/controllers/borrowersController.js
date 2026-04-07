const pool = require("../services/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const emailService = require("../utils/emailService");

exports.signupBorrower = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      password,
      confirmPassword
    } = req.body;

    if (!first_name || !last_name || !email || !phone || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const existingUser = await pool.query(
      "SELECT id FROM public.borrowers WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "Borrower already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("SIGNUP HIT:", req.body);

    const result = await pool.query(
      `INSERT INTO public.borrowers 
      (first_name, last_name, email, phone, password)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING id, first_name, last_name, email, phone, created_at`,
      [first_name, last_name, email, phone, hashedPassword]
    );

    console.log("INSERTED:", result.rows[0]);

    res.status(201).json({
      message: "Borrower created successfully.",
      borrower: result.rows[0]
    });

  } catch (error) {
    console.error("SIGNUP ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.loginBorrower = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const result = await pool.query("SELECT * FROM public.borrowers WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const borrower = result.rows[0];

    const isMatch = await bcrypt.compare(password, borrower.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const otp = crypto.randomInt(1000, 10000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      "UPDATE public.borrowers SET otp=$1, otp_expires_at=$2 WHERE email=$3",
      [otp, expiresAt, email]
    );

    await emailService.sendLoginNotification(email, otp);

    res.status(200).json({ message: "Login OTP sent to your email. Please verify to complete login." });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal Server error" });
  }
};

exports.verifyOtpLoginBorrower = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP required" });
    }

    const result = await pool.query("SELECT * FROM public.borrowers WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const borrower = result.rows[0];

    if (borrower.otp !== otp || new Date() > new Date(borrower.otp_expires_at)) {
      return res.status(401).json({ message: "Invalid OTP" });
    }

    await pool.query("UPDATE public.borrowers SET otp = NULL, otp_expires_at = NULL WHERE email = $1", [email]);

    const token = jwt.sign(
      { borrowerId: borrower.id, email: borrower.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const safeBorrower = { ...borrower };
    delete safeBorrower.password;
    delete safeBorrower.confirm_password;
    delete safeBorrower.otp;
    delete safeBorrower.otp_expires_at;

    res.status(200).json({
      message: "Login successful",
      token,
      borrower: safeBorrower
    });

  } catch (error) {
    console.error("OTP verification error:", error.message, error.stack);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const otp = crypto.randomInt(1000, 10000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      "UPDATE public.borrowers SET otp = $1, otp_expires_at = $2 WHERE email = $3",
      [otp, expiresAt, email]
    );

    await emailService.sendForgetPassword(email, otp);

    res.status(200).json({ message: "ForgetPassword Reset OTP sent" });

  } catch (error) {
    console.error("Forget password error:", error);
    res.status(500).json({ message: "Internal Server error" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "All fields required" });
    }

    const result = await pool.query(
      "SELECT * FROM public.borrowers WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const borrower = result.rows[0];

    // safer OTP comparison
    if (
      String(borrower.otp) !== String(otp) ||
      new Date() > new Date(borrower.otp_expires_at)
    ) {
      return res.status(401).json({ message: "Invalid OTP" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE public.borrowers SET password = $1, otp = NULL, otp_expires_at = NULL WHERE email = $2",
      [hashedPassword, email]
    );

    await emailService.sendResetPassword(email, borrower.first_name);

    res.status(200).json({ message: "Password reset successful" });

  } catch (error) {
    console.error("Reset password error:", error.message);
    res.status(500).json({ message: "Internal Server error" });
  }
};

exports.verifyAccount = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP required" });
    }

    const result = await pool.query(
      "SELECT * FROM public.borrowers WHERE email = $1 AND otp = $2 AND otp_expires_at > NOW()",
      [email, otp]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const borrower = result.rows[0];

    await pool.query(
      "UPDATE public.borrowers SET verified = true, otp = NULL, otp_expires_at = NULL WHERE id = $1",
      [borrower.id]
    );

    await emailService.sendVerifyAccount(borrower.email, borrower.first_name);

    const safeBorrower = { ...borrower };
    delete safeBorrower.password;
    delete safeBorrower.confirm_password;

    res.status(200).json({
      message: "Account verified",
      borrower: safeBorrower
    });

  } catch (error) {
    console.error("Verify account error:", error);
    res.status(500).json({ message: "Internal Server error" });
  }
};

