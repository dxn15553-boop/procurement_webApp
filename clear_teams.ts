import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const dbPath = path.resolve(process.cwd(), "prisma", "dev.db").replace(/\\/g, "/");
const adapter = new PrismaLibSql({ url: `file:///${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Cleaning up DB to start fresh...");

  // First, delete related data that depends on the users
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  
  // Delete all procurement requests since they depend on users
  const deletedReqs = await prisma.procurementRequest.deleteMany();
  console.log(`✅ Deleted ${deletedReqs.count} procurement requests.`);

  // Delete all TEAM users
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      role: "TEAM",
    },
  });

  console.log(`✅ Deleted ${deletedUsers.count} team members.`);
  console.log("You can now log in as manager@procurex.com and add fresh employees and requests.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
