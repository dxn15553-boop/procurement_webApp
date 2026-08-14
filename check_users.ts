require('dotenv').config();
const { prisma } = require('./lib/prisma');

async function main() {
  try {
    console.log("=== USERS ===");
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    });
    console.log(users);

    console.log("\n=== OVERDUE REQUESTS ===");
    const active = await prisma.procurementRequest.findMany({
      where: {
        isDeleted: false,
        currentStage: { notIn: ["COMPLETED", "CANCELLED"] },
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        handler: { select: { id: true, name: true, email: true } },
      }
    });
    
    active.forEach(r => {
      const targetUser = r.handler || r.createdBy;
      console.log(`- Request ${r.sourceNo} (Handler: ${r.nameOfHandler}, createdBy: ${r.createdBy?.name}) -> Email: ${targetUser?.email}`);
    });
  } catch(e) {
    console.error('ERROR:', e);
  }
}
main();

