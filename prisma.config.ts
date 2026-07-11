import { defineConfig } from "prisma/config";
import dotenv from "dotenv";

dotenv.config();

const dbUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: dbUrl,
  },
});
