/**
 * Standar format response JSON untuk semua endpoint API mobile & server.
 * Konsisten di seluruh codebase.
 */
import { json } from '@sveltejs/kit';

/**
 * Response sukses
 * @param {unknown} data
 * @param {string} [message]
 * @param {number} [status]
 */
export function apiSuccess(data, message = 'OK', status = 200) {
	return json(
		{
			success: true,
			message,
			data: data ?? null
		},
		{ status }
	);
}

/**
 * Response error
 * @param {string} message
 * @param {number} [status]
 * @param {string} [code]  - error code machine-readable (misal 'INVALID_CREDENTIALS')
 * @param {unknown} [details]
 */
export function apiError(message, status = 400, code, details) {
	/** @type {Record<string, unknown>} */
	const body = {
		success: false,
		message,
		...(code ? { code } : {}),
		...(details !== undefined ? { details } : {})
	};
	return json(body, { status });
}

/**
 * Response rate limit exceeded
 * @param {number} retryAfter - detik sampai bisa coba lagi
 */
export function apiRateLimit(retryAfter = 60) {
	return json(
		{
			success: false,
			message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(retryAfter / 60)} menit.`,
			code: 'RATE_LIMIT_EXCEEDED',
			retryAfter
		},
		{
			status: 429,
			headers: {
				'Retry-After': String(retryAfter)
			}
		}
	);
}

/**
 * Response unauthorized
 * @param {string} [message]
 */
export function apiUnauthorized(message = 'Anda tidak memiliki akses. Silakan login terlebih dahulu.') {
	return json({ success: false, message, code: 'UNAUTHORIZED' }, { status: 401 });
}

/**
 * Response validation error (Zod)
 * @param {import('zod').ZodError} zodError
 */
export function apiValidationError(zodError) {
	let errorsList = [];
	if (zodError && Array.isArray(zodError.errors)) {
		errorsList = zodError.errors;
	} else if (zodError && Array.isArray(zodError.issues)) {
		errorsList = zodError.issues;
	} else if (zodError && typeof zodError.message === 'string') {
		try {
			errorsList = JSON.parse(zodError.message);
			if (!Array.isArray(errorsList)) errorsList = [{ message: zodError.message }];
		} catch (e) {
			errorsList = [{ message: zodError.message }];
		}
	} else {
		errorsList = [{ message: 'Unknown validation error' }];
	}

	const details = errorsList.map((e) => ({
		field: Array.isArray(e.path) ? e.path.join('.') : '',
		message: e.message || String(e)
	}));
	return json(
		{
			success: false,
			message: 'Validasi gagal: ' + details.map((d) => `${d.field ? d.field + ' ' : ''}${d.message}`).join(', '),
			code: 'VALIDATION_ERROR',
			details
		},
		{ status: 422 }
	);
}
