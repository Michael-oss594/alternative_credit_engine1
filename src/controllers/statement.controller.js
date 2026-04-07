const fs = require("fs");
const path = require("path");

const { extractTextFromPDF } = require("../services/pdf.service");
const { parseTransactions, extractMetadata } = require("../services/transaction.parser");
const { categorizeTransactions } = require("../services/categorizer.service");
const { generateFeatures } = require("../services/feature.service");
const { scoreApplicant } = require("../services/scoring.service");
const cloudinary = require("../config/cloudinary");
const prisma = require("../config/prisma");

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

    // Upload PDF to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          public_id: `statements/${uuidv4()}`,
          format: 'pdf'
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(file.data);
    });

    const fileUrl = uploadResult.secure_url;

    // Extract text from buffer for processing
    const text = await extractTextFromPDF(file.data);

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

    // Save statement to database
    const statementId = uuidv4();
    const statement = await prisma.statement.create({
      data: {
        id: statementId,
        fileName: file.name,
        fileUrl: fileUrl,
        score: scoring.credit_score,
        decision: scoring.loan_recommendation,
        transactions: {
          create: transactions.map(t => ({
            date: t.date,
            description: t.description,
            debit: t.debit,
            credit: t.credit,
            balance: t.balance,
            category: t.category || 'others'
          }))
        },
        feature: {
          create: {
            statementId: statementId,
            avgIncome: features.avgIncome || 0,
            totalDebit: features.totalDebit || 0,
            avgBalance: features.avgBalance || 0,
            negativeBalanceDays: features.negativeBalanceDays || 0,
            bounceCount: features.bounceCount || 0
          }
        }
      },
      include: {
        transactions: true,
        feature: true
      }
    });

    return res.status(200).json({
      success: true,
      scoring,
      statement: {
        id: statement.id,
        fileName: statement.fileName,
        fileUrl: statement.fileUrl,
        score: statement.score,
        decision: statement.decision
      }
    });

  } catch (error) {
    console.error("Statement Processing Error:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};