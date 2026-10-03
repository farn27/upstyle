package com.upstyle.bizgrow.utils

import com.upstyle.bizgrow.ui.currentTimeMillis
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

@Serializable
data class AuditEntry(
    val timestamp: Long,
    val action: String,
    val entityType: String,
    val entityId: String,
    val userId: String = ""
)

/**
 * Local audit log for sensitive operations. Capped at 1000 entries (FIFO).
 */
class AuditLogger(
    private val saveToCache: (String, String) -> Unit,
    private val loadFromCache: (String) -> String?
) {
    private val json = Json { ignoreUnknownKeys = true }
    private val KEY = "audit_log_entries"
    private val MAX_ENTRIES = 1000

    fun log(action: String, entityType: String, entityId: String, userId: String = "") {
        val entries = getAll().toMutableList()
        entries.add(AuditEntry(currentTimeMillis(), action, entityType, entityId, userId))
        val trimmed = if (entries.size > MAX_ENTRIES) entries.takeLast(MAX_ENTRIES) else entries
        try { saveToCache(KEY, json.encodeToString(trimmed)) } catch (_: Exception) {}
    }

    fun getAll(): List<AuditEntry> {
        val raw = loadFromCache(KEY) ?: return emptyList()
        return try { json.decodeFromString(raw) } catch (_: Exception) { emptyList() }
    }

    fun getRecent(count: Int = 50): List<AuditEntry> = getAll().takeLast(count).reversed()

    fun clear() { saveToCache(KEY, "[]") }
}
