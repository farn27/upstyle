import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { redis } from '$lib/server/redis';
import { env } from '$env/dynamic/private';

/**
 * Health Check Endpoint
 * Monitors system health and dependencies
 */
export async function GET({ request }) {
	const startTime = Date.now();
	const health = {
		status: 'healthy',
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
		version: env.NODE_ENV || 'development',
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
		health.checks.database = {
			status: 'unhealthy',
			error: error.message
		};
	}

	// Redis health check
	try {
		await redis.ping();
		health.checks.redis = {
			status: 'healthy',
			latency: Date.now() - startTime
		};
	} catch (error) {
		health.status = 'degraded';
		health.checks.redis = {
			status: 'unhealthy',
			error: error.message
		};
	}

	// Memory usage
	const memoryUsage = process.memoryUsage();
	health.checks.memory = {
		status: 'healthy',
		heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
		heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
		rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`
	};

	// Overall status
	const totalLatency = Date.now() - startTime;
	health.latency = totalLatency;

	// Return appropriate status code
	const statusCode = health.status === 'healthy' ? 200 : 503;

	return json(health, { status: statusCode });
}
