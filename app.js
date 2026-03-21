require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const morgan = require("morgan");
const fileUpload = require("express-fileupload");

const app = express();


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: ['https://freshpee78.github.io', 'http://localhost:5500'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));
app.use(fileUpload());
app.use(morgan("dev"));

// View engine
app.set('views', path.join(__dirname, 'src/views'));
app.set('view engine', 'ejs');

// Home endpoint
app.get("/", (req, res) => {
  res.send('Welcome to Alternative Credit Engine API');
});

app.get("/api", (req, res) => {
  res.json({ message: "API ready. Use /api/upload for statements." });
});

// load routes 
app.use("/api/statements", require("./src/routes/statement.routes"));
app.use("/api/upload", require("./src/routes/statement.routes"));
app.use("/api/auth", require("./src/routes/borrowersRoutes.js"));
app.use("/api/borrowers", require("./src/routes/borrowersRoutes.js"));
app.use("/api/borrowers/identity", require("./src/routes/identityRoutes.js"));
app.use("/api/lenders", require("./src/routes/lendersRoutes.js"));



// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Something went wrong!' });
});

// Vercel serverless export
module.exports = app;

// Local development with graceful port handling
if (require.main === module) {
  const port = process.env.PORT || 4000;
  const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
    });
  });
  
  // Dynamic port if 4000 in use
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} in use, trying ${port + 1}`);
      app.listen(port + 1, () => {
        console.log(`Server running on http://localhost:${port + 1}`);
      });
    }
  });
}
