// seed.cjs — run with: node prisma/seed.cjs
const { PrismaClient } = require("@prisma/client");
const { PrismaLibSql } = require("@prisma/adapter-libsql");
const bcrypt = require("bcryptjs");
const path = require("path");

const dbPath = path.resolve(process.cwd(), "prisma", "dev.db").replace(/\\/g, "/");
const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Create departments
  const departments = await Promise.all([
    prisma.department.upsert({ where: { code: "IT" }, update: {}, create: { name: "Information Technology", code: "IT", head: "John Smith" } }),
    prisma.department.upsert({ where: { code: "OPS" }, update: {}, create: { name: "Operations", code: "OPS", head: "Sarah Johnson" } }),
    prisma.department.upsert({ where: { code: "FIN" }, update: {}, create: { name: "Finance", code: "FIN", head: "Michael Chen" } }),
    prisma.department.upsert({ where: { code: "MFG" }, update: {}, create: { name: "Manufacturing", code: "MFG", head: "David Lee" } }),
    prisma.department.upsert({ where: { code: "LOG" }, update: {}, create: { name: "Logistics", code: "LOG", head: "Emma Wilson" } }),
  ]);
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
    create: { name: "Alex Manager", email: "manager@procurex.com", passwordHash: managerHash, role: "MANAGER", departmentId: departments[0].id },
  });

  const teamMember = await prisma.user.upsert({
    where: { email: "team@procurex.com" },
    update: {},
    create: { name: "Sam Team", email: "team@procurex.com", passwordHash: teamHash, role: "TEAM", departmentId: departments[1].id },
  });

  const teamMember2 = await prisma.user.upsert({
    where: { email: "team2@procurex.com" },
    update: {},
    create: { name: "Jane Procurement", email: "team2@procurex.com", passwordHash: teamHash, role: "TEAM", departmentId: departments[2].id },
  });

  console.log(`✅ Created users: ${manager.email}, ${teamMember.email}, ${teamMember2.email}`);

  // Create sample procurement requests
  const now = new Date();
  const daysAgo = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  const sampleRequests = [
    {
      sourceNo: "SRC-2601-0001",
      sourceDate: daysAgo(45),
      sourceDescription: "Purchase of 10 Dell Laptops for IT Department upgrade",
      departmentId: departments[0].id,
      vendorId: vendors[0].id,
      comparativeDate: daysAgo(38),
      daysForCS: 7,
      csStatus: "COMPLETED",
      prNumber: "PR-2601-0001",
      prDate: daysAgo(25),
      daysForPR: 13,
      prStatus: "APPROVED",
      poNumber: "PO-2601-0001",
      poDate: daysAgo(18),
      nameOfHandler: "Sam Team",
      currentStage: "MDD",
      pendingFrom: daysAgo(18),
      pendingDays: 18,
      noOfDays: 45,
      slaStatus: "AT_RISK",
      createdById: teamMember.id,
    },
    {
      sourceNo: "SRC-2601-0002",
      sourceDate: daysAgo(20),
      sourceDescription: "Office Furniture - 50 chairs, 20 desks for Operations wing",
      departmentId: departments[1].id,
      vendorId: vendors[1].id,
      comparativeDate: daysAgo(13),
      daysForCS: 7,
      csStatus: "COMPLETED",
      prNumber: "PR-2601-0002",
      prDate: daysAgo(5),
      daysForPR: 8,
      prStatus: "IN_PROGRESS",
      nameOfHandler: "Sam Team",
      currentStage: "PR",
      pendingFrom: daysAgo(5),
      pendingDays: 5,
      noOfDays: 20,
      slaStatus: "ON_TRACK",
      createdById: teamMember.id,
    },
    {
      sourceNo: "SRC-2601-0003",
      sourceDate: daysAgo(60),
      sourceDescription: "Industrial Generator 500KVA for Manufacturing Plant",
      departmentId: departments[3].id,
      vendorId: vendors[3].id,
      comparativeDate: daysAgo(52),
      daysForCS: 8,
      csStatus: "COMPLETED",
      prNumber: "PR-2601-0003",
      prDate: daysAgo(40),
      daysForPR: 12,
      prStatus: "APPROVED",
      poNumber: "PO-2601-0003",
      poDate: daysAgo(30),
      prlNo: "PRL-0001",
      prlDate: daysAgo(28),
      materialDispatchDate: daysAgo(5),
      nameOfHandler: "Jane Procurement",
      currentStage: "MRD",
      pendingFrom: daysAgo(5),
      pendingDays: 5,
      noOfDays: 60,
      slaStatus: "ON_TRACK",
      createdById: teamMember2.id,
    },
    {
      sourceNo: "SRC-2601-0004",
      sourceDate: daysAgo(90),
      sourceDescription: "Annual Software License Renewal - SAP, Office 365, Antivirus",
      departmentId: departments[0].id,
      vendorId: vendors[0].id,
      comparativeDate: daysAgo(82),
      daysForCS: 8,
      csStatus: "COMPLETED",
      prNumber: "PR-2601-0004",
      prDate: daysAgo(68),
      daysForPR: 14,
      prStatus: "APPROVED",
      poNumber: "PO-2601-0004",
      poDate: daysAgo(55),
      materialDispatchDate: daysAgo(45),
      materialReceivedDate: daysAgo(40),
      workCompletionDate: daysAgo(35),
      nameOfHandler: "Jane Procurement",
      currentStage: "COMPLETED",
      noOfDays: 90,
      slaStatus: "COMPLETED",
      createdById: teamMember2.id,
    },
    {
      sourceNo: "SRC-2601-0005",
      sourceDate: daysAgo(5),
      sourceDescription: "Emergency procurement of safety equipment for Logistics team",
      departmentId: departments[4].id,
      vendorId: vendors[2].id,
      nameOfHandler: "Sam Team",
      currentStage: "CS",
      pendingFrom: daysAgo(5),
      pendingDays: 5,
      noOfDays: 5,
      slaStatus: "ON_TRACK",
      createdById: teamMember.id,
    },
  ];

  for (const req of sampleRequests) {
    await prisma.procurementRequest.upsert({
      where: { sourceNo: req.sourceNo },
      update: {},
      create: req,
    });
  }

  console.log(`✅ Created ${sampleRequests.length} sample procurement requests`);
  console.log("\n🎉 Seeding complete!\n");
  console.log("📧 Login credentials:");
  console.log("   Manager: manager@procurex.com / manager123");
  console.log("   Team:    team@procurex.com / team123");
  console.log("   Team2:   team2@procurex.com / team123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
