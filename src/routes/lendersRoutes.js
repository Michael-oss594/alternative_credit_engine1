const express = require("express");
const router = express.Router();

const { loginLender, verifyOtpLenderLogin } = require("../controllers/lendersController");

router.post("/login", loginLender);
router.post("/verify-otp", verifyOtpLenderLogin);

module.exports = router;
