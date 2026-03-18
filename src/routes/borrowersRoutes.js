const express = require("express");
const router = express.Router();

const {
  signupBorrower,
  loginBorrower,
  verifyOtpLoginBorrower,
  forgetPassword,
  resetPassword,
  verifyAccount
} = require("../controllers/borrowersController");

router.post("/signup", signupBorrower);
router.post("/login", loginBorrower);              
router.post("/verify-otp", verifyOtpLoginBorrower); 
router.post("/forget-password", forgetPassword);
router.post("/reset-password", resetPassword);
router.post("/verify-account", verifyAccount);     

module.exports = router;
