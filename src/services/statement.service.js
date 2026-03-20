import prisma from "../config/prisma.js";
import * as extractionService from "./extraction.service.js";
import cloudinary from "../config/cloudinary.js";

/**
 * Upload Bank Statement + Extract Transactions
 */
export const uploadStatement = async (file, userId) => {
  try {

    //////////////////////////////////////////////////
    // 1️⃣ Validate file
    //////////////////////////////////////////////////
    if (!file) {
      throw new Error("File is missing");
    }

    const allowedMimeTypes = [
      "application/pdf",
      "text/csv",
      "application/csv",
      "application/vnd.ms-excel",
      "application/octet-stream",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error("Only PDF and CSV statements are supported");
    }

    //////////////////////////////////////////////////
    // 2️⃣ Upload file to Cloudinary
    //////////////////////////////////////////////////
    const uploadResult = await new Promise((resolve, reject) => {

      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "auto",
          folder: "credit_engine_statements",
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );

      stream.end(file.buffer);

    });

    //////////////////////////////////////////////////
    // 3️⃣ Save statement record in DB
    //////////////////////////////////////////////////
    const statement = await prisma.bankStatement.create({
      data: {
        userId,
        fileUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        fileType: file.mimetype,
      },
    });

    //////////////////////////////////////////////////
    // 4️⃣ Determine file type
    //////////////////////////////////////////////////
    const extension = file.originalname
      ? file.originalname.split(".").pop().toLowerCase()
      : "";

    let bank = "UNKNOWN";

    //////////////////////////////////////////////////
    // 5️⃣ Extract transactions
    //////////////////////////////////////////////////
    try {

      if (
        file.mimetype === "application/pdf" ||
        extension === "pdf"
      ) {

        const result = await extractionService.extractFromPDF(
          statement.id,
          file.buffer
        );

        bank = result?.bank || "UNKNOWN";

      } else if (
        file.mimetype.includes("csv") ||
        extension === "csv"
      ) {

        await extractionService.extractFromCSV(
          statement.id,
          file.buffer
        );

      }

    } catch (extractionError) {

      console.error("Transaction extraction failed:", extractionError);

    }

    //////////////////////////////////////////////////
    // 6️⃣ Fetch stored transactions from DB
    //////////////////////////////////////////////////
    const storedTransactions = await prisma.transaction.findMany({
      where: { statementId: statement.id },
      orderBy: { date: "asc" },
    });

    //////////////////////////////////////////////////
    // 7️⃣ Calculate financial metrics
    //////////////////////////////////////////////////
    let totalAmount = 0;
    let totalCredits = 0;
    let totalDebits = 0;
    let salaryDetected = false;
    let salaryTransactions = 0;

    storedTransactions.forEach((tx) => {

      const amount = tx.amount || 0;

      totalAmount += amount;

      if (tx.type === "CREDIT") {
        totalCredits += amount;
      }

      if (tx.type === "DEBIT") {
        totalDebits += amount;
      }

      if (tx.isSalary) {
        salaryDetected = true;
        salaryTransactions += 1;
      }

    });

    //////////////////////////////////////////////////
    // 8️⃣ Return full response
    //////////////////////////////////////////////////
    return {

      statementId: statement.id,

      fileUrl: uploadResult.secure_url,

      bank,

      transactionsExtracted: storedTransactions.length,

      financialSummary: {
        totalAmount,
        totalCredits,
        totalDebits,
        salaryDetected,
        salaryTransactions,
      },

      transactions: storedTransactions,

    };

  } catch (error) {

    console.error("Statement Service Error:", error);

    throw error;

  }
};