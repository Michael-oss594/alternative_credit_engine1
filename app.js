require("dotenv").config();
const express = require("express");
const path = require("path");
const morgan = require("morgan");
const fileUpload = require("express-fileupload");
const pool = require("./src/services/db.js");
const statementRoutes = require("./src/routes/statement.routes");
const authRoutes = require("./src/routes/borrowersRoutes.js");
const lenderRoutes = require("./src/routes/lendersRoutes.js");
const identityRoutes = require("./src/routes/identityRoutes.js");

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(express.json());            
app.use(express.urlencoded({ extended: true })); 
app.use(fileUpload());             
app.use(morgan("dev"));

// View engine setup for EJS emails
app.set('views', path.join(__dirname, 'src/views'));
app.set('view engine', 'ejs');

// Routes
app.use("/api/statements", statementRoutes);  
app.use("/api/upload", statementRoutes);  
app.use("/api/auth", authRoutes);       
app.use("/api/borrowers", authRoutes);       
app.use("/api/borrowers", identityRoutes);
app.use("/api/lenders", lenderRoutes);

// Home endpoint
app.get("/api", (req, res) => {
  res.send("Welcome to Alternative Credit Engine API");
});

const startServer = async () => { 
  try {
    await pool.query("SELECT 1"); 
    console.log("PostgreSQL connected");

    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
