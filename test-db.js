const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const requests = await prisma.procurementRequest.findMany({
      where: { isDeleted: false },
      include: {
        department: { select: { id: true, name: true } },
        vendor: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      take: 5
    });
    console.log("Success! Found", requests.length, "requests.");
  } catch (err) {
    console.error("Prisma error:", err);
  } finally {
    await prisma.$disconnect();
  }
}
main();
