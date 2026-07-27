/**
 * Application Constants
 * Centralized constants for magic numbers and configuration values
 */

// ─── Pagination ─────────────────────────────────────────────────────────
export const PAGINATION = {
	DEFAULT_PAGE: 1,
	DEFAULT_LIMIT: 20,
	MAX_LIMIT: 100
};

// ─── Session ───────────────────────────────────────────────────────────────
export const SESSION = {
	TTL_SECONDS: 24 * 60 * 60, // 24 hours
	TOKEN_LENGTH: 32
};

// ─── Rate Limiting ─────────────────────────────────────────────────────────
export const RATE_LIMIT = {
	WEB_LOGIN: { limit: 5, window: 60 }, // 5 attempts per minute
	WEB_REGISTER: { limit: 3, window: 60 }, // 3 attempts per minute
	API_LOGIN: { limit: 10, window: 60 }, // 10 attempts per minute
	STAFF_LOGIN: { limit: 10, window: 60 }, // 10 attempts per minute
	WA_WEBHOOK: { limit: 100, window: 60 } // 100 requests per minute
};

// ─── File Upload ───────────────────────────────────────────────────────────
export const FILE_UPLOAD = {
	MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
	ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.xlsx', '.csv']
};

// ─── Business Categories ───────────────────────────────────────────────────
export const BUSINESS_CATEGORIES = {
	FNB: {
		name: 'Food & Beverage',
		defaultCategories: ['MAKANAN', 'MINUMAN', 'SNACK']
	},
	FASHION: {
		name: 'Fashion',
		defaultCategories: ['BAJU', 'CELANA', 'AKSESORIS']
	},
	RETAIL: {
		name: 'Retail',
		defaultCategories: ['BARANG JADI', 'BAHAN BAKU']
	},
	UMUM: {
		name: 'Umum',
		defaultCategories: ['UMUM']
	}
};

// ─── Stock ─────────────────────────────────────────────────────────────────
export const STOCK = {
	LOW_STOCK_THRESHOLD: 5,
	OUT_OF_STOCK_THRESHOLD: 0
};

// ─── Accounting ────────────────────────────────────────────────────────────
export const ACCOUNTING = {
	TIMEZONE: '+07:00', // WIB
	DEFAULT_CURRENCY: 'IDR',
	TAX_RATES: {
		PPN: 0.11, // 11%
		PPH_23: 0.02 // 2%
	}
};

// ─── Payroll ─────────────────────────────────────────────────────────────
export const PAYROLL = {
	PTKP: {
		TK0: 54_000_000,
		TK1: 58_500_000,
		TK2: 63_000_000,
		TK3: 67_500_000,
		K0: 58_500_000,
		K1: 63_000_000,
		K2: 67_500_000,
		K3: 72_000_000
	},
	MAX_BIAYA_JABATAN_BULAN: 500_000
};

// ─── Plan Limits ───────────────────────────────────────────────────────────
export const PLAN_LIMITS = {
	FREE: {
		unitLimit: 1,
		storageLimitGB: 1
	},
	PRO_HUB: {
		unitLimit: 5,
		storageLimitGB: 10
	},
	ENTERPRISE: {
		unitLimit: -1, // unlimited
		storageLimitGB: 100
	}
};

// ─── Security ────────────────────────────────────────────────────────────
export const SECURITY = {
	PASSWORD_MIN_LENGTH: 8,
	PASSWORD_MAX_LENGTH: 128,
	CSRF_TTL_SECONDS: 3600, // 1 hour
	ENCRYPTION_KEY_LENGTH: 32
};

// ─── Cache TTL ────────────────────────────────────────────────────────────
export const CACHE_TTL = {
	USER_CACHE: 300, // 5 minutes
	LAYOUT_CACHE: 600, // 10 minutes
	DASHBOARD_CACHE: 300, // 5 minutes
	SESSION_CACHE: 86400 // 24 hours
};

// ─── API Response Codes ────────────────────────────────────────────────────
export const API_CODES = {
	SUCCESS: 'SUCCESS',
	INVALID_JSON: 'INVALID_JSON',
	INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
	OAUTH_ACCOUNT: 'OAUTH_ACCOUNT',
	RATE_LIMITED: 'RATE_LIMITED',
	UNAUTHORIZED: 'UNAUTHORIZED',
	VALIDATION_ERROR: 'VALIDATION_ERROR',
	SERVER_ERROR: 'SERVER_ERROR',
	FORBIDDEN: 'FORBIDDEN',
	NOT_FOUND: 'NOT_FOUND'
};

// ─── Status Codes ─────────────────────────────────────────────────────────
export const HTTP_STATUS = {
	OK: 200,
	CREATED: 201,
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	UNPROCESSABLE_ENTITY: 422,
	TOO_MANY_REQUESTS: 429,
	INTERNAL_SERVER_ERROR: 500
};
