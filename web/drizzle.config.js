import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Manually load .env to ensure all vars are available
dotenv.config();

// Also try to read .env directly in case dotenv didn't pick it up
try {
  const envPath = join(dirname(fileURLToPath(import.meta.url)), '.env');
  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
} catch (e) {}

const dbUrl = process.env.DATABASE_URL || "mysql://root:@localhost:3306/finance_engine_db";
const isTiDB = dbUrl.includes('tidbcloud');

let dbCredentials;
if (isTiDB) {
  // Parse URL components from DATABASE_URL
  const url = new URL(dbUrl.replace('mysql://', 'http://'));
  dbCredentials = {
    host: url.hostname,
    port: Number(url.port) || 4000,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace('/', '') || 'finance_db',
    ssl: { rejectUnauthorized: true }
  };
} else {
  dbCredentials = { url: dbUrl };
}

export default defineConfig({
  dialect: "mysql",
  schema: "./src/lib/server/schema.js",
  out: "./drizzle/migrations",
  dbCredentials,
  breakpoints: true,
  strict: true,
  verbose: true,
});