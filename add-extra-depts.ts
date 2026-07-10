import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const dbPath = path.resolve(process.cwd(), "prisma", "dev.db").replace(/\\/g, "/");
const adapter = new PrismaLibSql({ url: `file:///${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Adding additional departments...");

  const newDepts = [
    { code: "FINANCE", name: "Finance" },
    { code: "ADMIN", name: "Admin" },
    { code: "PUB", name: "Publications" },
  ];

  for (const t of newDepts) {
    await prisma.department.upsert({
      where: { code: t.code },
      update: { name: t.name },
      create: { name: t.name, code: t.code, head: "Manager" }
    });
    console.log(`Added ${t.name}`);
  }

  console.log("Done!");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
