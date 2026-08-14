const fs = require('fs');
const envFile = fs.readFileSync('.env', 'utf8');
const dbUrlMatch = envFile.match(/DATABASE_URL=([^\s]+)/);
const dbUrl = dbUrlMatch ? dbUrlMatch[1].replace(/['"]/g, '') : '';

const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
async function main() {
  try {
    const reqs = await prisma.procurementRequest.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        sourceNo: true,
        sourceDate: true,
        currentStage: true,
        createdAt: true,
        createdById: true,
        nameOfHandler: true,
      }
    });
    console.log('Recent requests in DB:', reqs);
  } catch(e) {
    console.error('ERROR:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
