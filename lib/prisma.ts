import { PrismaClient } from "@prisma/client";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaLibSql } = require("@prisma/adapter-libsql");

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL ?? "file:D:/DXN/procurement/prisma/dev.db";
  const adapter = new PrismaLibSql({ url: dbUrl });
  return new PrismaClient({ adapter, log: ["error"] });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
