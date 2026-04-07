const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  errorFormat: "colorless",
  log: [
    { level: "error", emit: "stdout" },
  ],
});

// Handle connection errors gracefully - don't crash the app
prisma.$on("error", (e) => {
  console.error("Prisma connection error:", e.message);
});

// Handle graceful disconnection on shutdown
const disconnect = async () => {
  try {
    await prisma.$disconnect();
    console.log("Prisma disconnected");
  } catch (error) {
    console.error("Error disconnecting Prisma:", error.message);
  }
};

// Handle process termination
if (process.env.NODE_ENV !== "test") {
  process.on("SIGINT", async () => {
    console.log("SIGINT received");
    await disconnect();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("SIGTERM received");
    await disconnect();
    process.exit(0);
  });
}

module.exports = prisma;