const express = require("express");
const { processStatement } = require("../controllers/statement.controller");

const router = express.Router();

router.post("/upload", processStatement);

module.exports = router;