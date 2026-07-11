import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const dbPath = path.resolve(process.cwd(), "prisma", "dev.db").replace(/\\/g, "/");
const adapter = new PrismaLibSql({ url: `file:///${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    where: {
      name: { contains: "jyothi" } // SQLite is typically case-insensitive for text search depending on collation, but we can also just fetch all and filter
    }
  });

  if (users.length === 0) {
    const all = await prisma.user.findMany();
    const jyothis = all.filter(u => u.name.toLowerCase().includes("jyothi") || u.email.toLowerCase().includes("jyothi"));
    console.log("Users found:", jyothis.map(u => ({ email: u.email, name: u.name })));
  } else {
    console.log("Users found:", users.map(u => ({ email: u.email, name: u.name })));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
