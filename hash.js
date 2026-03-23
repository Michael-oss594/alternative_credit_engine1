const bcrypt = require("bcrypt");

const password = "mikky12345";

async function hashPassword() {
  const saltRounds = 10;
  const hashed = await bcrypt.hash(password, saltRounds);
  console.log("Hashed password:", hashed);
}

hashPassword();