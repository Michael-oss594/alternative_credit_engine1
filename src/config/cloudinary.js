// Ensure dotenv is loaded before using environment variables
if (!process.env.CLOUDINARY_CLOUD_NAME) {
  require("dotenv").config();
}

const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Log to verify config loaded
console.log("Cloudinary configured with cloud_name:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("Cloudinary API Key:", process.env.CLOUDINARY_API_KEY ? "✓ Loaded" : "✗ Missing");

module.exports = cloudinary;