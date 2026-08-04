package com.upstyle.bizgrow.cache

import com.upstyle.bizgrow.data.SessionRepository
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
}