/**
 * Feature Flags System
 * Allows enabling/disabling features dynamically without code deployment
 */
import { redis } from './redis';
import { env } from '$env/dynamic/private';

/**
 * Default feature flags configuration
 */
const DEFAULT_FLAGS = {
	// New features
	new_dashboard: false,
	ai_recommendations: true,
	advanced_analytics: false,
	
	// Beta features
	beta_payment_gateway: false,
	beta_inventory_sync: true,
	
	// Experimental features
	experimental_chat: false,
	experimental_reports: false,
	
	// Maintenance flags
	maintenance_mode: false,
	read_only_mode: false,
	
	// Performance features
	enable_caching: true,
	enable_compression: true,
	
	// Security features
	strict_rate_limiting: false,
	advanced_audit_logging: false
};

/**
 * Get feature flag value
 * @param {string} flagName - Name of the feature flag
 * @param {boolean} defaultValue - Default value if flag not found
 * @returns {Promise<boolean>} Flag value
 */
export async function getFeatureFlag(flagName, defaultValue = false) {
	try {
		// Check Redis first
		const cached = await redis.get(`feature_flag:${flagName}`);
		if (cached !== null) {
			return cached === 'true';
		}

		// Fall back to default
		return DEFAULT_FLAGS[flagName] ?? defaultValue;
	} catch (error) {
		console.error('[FeatureFlags] Error getting flag:', error);
		return DEFAULT_FLAGS[flagName] ?? defaultValue;
	}
}

/**
 * Set feature flag value
 * @param {string} flagName - Name of the feature flag
 * @param {boolean} value - Flag value
 * @returns {Promise<boolean>} Success status
 */
export async function setFeatureFlag(flagName, value) {
	try {
		await redis.set(`feature_flag:${flagName}`, value.toString(), { ex: 86400 }); // 24 hours TTL
		return true;
	} catch (error) {
		console.error('[FeatureFlags] Error setting flag:', error);
		return false;
	}
}

/**
 * Get all feature flags
 * @returns {Promise<object>} All flags
 */
export async function getAllFeatureFlags() {
	try {
		const flags = { ...DEFAULT_FLAGS };

		// Get all flag keys from Redis
		const keys = await redis.keys('feature_flag:*');
		
		for (const key of keys) {
			const flagName = key.replace('feature_flag:', '');
			const value = await redis.get(key);
			if (value !== null) {
				flags[flagName] = value === 'true';
			}
		}

		return flags;
	} catch (error) {
		console.error('[FeatureFlags] Error getting all flags:', error);
		return DEFAULT_FLAGS;
	}
}

/**
 * Check if feature is enabled
 * @param {string} flagName - Name of the feature flag
 * @returns {Promise<boolean>} Whether feature is enabled
 */
export async function isFeatureEnabled(flagName) {
	return await getFeatureFlag(flagName, false);
}

/**
 * Check if multiple features are enabled
 * @param {string[]} flagNames - Array of feature flag names
 * @returns {Promise<object>} Object with flag names as keys and enabled status as values
 */
export async function areFeaturesEnabled(flagNames) {
	const results = {};
	for (const flagName of flagNames) {
		results[flagName] = await isFeatureEnabled(flagName);
	}
	return results;
}

/**
 * Reset feature flag to default value
 * @param {string} flagName - Name of the feature flag
 * @returns {Promise<boolean>} Success status
 */
export async function resetFeatureFlag(flagName) {
	try {
		await redis.del(`feature_flag:${flagName}`);
		return true;
	} catch (error) {
		console.error('[FeatureFlags] Error resetting flag:', error);
		return false;
	}
}

/**
 * Reset all feature flags to defaults
 * @returns {Promise<boolean>} Success status
 */
export async function resetAllFeatureFlags() {
	try {
		const keys = await redis.keys('feature_flag:*');
		if (keys.length > 0) {
			await redis.del(...keys);
		}
		return true;
	} catch (error) {
		console.error('[FeatureFlags] Error resetting all flags:', error);
		return false;
	}
}

/**
 * Feature flag middleware for SvelteKit
 * Adds feature flags to locals for use in components
 */
export async function addFeatureFlagsToLocals(event) {
	try {
		const flags = await getAllFeatureFlags();
		event.locals.featureFlags = flags;
		return flags;
	} catch (error) {
		console.error('[FeatureFlags] Error adding to locals:', error);
		event.locals.featureFlags = DEFAULT_FLAGS;
		return DEFAULT_FLAGS;
	}
}
