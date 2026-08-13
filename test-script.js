const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({
    where: { name: { contains: 'ajay', mode: 'insensitive' } }
  });
  console.log('Users:', users);
  const requests = await prisma.procurementRequest.findMany({
    include: { createdBy: true, handler: true }
  });
  console.log('All requests:', JSON.stringify(requests, null, 2));
}
main().finally(() => prisma.$disconnect());
