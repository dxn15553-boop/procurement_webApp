import { defineConfig } from "prisma/config";

const dbUrl = process.env.DATABASE_URL ?? "file:D:/DXN/procurement/prisma/dev.db";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: dbUrl,
  },
});
