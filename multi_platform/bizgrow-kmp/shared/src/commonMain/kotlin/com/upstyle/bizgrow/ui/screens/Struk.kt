package com.upstyle.bizgrow.ui.screens

import com.upstyle.bizgrow.data.Product
import com.upstyle.bizgrow.ui.design.rupiah

private const val LEBAR = 32 // printer thermal 58 mm ≈ 32 karakter

private fun tengah(t: String) = t.take(LEBAR).let { " ".repeat(((LEBAR - it.length) / 2).coerceAtLeast(0)) + it }
private fun baris(kiri: String, kanan: String): String {
    val k = kiri.take((LEBAR - kanan.length - 1).coerceAtLeast(1))
    return k + " ".repeat((LEBAR - k.length - kanan.length).coerceAtLeast(1)) + kanan
}
private val garis = "-".repeat(LEBAR)

/** Isi struk teks untuk printer thermal 58 mm: rincian barang, diskon, PPN, total, pembayaran, kembalian. */
fun susunStruk(
    namaUsaha: String, alamat: String?, tanggal: String, items: List<Pair<Product, Int>>,
    subtotal: Double, diskon: Double, ppn: Double, persenPpn: Double, ppnInklusif: Boolean, total: Double,
    metode: String, diterima: Double?, kembalian: Double?, catatan: String? = null
): String = buildString {
    appendLine(tengah(namaUsaha))
    if (!alamat.isNullOrBlank()) appendLine(tengah(alamat))
    appendLine(tengah(tanggal))
    appendLine(garis)
    items.forEach { (p, q) ->
        appendLine(p.nama.take(LEBAR))
        appendLine(baris("  $q x ${p.hargaJual.rupiah()}", (p.hargaJual * q).rupiah()))
    }
    appendLine(garis)
    appendLine(baris("Subtotal", subtotal.rupiah()))
    if (diskon > 0) appendLine(baris("Diskon", "-" + diskon.rupiah()))
    if (ppn > 0) appendLine(baris("PPN ${persenPpn.toString().removeSuffix(".0")}%" + if (ppnInklusif) " (incl)" else "", ppn.rupiah()))
    appendLine(baris("TOTAL", total.rupiah()))
    appendLine(garis)
    appendLine(baris("Bayar (${metode.lowercase()})", (diterima ?: total).rupiah()))
    if (kembalian != null && kembalian > 0) appendLine(baris("Kembali", kembalian.rupiah()))
    if (!catatan.isNullOrBlank()) { appendLine(garis); appendLine(catatan.take(LEBAR * 2)) }
    appendLine(garis)
    appendLine(tengah("Terima kasih!"))
    appendLine(tengah("Powered by BizGrow"))
    appendLine("\n\n")
}
