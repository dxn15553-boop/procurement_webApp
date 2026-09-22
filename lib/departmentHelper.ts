import { prisma } from "@/lib/prisma";

const DEPARTMENT_ALIASES: Record<string, string> = {
  admin: "Administration",
  administration: "Administration",

  hr: "Human Resources",
  "human resource": "Human Resources",
  "human resources": "Human Resources",

  ehs: "Environment, Health & Safety",
  "environment health & safety": "Environment, Health & Safety",
  "environment, health & safety": "Environment, Health & Safety",
  "environment health and safety": "Environment, Health & Safety",

  it: "Information Technology",
  "it systems": "Information Technology",
  "it department": "Information Technology",
  "information technology": "Information Technology",
  "information tech": "Information Technology",

  cosmetic: "Cosmetics & Toiletries",
  cosmetics: "Cosmetics & Toiletries",
  "cosmetics & toiletry": "Cosmetics & Toiletries",
  "cosmetics & toiletries": "Cosmetics & Toiletries",
  "cosmetics and toiletries": "Cosmetics & Toiletries",

  iwh: "Inventory Warehouse",
  "inventory warehouse": "Inventory Warehouse",
  warehouse: "Inventory Warehouse",
  inventory: "Inventory Warehouse",

  maintenance: "Plant Maintenance Department",
  "plant maintenance": "Plant Maintenance Department",
  "plant maintenance department": "Plant Maintenance Department",
  pmd: "Plant Maintenance Department",

  qc: "Quality Control",
  "quality control": "Quality Control",
  qa: "Quality Assurance",
  "quality assurance": "Quality Assurance",
  "qc/qa": "Quality Control",
  "qc qa": "Quality Control",
  "wet food -qc": "Quality Control",
  "wet food qc": "Quality Control",

  "h&m": "Hospitality",
  "h & m": "Hospitality",
  hospitality: "Hospitality",

  agrofood: "Agro Food",
  "agro food": "Agro Food",

  wetfood: "Wet Food",
  "wet food": "Wet Food",

  publication: "Publication",
  nutraceutical: "Nutraceutical",
  ganoderma: "Ganoderma",
  agronomy: "Agronomy",
  coffee: "Coffee",
  kombucha: "Kombucha",
  spirulina: "Spirulina",
  microbiology: "Microbiology",
  engineering: "Engineering",
  finance: "Finance",
  security: "Security",
  "r & d": "R & D",
  "r&d": "R & D",
  rd: "R & D",
  "legal & secretarial": "Legal & Secretarial",
  operations: "Operations",
};

function generateCleanCode(name: string, fallback: string): string {
  const clean = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return clean || fallback;
}

/**
 * Resolves a department by ID, name, or code without creating duplicates.
 * 1. Checks if input is an existing department ID.
 * 2. Resolves aliases (e.g., "Admin" -> "Administration", "HR" -> "Human Resources").
 * 3. Matches existing active department by exact name (case-insensitive).
 * 4. Matches existing active department by code (case-insensitive).
 * 5. Only creates a new department if no match is found.
 */
export async function resolveDepartmentId(input: string | null | undefined): Promise<string | null> {
  if (!input || !input.trim()) return null;
  const trimmed = input.trim();
  const lowerKey = trimmed.toLowerCase();

  // 1. Direct ID match
  const byId = await prisma.department.findUnique({
    where: { id: trimmed },
    select: { id: true },
  });
  if (byId) return byId.id;

  // 2. Check alias map (e.g. "Admin" -> "Administration", "HR" -> "Human Resources")
  const canonicalName = DEPARTMENT_ALIASES[lowerKey] || trimmed;

  // 3. Case-insensitive Name match (try canonical name first, then trimmed input)
  const byName = await prisma.department.findFirst({
    where: {
      OR: [
        { name: { equals: canonicalName, mode: "insensitive" } },
        { name: { equals: trimmed, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  if (byName) return byName.id;

  // 4. Code match (e.g., standard code or sanitized name)
  const candidateCode = generateCleanCode(canonicalName, "DEPT");
  const byCode = await prisma.department.findFirst({
    where: {
      OR: [
        { code: { equals: candidateCode, mode: "insensitive" } },
        { code: { equals: canonicalName.toUpperCase(), mode: "insensitive" } },
        { code: { equals: trimmed.toUpperCase(), mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  if (byCode) return byCode.id;

  // 5. Create new department if none found
  let code = candidateCode;
  let counter = 1;
  while (await prisma.department.findUnique({ where: { code } })) {
    code = `${candidateCode}_${counter}`;
    counter++;
  }

  const created = await prisma.department.create({
    data: {
      name: canonicalName,
      code,
      isActive: true,
    },
    select: { id: true },
  });

  return created.id;
}

/**
 * Resolves a vendor by ID, name, or code without creating duplicates.
 * 1. Checks if input is an existing vendor ID.
 * 2. Matches existing vendor by exact name (case-insensitive).
 * 3. Matches existing vendor by code (case-insensitive).
 * 4. Only creates a new vendor if no match is found.
 */
export async function resolveVendorId(input: string | null | undefined): Promise<string | null> {
  if (!input || !input.trim()) return null;
  const trimmed = input.trim();

  // 1. Direct ID match
  const byId = await prisma.vendor.findUnique({
    where: { id: trimmed },
    select: { id: true },
  });
  if (byId) return byId.id;

  // 2. Case-insensitive Name match
  const byName = await prisma.vendor.findFirst({
    where: {
      name: { equals: trimmed, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (byName) return byName.id;

  // 3. Code match
  const candidateCode = generateCleanCode(trimmed, "VEND");
  const byCode = await prisma.vendor.findFirst({
    where: {
      OR: [
        { code: { equals: candidateCode, mode: "insensitive" } },
        { code: { equals: trimmed.toUpperCase(), mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  if (byCode) return byCode.id;

  // 4. Create new vendor if none found
  let code = candidateCode;
  let counter = 1;
  while (await prisma.vendor.findUnique({ where: { code } })) {
    code = `${candidateCode}_${counter}`;
    counter++;
  }

  const created = await prisma.vendor.create({
    data: {
      name: trimmed,
      code,
      isActive: true,
    },
    select: { id: true },
  });

  return created.id;
}
