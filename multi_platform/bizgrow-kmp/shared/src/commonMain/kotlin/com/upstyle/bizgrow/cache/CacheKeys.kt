package com.upstyle.bizgrow.cache

/**
 * Task 10: Centralized cache keys for offline-first architecture
 */
object CacheKeys {
    // ─── Global Keys ──────────────────────────────────────────────────────────
    const val UNITS = "cache_units"
    
    // ─── Unit-Specific Keys ───────────────────────────────────────────────────
    fun dashboardKey(unitId: Int) = "cache_dashboard_$unitId"
    fun productsKey(unitId: Int) = "cache_products_$unitId"
    fun hrKey(unitId: Int) = "cache_hr_$unitId"
    fun crmDealsKey(unitId: Int) = "cache_crm_deals_$unitId"
    fun crmContactsKey(unitId: Int) = "cache_crm_contacts_$unitId"
    fun financeArKey(unitId: Int) = "cache_finance_ar_$unitId"
    fun financeApKey(unitId: Int) = "cache_finance_ap_$unitId"
    fun ordersKey(unitId: Int) = "cache_orders_$unitId"
    fun ticketsKey(unitId: Int) = "cache_tickets_$unitId"
    fun marketingKey(unitId: Int) = "cache_marketing_$unitId"
    fun scmKey(unitId: Int) = "cache_scm_$unitId"
    
    // ─── Time-based Keys ──────────────────────────────────────────────────────
    fun dashboardDateKey(unitId: Int, startDate: String?, endDate: String?): String {
        val suffix = if (startDate != null && endDate != null) "_${startDate}_${endDate}" else ""
        return "cache_dashboard_${unitId}${suffix}"
    }
    
    fun reportsKey(unitId: Int, type: String, period: String?) = "cache_reports_${unitId}_${type}_${period ?: "default"}"
    
    // ─── Expiry Times (in milliseconds) ───────────────────────────────────────
    const val CACHE_TTL_SHORT = 5 * 60 * 1000L      // 5 minutes
    const val CACHE_TTL_MEDIUM = 30 * 60 * 1000L    // 30 minutes  
    const val CACHE_TTL_LONG = 2 * 60 * 60 * 1000L  // 2 hours
    const val CACHE_TTL_DAILY = 24 * 60 * 60 * 1000L // 24 hours
    
    // ─── Cache Categories ─────────────────────────────────────────────────────
    object Categories {
        const val CRITICAL = "critical"     // Always cache (units, products)
        const val FREQUENT = "frequent"     // Cache for medium term (dashboard, hr)
        const val REPORTS = "reports"       // Cache for longer (finance reports)
        const val REALTIME = "realtime"     // Short cache only (notifications)
    }
    
    // ─── Utility Methods ──────────────────────────────────────────────────────
    fun isUnitSpecific(key: String): Boolean {
        return key.contains("_\\d+".toRegex())
    }
    
    fun extractUnitId(key: String): Int? {
        val match = "_([0-9]+)".toRegex().find(key)
        return match?.groupValues?.get(1)?.toIntOrNull()
    }
    
    fun getAllKeysForUnit(unitId: Int): List<String> {
        return listOf(
            dashboardKey(unitId),
            productsKey(unitId),
            hrKey(unitId),
            crmDealsKey(unitId),
            crmContactsKey(unitId),
            financeArKey(unitId),
            financeApKey(unitId),
            ordersKey(unitId),
            ticketsKey(unitId),
            marketingKey(unitId),
            scmKey(unitId)
        )
    }
    
    fun clearUnitCache(unitId: Int, cacheManager: com.upstyle.bizgrow.cache.CacheManager) {
        getAllKeysForUnit(unitId).forEach { key ->
            cacheManager.clear(key)
        }
    }
}