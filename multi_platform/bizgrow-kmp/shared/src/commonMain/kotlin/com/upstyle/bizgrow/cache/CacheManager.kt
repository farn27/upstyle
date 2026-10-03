package com.upstyle.bizgrow.cache

import com.upstyle.bizgrow.data.SessionRepository
import com.upstyle.bizgrow.ui.currentTimeMillis
import io.github.aakira.napier.Napier
import kotlinx.serialization.KSerializer
import kotlinx.serialization.json.Json
import kotlinx.serialization.builtins.ListSerializer

/**
 * Task 10: Offline-first cache manager
 * Extends offline capabilities beyond just products to all critical features
 */
class CacheManager(private val session: SessionRepository) {
    
    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
    }
    
    /**
     * Save single item to cache
     */
    fun <T> save(key: String, data: T, serializer: KSerializer<T>) {
        try {
            val jsonString = json.encodeToString(serializer, data)
            session.saveToCache(key, jsonString)
        } catch (e: Exception) {
            Napier.e("Failed to cache $key", e)
        }
    }
    
    /**
     * Save list to cache
     */
    fun <T> saveList(key: String, data: List<T>, serializer: KSerializer<T>) {
        try {
            val listSerializer = ListSerializer(serializer)
            val jsonString = json.encodeToString(listSerializer, data)
            session.saveToCache(key, jsonString)
        } catch (e: Exception) {
            Napier.e("Failed to cache list $key", e)
        }
    }
    
    /**
     * Load single item from cache
     */
    fun <T> load(key: String, serializer: KSerializer<T>): T? {
        return try {
            val jsonString = session.loadFromCache(key) ?: return null
            json.decodeFromString(serializer, jsonString)
        } catch (e: Exception) {
            Napier.e("Failed to load cached $key", e)
            null
        }
    }
    
    /**
     * Load list from cache
     */
    fun <T> loadList(key: String, serializer: KSerializer<T>): List<T>? {
        return try {
            val jsonString = session.loadFromCache(key) ?: return null
            val listSerializer = ListSerializer(serializer)
            json.decodeFromString(listSerializer, jsonString)
        } catch (e: Exception) {
            Napier.e("Failed to load cached list $key", e)
            null
        }
    }
    
    /**
     * Clear specific cache key
     */
    fun clear(key: String) {
        session.clearCache(key)
    }
    
    /**
     * Clear all cache
     */
    fun clearAll() {
        session.clearAllCache()
    }
    
    /**
     * Check if cache key exists
     */
    fun exists(key: String): Boolean {
        return session.loadFromCache(key) != null
    }

    // ─── TTL-based caching ────────────────────────────────────────────────────

    /**
     * Save data with an expiry time.
     * [ttlMs] defaults to 5 minutes. Uses [CacheKeys.CACHE_TTL_SHORT/MEDIUM/LONG] constants.
     */
    fun <T> putWithTtl(
        key: String,
        value: T,
        ttlMs: Long = CacheKeys.CACHE_TTL_SHORT,
        serializer: KSerializer<T>
    ) {
        try {
            val encoded = json.encodeToString(serializer, value)
            session.saveToCache(key, encoded)
            session.saveLongToCache("${key}_ttl", currentTimeMillis() + ttlMs)
        } catch (e: Exception) {
            Napier.e("Failed to putWithTtl $key", e)
        }
    }

    /**
     * Save a list with an expiry time.
     */
    fun <T> putListWithTtl(
        key: String,
        value: List<T>,
        ttlMs: Long = CacheKeys.CACHE_TTL_SHORT,
        serializer: KSerializer<T>
    ) {
        try {
            val encoded = json.encodeToString(ListSerializer(serializer), value)
            session.saveToCache(key, encoded)
            session.saveLongToCache("${key}_ttl", currentTimeMillis() + ttlMs)
        } catch (e: Exception) {
            Napier.e("Failed to putListWithTtl $key", e)
        }
    }

    /**
     * Return cached data only if it has not expired.
     * Returns null when the entry is absent or stale.
     */
    fun <T> getIfFresh(key: String, serializer: KSerializer<T>): T? {
        val expiry = session.loadLongFromCache("${key}_ttl") ?: return null
        if (currentTimeMillis() > expiry) return null
        return load(key, serializer)
    }

    /**
     * Return a cached list only if it has not expired.
     */
    fun <T> getListIfFresh(key: String, serializer: KSerializer<T>): List<T>? {
        val expiry = session.loadLongFromCache("${key}_ttl") ?: return null
        if (currentTimeMillis() > expiry) return null
        return loadList(key, serializer)
    }

    /**
     * Remove both the data entry and its TTL marker.
     */
    fun invalidate(key: String) {
        session.clearCache(key)
        session.clearLongFromCache("${key}_ttl")
    }

    /**
     * Check whether a TTL entry is still fresh without loading the value.
     */
    fun isFresh(key: String): Boolean {
        val expiry = session.loadLongFromCache("${key}_ttl") ?: return false
        return currentTimeMillis() <= expiry
    }
}