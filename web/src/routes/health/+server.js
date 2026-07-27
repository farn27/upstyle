/**
 * GET /health
 * Health check endpoint untuk Docker/load balancer.
 * Cek koneksi database dan Redis.
 */
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { sql } from 'drizzle-orm';
import { redis } from '$lib/server/redis';

export async function GET() {
	const start = Date.now();
	const checks = {};
	let healthy = true;

	// Check DB
	try {
		await db.execute(sql`SELECT 1`);
		checks.database = 'ok';
	} catch (err) {
		checks.database = 'error';
		healthy = false;
	}

	// Check Redis
	try {
		await redis.ping();
		checks.redis = 'ok';
	} catch (err) {
		checks.redis = 'error';
		healthy = false;
	}

	const latency = Date.now() - start;

	return json(
		{
			status: healthy ? 'ok' : 'degraded',
			checks,
			latency_ms: latency,
			timestamp: new Date().toISOString(),
			version: process.env.npm_package_version || '0.0.1'
		},
		{ status: healthy ? 200 : 503 }
	);
}
