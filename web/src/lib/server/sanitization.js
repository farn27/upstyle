/**
 * Input Sanitization Utility
 * Prevents XSS attacks by sanitizing user input
 */

/**
 * Sanitize string input to prevent XSS attacks
 * @param {string} input - Raw user input
 * @returns {string} Sanitized string
 */
export function sanitizeString(input) {
	if (typeof input !== 'string') {
		return input;
	}
	
	// Remove potentially dangerous characters
	return input
		.replace(/[<>]/g, '') // Remove < and >
		.replace(/javascript:/gi, '') // Remove javascript: protocol
		.replace(/on\w+=/gi, '') // Remove event handlers like onclick=
		.replace(/data:/gi, '') // Remove data: protocol
		.trim();
}

/**
 * Sanitize object by recursively sanitizing all string properties
 * @param {object} obj - Object to sanitize
 * @returns {object} Sanitized object
 */
export function sanitizeObject(obj) {
	if (typeof obj !== 'object' || obj === null) {
		return obj;
	}

	if (Array.isArray(obj)) {
		return obj.map(item => sanitizeObject(item));
	}

	const sanitized = {};
	for (const key in obj) {
		if (obj.hasOwnProperty(key)) {
			if (typeof obj[key] === 'string') {
				sanitized[key] = sanitizeString(obj[key]);
			} else if (typeof obj[key] === 'object') {
				sanitized[key] = sanitizeObject(obj[key]);
			} else {
				sanitized[key] = obj[key];
			}
		}
	}
	return sanitized;
}

/**
 * Sanitize HTML content (allow basic tags)
 * @param {string} html - HTML content
 * @returns {string} Sanitized HTML
 */
export function sanitizeHtml(html) {
	if (typeof html !== 'string') {
		return html;
	}

	// Allow only safe HTML tags
	const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'a', 'span'];
	
	// Remove all tags except allowed ones
	return html.replace(/<([^>]+)>/g, (match, tag) => {
		const tagName = tag.split(' ')[0].replace(/[\/]/g, '');
		if (allowedTags.includes(tagName)) {
			return match;
		}
		return '';
	});
}

/**
 * Validate and sanitize email
 * @param {string} email - Email address
 * @returns {string|null} Sanitized email or null if invalid
 */
export function sanitizeEmail(email) {
	if (typeof email !== 'string') {
		return null;
	}

	const sanitized = email.trim().toLowerCase();
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	
	return emailRegex.test(sanitized) ? sanitized : null;
}

/**
 * Sanitize phone number
 * @param {string} phone - Phone number
 * @returns {string} Sanitized phone number
 */
export function sanitizePhone(phone) {
	if (typeof phone !== 'string') {
		return phone;
	}

	// Keep only digits and common phone characters
	return phone.replace(/[^\d\+\-\(\)\s]/g, '');
}

/**
 * Sanitize URL
 * @param {string} url - URL string
 * @returns {string|null} Sanitized URL or null if invalid
 */
export function sanitizeUrl(url) {
	if (typeof url !== 'string') {
		return null;
	}

	try {
		const parsed = new URL(url);
		// Only allow http and https protocols
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
			return null;
		}
		return parsed.toString();
	} catch {
		return null;
	}
}

/**
 * Sanitize numeric input
 * @param {string|number} input - Numeric input
 * @returns {number|null} Sanitized number or null if invalid
 */
export function sanitizeNumber(input) {
	if (typeof input === 'number') {
		return isNaN(input) ? null : input;
	}
	
	if (typeof input === 'string') {
		const num = parseFloat(input);
		return isNaN(num) ? null : num;
	}
	
	return null;
}

/**
 * Sanitize ID (alphanumeric and underscores only)
 * @param {string} id - ID string
 * @returns {string|null} Sanitized ID or null if invalid
 */
export function sanitizeId(id) {
	if (typeof id !== 'string') {
		return null;
	}

	const sanitized = id.replace(/[^a-zA-Z0-9_\-]/g, '');
	return sanitized.length > 0 ? sanitized : null;
}
