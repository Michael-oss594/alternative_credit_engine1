const fs = require("fs");
const path = require("path");

const { extractTextFromPDF } = require("../services/pdf.service");
const { parseTransactions, extractMetadata } = require("../services/transaction.parser");
const { categorizeTransactions } = require("../services/categorizer.service");
const { generateFeatures } = require("../services/feature.service");
const { scoreApplicant } = require("../services/scoring.service");

const { v4: uuidv4 } = require("uuid");

exports.processStatement = async (req, res) => {
  try {
    // Validate upload
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    const file = req.files[Object.keys(req.files)[0]];

    //Save file
    const uploadDir = path.join(__dirname, "../../uploads");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }

    const filePath = path.join(uploadDir, `${Date.now()}-${file.name}`);

    await file.mv(filePath);

    // Generate statement ID
    const statementId = uuidv4();

    // Extract PDF text
    const text = await extractTextFromPDF(filePath);

    if (!text || text.length < 50) {
      throw new Error("Failed to extract text from PDF");
    }

    // Extract metadata
    const metadata = extractMetadata(text);

    // Parse transactions
    const transactions = parseTransactions(text);

    // Calculate month_of_history 
    if (!metadata.month_of_history || metadata.month_of_history === 0) {
      const months = new Set();
      transactions.forEach((t) => {
        const date = new Date(t.date);
        if (!isNaN(date)) {
          months.add(`${date.getFullYear()}-${date.getMonth()}`);
        }
      });
      metadata.month_of_history = months.size;
    }

    // Categorize transactions 
    const categorizedTransactions = await categorizeTransactions(transactions);

    // Generate financial features
    const features = generateFeatures(categorizedTransactions);

    // Score applicant
    const scoring = scoreApplicant(features);

    // Delete file after processing
    fs.unlinkSync(filePath);

    // Response scoring decision
    return res.status(200).json({
      success: true,
      scoring
    });

  } catch (error) {
    console.error("Statement Processing Error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};
