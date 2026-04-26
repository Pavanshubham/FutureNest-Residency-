const { PrismaClient } = require('@prisma/client');
try {
  const prisma = new PrismaClient({});
  console.log("SUCCESS");
} catch (e) {
  console.error("FAILED:", e.message);
}
