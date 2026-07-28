const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const dbUrlMatch = envFile.match(/DATABASE_URL=([^\s]+)/);
const dbUrl = dbUrlMatch ? dbUrlMatch[1].replace(/['"]/g, '') : '';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } }
});
async function main() {
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: 'jyothi', mode: 'insensitive' } },
          { email: { contains: 'jyothi', mode: 'insensitive' } }
        ]
      }
    });
    console.log('Users found:', users);
  } catch(e) {
    console.error('ERROR:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
