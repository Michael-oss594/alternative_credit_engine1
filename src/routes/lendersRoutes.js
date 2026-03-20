const express = require("express");
const router = express.Router();

const { loginLender } = require("../controllers/lendersController");

router.post("/login", loginLender);

module.exports = router;
