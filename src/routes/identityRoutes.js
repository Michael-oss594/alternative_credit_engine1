const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const { verifyIdentity } = require("../controllers/identityController");

// validation middleware
const validateIdentity = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

router.post("/verify-identity", [
  body('borrower_id').isInt({ min: 1 }).withMessage('Valid borrower ID required'),
  body('bvn_nin').isLength({ min: 11, max: 11 }).matches(/^\d{11}$/).withMessage('BVN/NIN must be 11 digits'),
  body('dob').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Valid DOB format YYYY-MM-DD required'),
  body('mothers_maiden_name').notEmpty().trim().isLength({min: 2}).withMessage("Mother's maiden name required (min 2 chars)")
], validateIdentity, verifyIdentity);

module.exports = router;
