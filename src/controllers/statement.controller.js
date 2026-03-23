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
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    const file = req.files[Object.keys(req.files)[0]];

    // 👇 use buffer instead of saving file
    const fileBuffer = file.data;

    const statementId = uuidv4();

    const text = await extractTextFromPDF(fileBuffer);

    if (!text || text.length < 50) {
      throw new Error("Failed to extract text from PDF");
    }

    const metadata = extractMetadata(text);
    const transactions = parseTransactions(text);

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

    const categorizedTransactions = await categorizeTransactions(transactions);
    const features = generateFeatures(categorizedTransactions);
    const scoring = scoreApplicant(features);

    return res.status(200).json({
      success: true,
      scoring
    });

  } catch (error) {
    console.error("Statement Processing Error:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};