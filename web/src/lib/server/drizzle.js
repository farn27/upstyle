import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { env } from '$env/dynamic/private';
import * as schema from './schema.js';
import * as relations from './relations.ts';
import { businessPlans, businessPlanSeedLogs } from './businessPlanSchema.js';

const connectionString = env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL is not defined in the environment variables. Please check your .env file.");
}

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
    keepAliveInitialDelay: 0     // Initial delay before keep-alive (ms)
});

export const db = drizzle(pool, { 
    schema: { ...schema, ...relations, businessPlans, businessPlanSeedLogs },
    mode: "default",
    logger: env.NODE_ENV !== 'production' && env.DB_LOGGER === 'true'
});
