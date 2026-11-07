package com.upstyle.bizgrow.data

import kotlinx.serialization.Serializable

/** Transaksi yang dikenali AI dari kalimat biasa ("jual kopi 25rb"). */
@Serializable
data class TrxPreview(
    val kategori: String = "Masuk",
    val nominal: Double = 0.0,
    val keterangan: String = "",
    val tanggal: String? = null,
    val metode: String? = null
)

/** Satu pesan di layar chat AI (disimpan lokal per sesi, jadi harus serializable). */
@Serializable
data class AiMessage(
    val id: String,
    val role: String,
    val content: String,
    val ts: Long,
    val unitName: String? = null,
    val previews: List<TrxPreview> = emptyList(),
    /** Indeks previews yang sudah tersimpan. */
    val tersimpan: List<Int> = emptyList(),
    /** JSON Chart.js mentah, di-render sebagai grafik. */
    val chartJson: String? = null,
    val isError: Boolean = false
)

/** Satu sesi percakapan. Disimpan lokal 30 hari seperti di web. */
@Serializable
data class AiSession(
    val id: String,
    val title: String,
    val createdAt: Long,
    val updatedAt: Long,
    val messages: List<AiMessage> = emptyList()
)
