const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Checking Overdue Requests (Cron Logic) ---');
  
  const overdueRequests = await prisma.procurementRequest.findMany({
    where: {
      currentStage: {
        notIn: ["COMPLETED", "CANCELLED"],
      },
      OR: [
        {
          currentStage: { not: "PR" },
          noOfDays: { gt: 21 },
        },
        {
          currentStage: "PR",
          noOfDays: { gt: 23 },
        },
      ],
    },
    include: {
      createdBy: true,
      handler: true,
    },
  });

  console.log(`Found ${overdueRequests.length} overdue requests.`);
  
  if (overdueRequests.length > 0) {
    for (const req of overdueRequests) {
      console.log(`\nRequest Source No: ${req.sourceNo}`);
      console.log(`- Stage: ${req.currentStage}`);
      console.log(`- noOfDays: ${req.noOfDays}`);
      
      const targetUser = req.handler || req.createdBy;
      console.log(`- Target User: ${targetUser ? targetUser.name : 'None'}`);
      console.log(`- Target Email: ${targetUser ? targetUser.email : 'None'}`);
    }
  } else {
    console.log("No overdue requests matched the criteria.");
    
    // Let's check the most recently created requests just to see what the values are
    const recent = await prisma.procurementRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: { createdBy: true, handler: true }
    });
    console.log("\n--- Most Recent Requests in DB ---");
    recent.forEach(req => {
      console.log(`Source No: ${req.sourceNo}, Stage: ${req.currentStage}, noOfDays: ${req.noOfDays}, Handler: ${req.handler?.name || 'None'}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
