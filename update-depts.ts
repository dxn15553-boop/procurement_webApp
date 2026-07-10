import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const dbPath = path.resolve(process.cwd(), "prisma", "dev.db").replace(/\\/g, "/");
const adapter = new PrismaLibSql({ url: `file:///${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Renaming departments...");

  // First, ensure the 4 target departments exist
  const targets = [
    { code: "COFFEE", name: "Coffee" },
    { code: "COSMETICS", name: "Cosmetics" },
    { code: "AGRO", name: "Agro Foods" },
    { code: "NUTRA", name: "Nutraceutical" },
  ];

  for (const t of targets) {
    await prisma.department.upsert({
      where: { code: t.code },
      update: { name: t.name },
      create: { name: t.name, code: t.code, head: "Manager" }
    });
  }

  const allDepts = await prisma.department.findMany();
  
  // Reassign map for old departments
  const reassignMap: Record<string, string> = {
    "IT": "COFFEE",
    "OPS": "COSMETICS",
    "FIN": "AGRO",
    "MFG": "NUTRA",
    "LOG": "COFFEE", // fallback
    "nutra": "NUTRA" // Just in case
  };

  const allowedCodes = ["COFFEE", "COSMETICS", "AGRO", "NUTRA"];

  for (const dept of allDepts) {
    if (!allowedCodes.includes(dept.code)) {
      const targetCode = reassignMap[dept.code] || "COFFEE";
      const targetDept = await prisma.department.findUnique({ where: { code: targetCode } });
      
      if (targetDept) {
        // Reassign users
        await prisma.user.updateMany({
          where: { departmentId: dept.id },
          data: { departmentId: targetDept.id }
        });
        
        // Reassign requests
        await prisma.procurementRequest.updateMany({
          where: { departmentId: dept.id },
          data: { departmentId: targetDept.id }
        });

        // Delete old department
        await prisma.department.delete({ where: { id: dept.id } });
        console.log(`Reassigned ${dept.code} to ${targetCode} and deleted old.`);
      }
    }
  }

  console.log("Done!");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
