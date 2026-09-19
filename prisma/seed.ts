import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  console.log("🌱 Seeding database...");

  // Create departments
  // Create departments
  const departmentNames = [
    "Quality Control", "Quality Assurance", "Security", "Environment, Health & Safety", "Ganoderma",
    "Hospitality", "Administration", "Human Resources", "Information Technology",
    "Publication", "Finance", "Coffee", "Cosmetics & Toiletries", "Wet Food", "Kombucha", "Agro Food", "Agronomy", "Nutraceutical", "Inventory Warehouse", "Engineering", "Plant Maintenance Department"
  ];

  const departments = await Promise.all(
    departmentNames.map((name) =>
      prisma.department.upsert({
        where: { code: name.toUpperCase().replace(/\s+/g, "_") },
        update: { name },
        create: { name, code: name.toUpperCase().replace(/\s+/g, "_"), head: "Manager" }
      })
    )
  );

  console.log(`✅ Created ${departments.length} departments`);

  // Create vendors
  const vendors = await Promise.all([
    prisma.vendor.upsert({ where: { code: "V001" }, update: {}, create: { name: "Tech Supplies Co.", code: "V001", contactPerson: "Alice Brown", email: "alice@techsupplies.com", phone: "+1-555-0101" } }),
    prisma.vendor.upsert({ where: { code: "V002" }, update: {}, create: { name: "Global Materials Ltd.", code: "V002", contactPerson: "Bob Davis", email: "bob@globalmaterials.com", phone: "+1-555-0102" } }),
    prisma.vendor.upsert({ where: { code: "V003" }, update: {}, create: { name: "Industrial Parts Inc.", code: "V003", contactPerson: "Carol Evans", email: "carol@industrialparts.com", phone: "+1-555-0103" } }),
    prisma.vendor.upsert({ where: { code: "V004" }, update: {}, create: { name: "Premium Equipment Corp.", code: "V004", contactPerson: "Dan Foster", email: "dan@premiumequip.com", phone: "+1-555-0104" } }),
  ]);

  console.log(`✅ Created ${vendors.length} vendors`);

  // Create users
  const managerHash = await bcrypt.hash("manager123", 12);
  const teamHash = await bcrypt.hash("team123", 12);

  const manager = await prisma.user.upsert({
    where: { email: "manager@procurex.com" },
    update: {},
    create: {
      name: "Nagendra",
      email: "manager@procurex.com",
      passwordHash: managerHash,
      role: "MANAGER",
      departmentId: departments[0].id,
    },
  });

  console.log(`✅ Manager account ready: ${manager.email}`);
  console.log("\n🎉 Seeding complete!\n");
  console.log("📧 Login credentials:");
  console.log("   Manager: manager@procurex.com / manager123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
