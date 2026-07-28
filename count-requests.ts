import { prisma } from './lib/prisma';

async function main() {
  const count = await prisma.procurementRequest.count();
  console.log(`\n======================================`);
  console.log(`Total Procurement Requests in DB: ${count}`);
  console.log(`======================================\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
