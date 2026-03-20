import prisma from "../config/prisma.js";
import { Readable } from "stream";
import csv from "csv-parser";
import PDFParser from "pdf2json";
import Tesseract from "tesseract.js";
import fs from "fs";
import os from "os";
import path from "path";
import { fromPath } from "pdf2pic";
import cloudinary from "../config/cloudinary.js";

//////////////////////////////////////////////////////
// Utility functions
//////////////////////////////////////////////////////

const cleanAmount = (value) => {
  if (!value) return 0;
  const cleaned = value.replace(/[(),]/g, "").replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

const parseDate = (str) => {
  if (!str) return null;

  const parts = str.split(/[\/\-]/);

  if (parts.length !== 3) return null;

  let [day, month, year] = parts;

  if (year.length === 2) year = `20${year}`;

  const date = new Date(`${year}-${month}-${day}`);

  return isNaN(date.getTime()) ? null : date;
};

//////////////////////////////////////////////////////
// Bank detection
//////////////////////////////////////////////////////

const detectBank = (text) => {

  const lower = text.toLowerCase();

  if (lower.includes("guaranty trust") || lower.includes("gtbank"))
    return "GTBANK";

  if (lower.includes("access bank"))
    return "ACCESS";

  if (lower.includes("zenith bank"))
    return "ZENITH";

  if (lower.includes("uba"))
    return "UBA";

  if (lower.includes("first bank"))
    return "FIRSTBANK";

  return "UNKNOWN";

};

//////////////////////////////////////////////////////
// Salary detection
//////////////////////////////////////////////////////

const detectSalary = (description) => {

  if (!description) {
    return {
      isSalary: false,
      employerName: null,
      confidence: 0
    };
  }

  const desc = description.toLowerCase();

  const salaryKeywords = [
    "salary",
    "payroll",
    "salary payment",
    "staff salary"
  ];

  const isSalary = salaryKeywords.some(k => desc.includes(k));

  let employerName = null;

  if (isSalary) {
    const parts = description.split(" ");
    employerName = parts.slice(-2).join(" ");
  }

  return {
    isSalary,
    employerName,
    confidence: isSalary ? 0.9 : 0
  };

};

//////////////////////////////////////////////////////
// Categorize transaction
//////////////////////////////////////////////////////

const categorizeTransaction = (description) => {

  const text = description.toLowerCase();

  if (text.includes("atm")) return "ATM";
  if (text.includes("pos")) return "POS";
  if (text.includes("transfer")) return "TRANSFER";
  if (text.includes("salary")) return "SALARY";
  if (text.includes("bet")) return "BETTING";

  return "OTHER";

};

//////////////////////////////////////////////////////
// Extract reference
//////////////////////////////////////////////////////

const extractReference = (description) => {

  const match = description.match(/[A-Z0-9]{8,}/);

  return match ? match[0] : null;

};

//////////////////////////////////////////////////////
// PDF structured extraction
//////////////////////////////////////////////////////

const extractStructuredText = (buffer) =>
  new Promise((resolve, reject) => {

    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (err) =>
      reject(err.parserError)
    );

    pdfParser.on("pdfParser_dataReady", (pdfData) =>
      resolve(pdfData.Pages || [])
    );

    pdfParser.parseBuffer(buffer);

  });

//////////////////////////////////////////////////////
// OCR fallback
//////////////////////////////////////////////////////

const extractTextFromPDF_OCR = async (buffer) => {

  const tmpPdfPath = path.join(os.tmpdir(), `temp_${Date.now()}.pdf`);

  fs.writeFileSync(tmpPdfPath, buffer);

  const convert = fromPath(tmpPdfPath, {
    density: 150,
    saveFilename: "temp_page",
    savePath: os.tmpdir(),
    format: "png",
    width: 1200,
    height: 1600
  });

  let fullText = "";

  for (let i = 1; i <= 50; i++) {

    try {

      const result = await convert(i);

      if (!fs.existsSync(result.path))
        break;

      const { data } = await Tesseract.recognize(result.path, "eng");

      fullText += data.text + "\n";

      fs.unlinkSync(result.path);

    } catch {
      break;
    }

  }

  fs.unlinkSync(tmpPdfPath);

  return fullText;

};

//////////////////////////////////////////////////////
// Transaction extraction (MAIN FIX)
//////////////////////////////////////////////////////

