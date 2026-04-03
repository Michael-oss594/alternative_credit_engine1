const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  errorFormat: "colorless",
  log: [
    { level: "error", emit: "stdout" },
    { level: "warn", emit: "stdout" },
  ],
});

// Handle connection errors
prisma.$on("error", (e) => {
  console.error("Prisma error:", e.message);
});

// Handle disconnections
if (process.env.NODE_ENV !== "test") {
  process.on("SIGINT", async () => {
    console.log("SIGINT received, disconnecting Prisma...");
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("SIGTERM received, disconnecting Prisma...");
    await prisma.$disconnect();
    process.exit(0);
  });
}

module.exports = prisma;