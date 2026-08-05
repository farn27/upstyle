package com.upstyle.bizgrow.data

import com.russhwolf.settings.Settings

/**
 * Multiplatform session storage.
 * Android: SharedPreferences
 * iOS: NSUserDefaults
 */
class SessionRepository(private val settings: Settings) {

    companion object {
        private const val KEY_TOKEN = "token"
        private const val KEY_ROLE = "role"
        private const val KEY_EMAIL = "email"
        private const val KEY_USERNAME = "username"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_UNIT_ID = "active_unit_id"
        private const val KEY_UNIT_NAME = "active_unit_name"
        private const val KEY_UNIT_SLUG = "active_unit_slug"
        private const val KEY_SERVER_URL = "server_url"
        // Default: 192.168.1.25 is local IP for real device testing via USB
        // 10.0.2.2 was for Android Emulator
        private const val DEFAULT_SERVER = "http://192.168.1.24:5173"
    }

    fun saveSession(token: String, role: String, email: String, username: String = "", userId: Int = 0) {
        settings.putString(KEY_TOKEN, token)
        settings.putString(KEY_ROLE, role)
        settings.putString(KEY_EMAIL, email)
        settings.putString(KEY_USERNAME, username)
        settings.putInt(KEY_USER_ID, userId)
    }

    fun clearSession() {
        settings.remove(KEY_TOKEN)
        settings.remove(KEY_ROLE)
        settings.remove(KEY_EMAIL)
        settings.remove(KEY_USERNAME)
        settings.remove(KEY_USER_ID)
        settings.remove(KEY_UNIT_ID)
        settings.remove(KEY_UNIT_NAME)
        settings.remove(KEY_UNIT_SLUG)
    }

    fun getToken(): String? = settings.getStringOrNull(KEY_TOKEN)
    fun getRole(): String = settings.getString(KEY_ROLE, "user")
    fun getEmail(): String = settings.getString(KEY_EMAIL, "")
    fun getUsername(): String = settings.getString(KEY_USERNAME, "")
    fun getUserId(): Int = settings.getInt(KEY_USER_ID, 0)
    fun isLoggedIn(): Boolean = !getToken().isNullOrEmpty()

    fun setActiveUnit(id: Int, name: String, slug: String) {
        settings.putInt(KEY_UNIT_ID, id)
        settings.putString(KEY_UNIT_NAME, name)
        settings.putString(KEY_UNIT_SLUG, slug)
    }

    fun getActiveUnitId(): Int = settings.getInt(KEY_UNIT_ID, 0)
    fun getActiveUnitName(): String = settings.getString(KEY_UNIT_NAME, "")
    fun getActiveUnitSlug(): String = settings.getString(KEY_UNIT_SLUG, "")

    fun setServerUrl(url: String) = settings.putString(KEY_SERVER_URL, url.trimEnd('/'))
    fun getServerUrl(): String = settings.getString(KEY_SERVER_URL, DEFAULT_SERVER)

    // â”€â”€â”€ Legacy Offline Caching (for backward compatibility) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    private val KEY_OFFLINE_PRODUCTS = "offline_products"
    private val KEY_OFFLINE_CUSTOMERS = "offline_customers"
    private val KEY_PENDING_TX = "pending_transactions"

    fun saveOfflineProducts(jsonString: String) = settings.putString(KEY_OFFLINE_PRODUCTS, jsonString)
    fun getOfflineProducts(): String? = settings.getStringOrNull(KEY_OFFLINE_PRODUCTS)

    fun saveOfflineCustomers(jsonString: String) = settings.putString(KEY_OFFLINE_CUSTOMERS, jsonString)
    fun getOfflineCustomers(): String? = settings.getStringOrNull(KEY_OFFLINE_CUSTOMERS)

    fun savePendingTransactions(jsonString: String) = settings.putString(KEY_PENDING_TX, jsonString)
    fun getPendingTransactions(): String? = settings.getStringOrNull(KEY_PENDING_TX)

    // â”€â”€â”€ Task 10: Generic Cache Storage (new cache system) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    fun saveToCache(key: String, value: String) = settings.putString("cache_$key", value)
    fun loadFromCache(key: String): String? = settings.getStringOrNull("cache_$key")
    fun clearCache(key: String) = settings.remove("cache_$key")
    
    fun clearAllCache() {
        // Clear all keys starting with "cache_"
        // Note: multiplatform-settings doesn't have a way to list all keys,
        // so we'll clear known cache keys patterns
        val cacheKeyPatterns = listOf(
            "cache_units", "cache_dashboard_", "cache_products_", "cache_hr_",
            "cache_crm_deals_", "cache_crm_contacts_", "cache_finance_", 
            "cache_orders_", "cache_tickets_", "cache_marketing_", "cache_scm_"
        )
        
        // This is a simplified approach - in production you might want to 
        // maintain a registry of cache keys
        for (i in 1..100) { // Clear unit-specific caches up to unit ID 100
            cacheKeyPatterns.forEach { pattern ->
                if (pattern.endsWith("_")) {
                    clearCache("${pattern}$i")
                }
            }
        }
        
        // Clear non-unit specific
        clearCache("units")
    }
}
