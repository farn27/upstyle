/**
 * CSRF Protection Utility
 * Generates and validates CSRF tokens for form submissions
 */
import crypto from 'crypto';

const CSRF_SECRET = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');
const CSRF_TOKEN_LENGTH = 32;
const CSRF_TTL = 3600; // 1 hour in seconds

/**
 * Generate a CSRF token
 * @param {string} sessionId - User session ID
 * @returns {string} CSRF token
 */
export function generateCsrfToken(sessionId) {
	const timestamp = Date.now();
	const data = `${sessionId}:${timestamp}`;
	const signature = crypto
		.createHmac('sha256', CSRF_SECRET)
		.update(data)
		.digest('hex');
	
	return Buffer.from(`${data}:${signature}`).toString('base64url');
}

/**
 * Validate a CSRF token
 * @param {string} token - CSRF token to validate
 * @param {string} sessionId - User session ID
 * @returns {boolean} True if valid
 */
export function validateCsrfToken(token, sessionId) {
	try {
		const decoded = Buffer.from(token, 'base64url').toString('utf-8');
		const [storedSessionId, timestamp, signature] = decoded.split(':');
		
		// Check session ID matches
		if (storedSessionId !== sessionId) {
			return false;
		}
		
		// Check token age
		const tokenAge = (Date.now() - parseInt(timestamp)) / 1000;
		if (tokenAge > CSRF_TTL) {
			return false;
		}
		
		// Verify signature
		const data = `${storedSessionId}:${timestamp}`;
		const expectedSignature = crypto
			.createHmac('sha256', CSRF_SECRET)
			.update(data)
			.digest('hex');
		
		return signature === expectedSignature;
	} catch (err) {
		console.error('[CSRF] Validation error:', err);
		return false;
	}
}

/**
 * Generate CSRF token for HTML forms
 * @param {string} sessionId - User session ID
 * @returns {string} CSRF token
 */
export function getCsrfTokenForForm(sessionId) {
	return generateCsrfToken(sessionId);
}