const extractTransactions = (text, statementId) => {

  const transactions = [];

  const cleaned = text
    .replace(/Page \d+ of \d+/gi, "")
    .replace(/\s+/g, " ")
    .replace(/Opening Balance.*?\d+\.\d{2}/i, "");

  const regex =
/(\d{2}\/\d{2}\/\d{4})\s+(.*?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+(\d{2}\/\d{2}\/\d{4})\s+(-?[\d,]+\.\d{2})/g;

  let match;

  while ((match = regex.exec(cleaned)) !== null) {

    const date = parseDate(match[1]);

    if (!date) continue;

    const description = match[2].trim();

    const debit = cleanAmount(match[3]);
    const credit = cleanAmount(match[4]);
    const balance = cleanAmount(match[6]);

    const amount = credit > 0 ? credit : debit;

    const type = credit > 0 ? "CREDIT" : "DEBIT";

    const salaryInfo = detectSalary(description);

    transactions.push({

      date,
      description,
      amount,
      type,
      balance,
      category: categorizeTransaction(description),
      reference: extractReference(description),

      isSalary: salaryInfo.isSalary,
      employerName: salaryInfo.employerName,
      salaryConfidence: salaryInfo.confidence,

      statementId

    });

  }

  return transactions;

};

//////////////////////////////////////////////////////
// Extract from PDF
//////////////////////////////////////////////////////

export const extractFromPDF = async (statementId, buffer) => {

  try {

    let pages = await extractStructuredText(buffer);

    let fullText = pages
      .map(p =>
        p.Texts?.map(t => decodeURIComponent(t.R[0].T)).join(" ") || ""
      )
      .join(" ");

    if (!fullText || fullText.length < 50) {
      fullText = await extractTextFromPDF_OCR(buffer);
    }

    const transactions = extractTransactions(fullText, statementId);

    const bank = detectBank(fullText);

    if (transactions.length > 0) {

      await prisma.transaction.createMany({
        data: transactions
      });

    }

    return {
      bank,
      transactions
    };

  } catch (error) {

    console.error("PDF extraction error:", error);

    throw error;

  }

};

//////////////////////////////////////////////////////
// CSV extraction
//////////////////////////////////////////////////////

export const extractFromCSV = async (statementId, fileBuffer) => {

  const transactions = [];

  const readable = Readable.from(fileBuffer);

  await new Promise((resolve, reject) => {

    readable
      .pipe(csv())
      .on("data", (row) => {

        const date = parseDate(row.date || row.Date);

        if (!date) return;

        const description =
          row.description ||
          row.Description ||
          "No description";

        const salaryInfo = detectSalary(description);

        transactions.push({

          date,
          description,
          amount: cleanAmount(row.amount || row.Amount),
          type: (row.type || "DEBIT").toUpperCase(),
          category: categorizeTransaction(description),
          reference: extractReference(description),

          isSalary: salaryInfo.isSalary,
          employerName: salaryInfo.employerName,
          salaryConfidence: salaryInfo.confidence,

          statementId

        });

      })
      .on("end", resolve)
      .on("error", reject);

  });

  if (transactions.length > 0) {

    await prisma.transaction.createMany({
      data: transactions
    });

  }

  return transactions;

};

//////////////////////////////////////////////////////
// Upload + Extract
//////////////////////////////////////////////////////

export const uploadStatement = async (file, userId) => {

  if (!file)
    throw new Error("File missing");

  const uploadResult = await new Promise((resolve, reject) => {

    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
        folder: "credit_engine_statements"
      },
      (err, result) => {

        if (err) return reject(err);

        resolve(result);

      }
    );

    stream.end(file.buffer);

  });

  const statement = await prisma.bankStatement.create({

    data: {
      userId,
      fileUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      fileType: file.mimetype
    }

  });

  let transactions = [];
  let bank = "UNKNOWN";

  if (file.mimetype.includes("pdf")) {

    const result = await extractFromPDF(
      statement.id,
      file.buffer
    );

    transactions = result.transactions;
    bank = result.bank;

  } else {

    transactions = await extractFromCSV(
      statement.id,
      file.buffer
    );

  }

  const totalAmount = transactions.reduce(
    (sum, tx) => sum + tx.amount,
    0
  );

  return {

    statementId: statement.id,
    fileUrl: uploadResult.secure_url,
    bank,
    transactionsExtracted: transactions.length,
    totalAmount,
    transactions

  };

};