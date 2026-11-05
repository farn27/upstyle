package com.upstyle.bizgrow.cache

import com.upstyle.bizgrow.api.UpstyleApi

/** Ringkasan satu kali sinkron antrean offline */
data class HasilSinkron(val terkirim: Int, val ditolak: Int, val tersisa: Int)

/**
 * Kirim ulang antrean offline ke endpoint aslinya (opsi B), berurutan sesuai waktu masuk.
 * - Terkirim → dihapus dari antrean
 * - Ditolak permanen (data tidak valid) → dipindah ke daftar gagal, dihapus dari antrean
 * - Jaringan putus / server error → berhenti, sisanya dicoba lagi nanti (urutan tetap terjaga)
 * Aman dikirim berulang: setiap item membawa Idempotency-Key, jadi tidak tercatat dua kali.
 */
suspend fun kirimAntreanOffline(queue: SyncQueue, api: UpstyleApi): HasilSinkron {
    var terkirim = 0
    var ditolak = 0
    for (item in queue.getAll()) {
        val hasil = try {
            api.replaySyncItem(item)
        } catch (e: Exception) {
            break // masih offline
        }
        when {
            hasil.terkirim -> { queue.remove(item.id); terkirim++ }
            hasil.ditolakPermanen -> {
                queue.remove(item.id)
                queue.simpanGagal(item.copy(lastError = hasil.pesan, retryCount = item.retryCount + 1))
                ditolak++
            }
            else -> break
        }
    }
    return HasilSinkron(terkirim, ditolak, queue.size())
}
