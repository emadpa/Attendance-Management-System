const { PrismaClient } = require("@prisma/client");

async function testDB() {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully");

    const result = await prisma.$queryRaw`SELECT 1`;
    console.log("Test query result:", result);
  } catch (err) {
    console.error("❌ Database connection failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

testDB();
