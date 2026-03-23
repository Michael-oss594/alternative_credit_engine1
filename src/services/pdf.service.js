const pdfParse = require("pdf-parse");

exports.extractTextFromPDF = async (fileBuffer) => {
  try {
    // directly parse buffer
    const data = await pdfParse(fileBuffer);

    return data.text;

  } catch (error) {
    console.error("PDF Parse Error:", error.message);
    throw new Error("Failed to parse PDF");
  }
};