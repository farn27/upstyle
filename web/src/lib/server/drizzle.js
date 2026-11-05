import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { env } from '$env/dynamic/private';
import { building } from '$app/environment';
import * as schema from './schema.js';
import * as relations from './relations.ts';
import { businessPlans, businessPlanSeedLogs } from './businessPlanSchema.js';

// Placeholder HANYA saat build (analisis SvelteKit). Saat server jalan, env wajib ada supaya
// salah konfigurasi langsung kelihatan, bukan error membingungkan di tengah request.
if (!env.DATABASE_URL && !building) {
    throw new Error("DATABASE_URL is not defined in the environment variables. Please check your .env file.");
}
const connectionString = env.DATABASE_URL || 'mysql://build_placeholder:build_placeholder@localhost:3306/build_placeholder';

const isTiDB = connectionString.includes('tidbcloud') || connectionString.includes('ssl=');

export const pool = mysql.createPool({
    uri: connectionString,
    ...(isTiDB ? { ssl: { rejectUnauthorized: true } } : {}),
    timezone: '+07:00',          // WIB — semua datetime otomatis WIB
    dateStrings: true,           // Biar return raw string dari MySQL, menghindari masalah JS Date parsing
    connectionLimit: 10,         // Maximum connections in pool
    queueLimit: 0,               // Unlimited queue for pending connection requests
    waitForConnections: true,    // Wait for available connection
    enableKeepAlive: true,       // Enable TCP keep-alive
    keepAliveInitialDelay: 10000, // 10 second delay before keep-alive packets
    connectTimeout: 10000,       // 10 second connection timeout
    idleTimeout: 60000           // Release idle connections after 60s
});

export const db = drizzle(pool, { 
    schema: { ...schema, ...relations, businessPlans, businessPlanSeedLogs },
    mode: "default",
    logger: env.NODE_ENV !== 'production' && env.DB_LOGGER === 'true'
});
