package com.upstyle.bizgrow.cache

import com.upstyle.bizgrow.data.SessionRepository
import com.upstyle.bizgrow.data.SyncQueueItem
import kotlinx.serialization.encodeToString
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json

/**
 * Persistent sync queue backed by multiplatform Settings via SessionRepository.
 * Stores offline actions until network is available and SyncManager flushes them.
 */
class SyncQueue(private val session: SessionRepository) {

    private val json = Json { ignoreUnknownKeys = true }
    private val KEY = "sync_queue_items"

    fun enqueue(item: SyncQueueItem) {
        val current = getAll().toMutableList()
        current.add(item)
        session.saveToCache(KEY, json.encodeToString(current))
    }

    fun dequeue(): SyncQueueItem? {
        val items = getAll().toMutableList()
        if (items.isEmpty()) return null
        val item = items.removeAt(0)
        session.saveToCache(KEY, json.encodeToString(items))
        return item
    }

    fun getAll(): List<SyncQueueItem> {
        val raw = session.loadFromCache(KEY) ?: return emptyList()
        return try {
            json.decodeFromString(raw)
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun remove(id: String) {
        val items = getAll().filter { it.id != id }
        session.saveToCache(KEY, json.encodeToString(items))
    }

    fun clear() {
        session.clearCache(KEY)
    }

    // ─── Item yang ditolak server permanen (4xx) — disimpan supaya user tahu, tidak dicoba lagi ──
    private val KEY_GAGAL = "sync_queue_failed"

    fun simpanGagal(item: SyncQueueItem) {
        val sekarang = getGagal().toMutableList()
        sekarang.add(item)
        session.saveToCache(KEY_GAGAL, json.encodeToString(sekarang.takeLast(50)))
    }

    fun getGagal(): List<SyncQueueItem> {
        val raw = session.loadFromCache(KEY_GAGAL) ?: return emptyList()
        return try { json.decodeFromString(raw) } catch (e: Exception) { emptyList() }
    }

    fun hapusGagal() = session.saveToCache(KEY_GAGAL, "[]")

    fun size(): Int = getAll().size

    fun isEmpty(): Boolean = size() == 0
}
