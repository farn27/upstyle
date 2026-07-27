/**
 * Request Logging Middleware
 * Logs HTTP requests for debugging and monitoring
 */

/**
 * Log request details
 * @param {Request} request - Request object
 * @param {string} userId - User ID if authenticated
 * @param {number} statusCode - Response status code
 * @param {number} duration - Request duration in ms
 */
export function logRequest(request, userId, statusCode, duration) {
	const url = new URL(request.url);
	const pathname = url.pathname;
	const method = request.method;
	const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
	          request.headers.get('x-real-ip') || 
	          'unknown';
	const userAgent = request.headers.get('user-agent') || 'unknown';

	const logData = {
		timestamp: new Date().toISOString(),
		method,
		pathname,
		statusCode,
		duration,
		ip,
		userAgent,
		userId: userId || 'anonymous'
	};

	// Log different levels based on status code
	if (statusCode >= 500) {
		console.error('[Request] Server Error:', logData);
	} else if (statusCode >= 400) {
		console.warn('[Request] Client Error:', logData);
	} else if (statusCode >= 300) {
		console.info('[Request] Redirect:', logData);
	} else {
		console.log('[Request] Success:', logData);
	}
}

/**
 * Log error with context
 * @param {Error} error - Error object
 * @param {Request} request - Request object
 * @param {string} userId - User ID if authenticated
 */
export function logError(error, request, userId) {
	const url = new URL(request.url);
	const pathname = url.pathname;
	const method = request.method;
	const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
	          request.headers.get('x-real-ip') || 
	          'unknown';

	const errorData = {
		timestamp: new Date().toISOString(),
		method,
		pathname,
		ip,
		userId: userId || 'anonymous',
		error: {
			message: error.message,
			stack: error.stack,
			name: error.name
		}
	};

	console.error('[Error]', errorData);
}

/**
 * Log security event
 * @param {string} eventType - Type of security event
 * @param {Request} request - Request object
 * @param {string} userId - User ID if authenticated
 * @param {object} details - Additional details
 */
export function logSecurityEvent(eventType, request, userId, details = {}) {
	const url = new URL(request.url);
	const pathname = url.pathname;
	const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
	          request.headers.get('x-real-ip') || 
	          'unknown';

	const securityData = {
		timestamp: new Date().toISOString(),
		eventType,
		pathname,
		ip,
		userId: userId || 'anonymous',
		...details
	};

	console.warn('[Security]', securityData);
}

/**
 * Log performance metrics
 * @param {string} operation - Operation name
 * @param {number} duration - Duration in ms
 * @param {object} metadata - Additional metadata
 */
export function logPerformance(operation, duration, metadata = {}) {
	const perfData = {
		timestamp: new Date().toISOString(),
		operation,
		duration,
		...metadata
	};

	// Warn if operation takes too long
	if (duration > 1000) {
		console.warn('[Performance] Slow operation:', perfData);
	} else {
		console.log('[Performance]', perfData);
	}
}
