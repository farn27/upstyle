import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { redis } from '$lib/server/redis';

/**
 * Health Check Endpoint
 * Monitors system health and dependencies
 */
export async function GET({ request }) {
	const startTime = Date.now();
	const health = {
		status: 'healthy',
		timestamp: new Date().toISOString(),
		checks: {}
	};

	// Database health check
	try {
		await db.execute('SELECT 1');
		health.checks.database = {
			status: 'healthy',
			latency: Date.now() - startTime
		};
	} catch (error) {
		health.status = 'degraded';
		console.error('[health] database', error instanceof Error ? error.message : error);
		health.checks.database = { status: 'unhealthy' };
	}

	// Redis health check
	try {
		if (!redis) throw new Error('Redis belum dikonfigurasi');
		await redis.ping();
		health.checks.redis = {
			status: 'healthy',
			latency: Date.now() - startTime
		};
	} catch (error) {
		health.status = 'degraded';
		console.error('[health] redis', error instanceof Error ? error.message : error);
		health.checks.redis = { status: 'unhealthy' };
	}

	// Overall status
	const totalLatency = Date.now() - startTime;
	health.latency = totalLatency;

	// Return appropriate status code
	const statusCode = health.status === 'healthy' ? 200 : 503;

	return json(health, { status: statusCode, headers: { 'cache-control': 'no-store' } });
}
