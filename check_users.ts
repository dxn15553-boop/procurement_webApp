require('dotenv').config({ path: '.env.local' });
const { prisma } = require('./lib/prisma');
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
    console.error('ERROR:', e);
  }
}
main();
