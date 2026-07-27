/**
 * Error monitoring & logging terpusat.
 * Kirim error ke Sentry via HTTP API (tanpa install @sentry/sveltekit).
 * Fallback ke structured console logging jika SENTRY_DSN tidak ada.
 *
 * Cara pakai:
 *   import { captureError, captureMessage } from '$lib/server/monitoring';
 *   captureError(err, { userId, context: 'payment' });
 */
import { env } from '$env/dynamic/private';

/**
 * Kirim event ke Sentry via Store Endpoint (HTTP API)
 * @param {{ level: string, message: string, extra?: Record<string,unknown>, exception?: unknown }} opts
 */
async function sendToSentry({ level, message, extra = {}, exception }) {
	const dsn = env.SENTRY_DSN;
	if (!dsn) return;

	try {
		// Parse DSN: https://key@host/project_id
		const url = new URL(dsn);
		const [publicKey] = url.username.split(':');
		const projectId = url.pathname.replace('/', '');
		const storeUrl = `${url.protocol}//${url.host}/api/${projectId}/store/`;

		/** @type {Record<string, unknown>} */
		const payload = {
			event_id: crypto.randomUUID().replace(/-/g, ''),
			timestamp: new Date().toISOString(),
			platform: 'node',
			level,
			logger: 'upstyle.server',
			message,
			extra,
			environment: env.NODE_ENV || 'development',
			release: env.npm_package_version || '0.0.1'
		};

		if (exception instanceof Error) {
			payload.exception = {
				values: [
					{
						type: exception.constructor.name,
						value: exception.message,
						stacktrace: {
							frames: (exception.stack || '')
								.split('\n')
								.slice(1)
								.map((line) => ({ filename: line.trim() }))
						}
					}
				]
			};
		}

		await fetch(storeUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${publicKey}, sentry_client=upstyle/1.0`
			},
			body: JSON.stringify(payload)
		});
	} catch {
		// Sentry gagal — tidak perlu crash app utama
	}
}

/**
 * Capture error
 * @param {unknown} err
 * @param {Record<string, unknown>} [context]
 */
export async function captureError(err, context = {}) {
	const message = err instanceof Error ? err.message : String(err);

	if (env.SENTRY_DSN) {
		await sendToSentry({ level: 'error', message, extra: context, exception: err });
	} else {
		console.error('[ERROR]', {
			message,
			stack: err instanceof Error ? err.stack : undefined,
			...context,
			timestamp: new Date().toISOString()
		});
	}
}

/**
 * Capture message/event
 * @param {string} message
 * @param {'info' | 'warning' | 'error'} [level]
 * @param {Record<string, unknown>} [context]
 */
export async function captureMessage(message, level = 'info', context = {}) {
	if (env.SENTRY_DSN) {
		await sendToSentry({ level, message, extra: context });
	} else {
		const logger =
			level === 'error' ? console.error : level === 'warning' ? console.warn : console.info;
		logger(`[${level.toUpperCase()}]`, message, context);
	}
}
