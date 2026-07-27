/**
 * Query Result Caching Utility
 * Uses Redis for caching frequently accessed data
 */
import { redis } from './redis';

const DEFAULT_TTL = 300; // 5 minutes default cache time

/**
 * Get cached data
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Cached data or null if not found
 */
export async function getCached(key) {
	try {
		const cached = await redis.get(key);
		if (cached) {
			return JSON.parse(cached);
		}
		return null;
	} catch (err) {
		console.error('[Cache] Error getting cache:', err);
		return null;
	}
}

/**
 * Set cached data
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time to live in seconds (default: 300)
 * @returns {Promise<boolean>} Success status
 */
export async function setCached(key, data, ttl = DEFAULT_TTL) {
	try {
		await redis.set(key, JSON.stringify(data), { ex: ttl });
		return true;
	} catch (err) {
		console.error('[Cache] Error setting cache:', err);
		return false;
	}
}

/**
 * Delete cached data
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} Success status
 */
export async function deleteCached(key) {
	try {
		await redis.del(key);
		return true;
	} catch (err) {
		console.error('[Cache] Error deleting cache:', err);
		return false;
	}
}

/**
 * Delete multiple cache keys by pattern
 * @param {string} pattern - Key pattern (e.g., "user:*")
 * @returns {Promise<number>} Number of keys deleted
 */
export async function deleteCachedPattern(pattern) {
	try {
		const keys = await redis.keys(pattern);
		if (keys.length > 0) {
			await redis.del(...keys);
		}
		return keys.length;
	} catch (err) {
		console.error('[Cache] Error deleting cache pattern:', err);
		return 0;
	}
}

/**
 * Get or set pattern - fetch from cache if available, otherwise compute and cache
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Function to fetch data if not cached
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<any>} Cached or fetched data
 */
export async function getOrSetCached(key, fetchFn, ttl = DEFAULT_TTL) {
	const cached = await getCached(key);
	if (cached !== null) {
		return cached;
	}

	const data = await fetchFn();
	await setCached(key, data, ttl);
	return data;
}

/**
 * Cache key generators for common patterns
 */
export const cacheKeys = {
	// User data
	user: (userId) => `user:${userId}`,
	userSession: (userId) => `session:${userId}`,
	
	// Unit data
	unit: (unitId) => `unit:${unitId}`,
	unitSettings: (unitId) => `unit:${unitId}:settings`,
	
	// Products
	product: (productId) => `product:${productId}`,
	productsList: (unitId, page = 1) => `products:${unitId}:page:${page}`,
	productStock: (productId) => `product:${productId}:stock`,
	
	// CRM
	crmContact: (contactId) => `crm:contact:${contactId}`,
	crmDeals: (unitId) => `crm:deals:${unitId}`,
	crmActivities: (unitId) => => `crm:activities:${unitId}`,
	
	// Finance
	transactions: (unitId, page = 1) => `finance:transactions:${unitId}:page:${page}`,
	dashboardStats: (unitId) => `finance:dashboard:${unitId}`,
	chartOfAccounts: (unitId) => `finance:coa:${unitId}`,
	
	// HR
	employees: (unitId) => `hr:employees:${unitId}`,
	employeeAttendance: (unitId) => `hr:attendance:${unitId}`,
	
	// POS
	posOrders: (unitId) => `pos:orders:${unitId}`,
	posCustomers: (unitId) => => `pos:customers:${unitId}`,
	
	// E-commerce
	ecommerceProducts: (unitId) => `ecommerce:products:${unitId}`,
	ecommerceOrders: (unitId) => `ecommerce:orders:${unitId}`,
};
