import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  dialect: "mysql",
  schema: "./src/lib/server/schema.js",
  out: "./drizzle/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL || "mysql://root:@localhost:3306/finance_engine_db",
  },
  // Jangan drop kolom secara otomatis — harus eksplisit
  breakpoints: true,
  strict: true,
  verbose: true,
});