const fs = require("fs");
const pdfParse = require("pdf-parse");

exports.extractTextFromPDF = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);

    const data = await pdfParse(dataBuffer);

    return data.text;
  } catch (error) {
    console.error("PDF Parse Error:", error);
    throw new Error("Failed to parse PDF");
  }
};