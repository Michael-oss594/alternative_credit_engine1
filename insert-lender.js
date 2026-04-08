require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  errorFormat: "colorless",
});

async function insertLender() {
  try {
    // Using raw query to insert lender
    const result = await prisma.$executeRaw`
      INSERT INTO public.lenders (email, password, verified, created_at)
      VALUES ('lender@example.com', '$2b$10$YeOjfWgpdaDP.fF23cQPPuP6JmkyPKnSxvjzHRgveulLvaT.tUMom', true, NOW())
      ON CONFLICT (email) DO UPDATE SET password = '$2b$10$YeOjfWgpdaDP.fF23cQPPuP6JmkyPKnSxvjzHRgveulLvaT.tUMom'
      RETURNING *;
    `;
    console.log("Lender inserted/updated successfully");
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

insertLender();
