import { prisma } from './lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  try {
    const ajay = await prisma.user.findFirst({
      where: { name: { contains: 'ajay', mode: 'insensitive' } }
    });

    if (!ajay) {
      console.log('User Ajay not found!');
      return;
    }

    const passwordHash = await bcrypt.hash('ajay123', 12);

    await prisma.user.update({
      where: { id: ajay.id },
      data: { passwordHash }
    });

    console.log(`Successfully updated password for ${ajay.name} (${ajay.email}) to ajay123`);
  } catch(e: any) {
    console.error('ERROR:', e.message);
  } finally {
    process.exit(0);
  }
}

main();
