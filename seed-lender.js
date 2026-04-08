require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function seedLender() {
  try {
    const lender = await prisma.lender.create({
      data: {
        email: "lender@example.com",
        password: "$2b$10$YeOjfWgpdaDP.fF23cQPPuP6JmkyPKnSxvjzHRgveulLvaT.tUMom",
        verified: true,
      },
    });
    console.log("Lender created successfully:", lender);
  } catch (error) {
    console.error("Error creating lender:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedLender();
