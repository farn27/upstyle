package com.upstyle.bizgrow.data

import kotlinx.serialization.Serializable

/** Hasil mesin analisis statistik server (GET /api/analitik) — tanpa model AI, tanpa token. */
@Serializable
data class Analitik(
    val ringkasan: String = "",
    val dibuat: String = "",
    val kesehatan: KesehatanUsaha = KesehatanUsaha(),
    val prediksi: PrediksiOmzet = PrediksiOmzet(),
    val wawasan: List<WawasanAnalitik> = emptyList(),
    val pola: List<PolaHariAnalitik> = emptyList()
)

@Serializable
data class KesehatanUsaha(val skor: Int = 0, val nilai: String = "-", val komponen: List<KomponenSkor> = emptyList())

@Serializable
data class KomponenSkor(val kunci: String = "", val nama: String = "", val skor: Int = 0, val bobot: Int = 0, val alasan: String = "")

@Serializable
data class PrediksiOmzet(
    val metode: String = "",
    val galatUji: Int? = null,
    val hariData: Int = 0,
    val kepadatan: Int = 0,
    val akhirBulan: AkhirBulanOmzet = AkhirBulanOmzet(),
    val ramalan: List<TitikRamalan> = emptyList(),
    val riwayat: List<TitikRiwayat> = emptyList()
)

@Serializable
data class AkhirBulanOmzet(
    val nilai: Double = 0.0,
    val bawah: Double = 0.0,
    val atas: Double = 0.0,
    val aktualSejauhIni: Double = 0.0,
    val target: Double = 0.0,
    val bulanLalu: Double = 0.0
)

@Serializable
data class TitikRamalan(val tanggal: String = "", val nilai: Double = 0.0, val bawah: Double = 0.0, val atas: Double = 0.0)

@Serializable
data class TitikRiwayat(val tanggal: String = "", val nilai: Double = 0.0)

@Serializable
data class WawasanAnalitik(val tipe: String = "info", val judul: String = "", val isi: String = "", val aksi: String? = null)

@Serializable
data class PolaHariAnalitik(val hari: String = "", val rata: Double = 0.0, val indeks: Double = 0.0)
