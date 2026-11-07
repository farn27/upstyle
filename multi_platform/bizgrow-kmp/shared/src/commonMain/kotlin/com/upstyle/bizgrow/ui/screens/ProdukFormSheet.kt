package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.upstyle.bizgrow.data.KategoriProduk
import com.upstyle.bizgrow.data.Product
import com.upstyle.bizgrow.data.ProdukForm
import com.upstyle.bizgrow.data.ProductVariant
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors
import kotlinx.coroutines.launch

/** Jenis barang (sama dengan web: lib/jenisProduk.js). Hanya BARANG_JADI yang tampil di kasir. */
val DaftarJenisProduk = listOf(
    "BARANG_JADI" to "Barang jadi (dijual)",
    "BAHAN_BAKU" to "Bahan baku",
    "KEMASAN" to "Kemasan",
    "PERLENGKAPAN" to "Perlengkapan"
)

private class OpsiVarian(nama: String = "", nilai: String = "") {
    var nama by mutableStateOf(nama)
    var nilai by mutableStateOf(nilai) // dipisah koma: "S, M, L"
}

/** Gabungan semua nilai opsi → nama varian ("Merah - S"). Maks 3 opsi seperti web. */
private fun kombinasi(opsi: List<OpsiVarian>): List<String> {
    val aktif = opsi.filter { it.nama.isNotBlank() && it.nilai.split(",").any { v -> v.isNotBlank() } }
        .map { o -> o.nilai.split(",").map { it.trim() }.filter { it.isNotEmpty() }.distinct() }
    if (aktif.isEmpty()) return emptyList()
    return aktif.drop(1).fold(aktif.first()) { acc, vals -> acc.flatMap { a -> vals.map { v -> "$a - $v" } } }
}

private class BarisVarian(val nama: String, hargaJual: String, stok: String, sku: String) {
    var hargaJual by mutableStateOf(hargaJual)
    var stok by mutableStateOf(stok)
    var sku by mutableStateOf(sku)
}

/**
 * Formulir produk (tambah / ubah) setara web: foto, nama, jenis, kategori (pilih / buat baru), SKU, barcode,
 * harga & margin, stok awal + min stok, dan (saat tambah) varian dari kombinasi opsi.
 * Foto dipilih dari galeri lalu diunggah ke server.
 */
@Composable
fun ProdukFormSheet(
    viewModel: AppViewModel,
    awal: Product?,
    kategoriList: List<KategoriProduk>,
    onDismiss: () -> Unit,
    onSimpan: (ProdukForm) -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    val bacaGambar = rememberPembacaGambar()
    var nama by remember { mutableStateOf(awal?.nama ?: "") }
    var jenis by remember { mutableStateOf(awal?.jenis?.takeIf { it.isNotBlank() } ?: "BARANG_JADI") }
    var kategoriId by remember { mutableStateOf(awal?.kategoriId) }
    var kategoriBaru by remember { mutableStateOf("") }
    var buatKategori by remember { mutableStateOf(false) }
    var sku by remember { mutableStateOf(awal?.sku ?: "") }
    var barcode by remember { mutableStateOf(awal?.barcode ?: "") }
    var hargaBeli by remember { mutableStateOf(awal?.hargaBeli?.takeIf { it > 0 }?.toLong()?.toString() ?: "") }
    var hargaJual by remember { mutableStateOf(awal?.hargaJual?.takeIf { it > 0 }?.toLong()?.toString() ?: "") }
    var stok by remember { mutableStateOf(awal?.stok?.toString() ?: "0") }
    var minStok by remember { mutableStateOf(awal?.minStok?.toString() ?: "5") }
    var foto by remember { mutableStateOf(awal?.foto?.takeIf { it.isNotBlank() }) }
    var mengunggah by remember { mutableStateOf(false) }
    var galat by remember { mutableStateOf<String?>(null) }
    var proses by remember { mutableStateOf(false) }

    // varian (hanya saat tambah; produk yang sudah ada dikelola di layar Variasi)
    val opsi = remember { mutableStateListOf(OpsiVarian()) }
    val baris = remember { mutableStateMapOf<String, BarisVarian>() }
    val namaKombinasi = kombinasi(opsi)
    val punyaVarian = awal == null && namaKombinasi.isNotEmpty()
    val bedaJenis = jenis != "BARANG_JADI"

    val pilihFoto = rememberImagePickerLauncher { uri ->
        if (uri != null) {
            mengunggah = true; galat = null
            scope.launch {
                val bytes = bacaGambar(uri)
                val url = bytes?.let { viewModel.unggahFotoProduk(it) }
                if (url != null) foto = url else galat = "Foto gagal diunggah — coba lagi atau pilih foto yang lebih kecil."
                mengunggah = false
            }
        }
    }

    val beli = hargaBeli.toDoubleOrNull() ?: 0.0
    val jual = hargaJual.toDoubleOrNull() ?: 0.0
    val valid = nama.isNotBlank() && (punyaVarian || jual > 0 || bedaJenis) && !mengunggah && !proses

    FormSheet(
        judul = if (awal == null) "Produk baru" else "Ubah produk",
        subjudul = if (awal == null) "Isi data utama; varian opsional" else awal.nama,
        onDismiss = onDismiss,
        simpanAktif = valid,
        labelSimpan = if (proses) "Menyimpan…" else "Simpan produk",
        onSimpan = {
            proses = true; galat = null
            val form = ProdukForm(
                nama = nama.trim(), jenis = jenis, kategoriId = if (buatKategori) null else kategoriId,
                kategoriBaru = if (buatKategori) kategoriBaru else "", sku = sku.trim(), barcode = barcode.trim(),
                hargaBeli = beli, hargaJual = if (punyaVarian) 0.0 else jual,
                stok = if (punyaVarian) 0 else (stok.toIntOrNull() ?: 0), minStok = minStok.toIntOrNull() ?: 5, foto = foto,
                varian = if (punyaVarian) namaKombinasi.map { n ->
                    val b = baris[n]
                    ProductVariant(
                        namaVariasi = n, sku = b?.sku?.trim().orEmpty(), hargaBeli = beli,
                        hargaJual = b?.hargaJual?.toDoubleOrNull() ?: jual, stok = b?.stok?.toIntOrNull() ?: 0
                    )
                } else emptyList()
            )
            scope.launch {
                val err = viewModel.simpanProdukForm(form, awal?.id)
                proses = false
                if (err == null) { onSimpan(form); onDismiss() } else galat = err
            }
        }
    ) {
        // Foto
        Row(horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier.size(84.dp).clip(RoundedCornerShape(20.dp)).background(MaterialTheme.colorScheme.surfaceVariant).clickable(enabled = !mengunggah) { pilihFoto() },
                contentAlignment = Alignment.Center
            ) {
                when {
                    mengunggah -> CircularProgressIndicator(Modifier.size(26.dp), strokeWidth = 2.5.dp)
                    foto != null -> AsyncImage(model = foto, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                    else -> Icon(Icons.Rounded.AddAPhoto, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Column {
                Text("Foto produk", fontWeight = FontWeight.Bold)
                Text(if (mengunggah) "Mengunggah…" else "Opsional • ketuk untuk pilih dari galeri", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (foto != null && !mengunggah) TextButton(onClick = { foto = null }, contentPadding = PaddingValues(0.dp)) { Text("Hapus foto", color = BizgrowColors.Danger) }
            }
        }

        BizTextField(nama, { nama = it }, "Nama produk *", leadingIcon = Icons.Rounded.Inventory2)
        PilihanField("Jenis barang", DaftarJenisProduk, jenis, { jenis = it })
        if (bedaJenis) Text("Tidak tampil di kasir — dipakai sebagai persediaan bahan/perlengkapan.", style = MaterialTheme.typography.bodySmall, color = BizgrowColors.Info)

        // Kategori
        if (buatKategori) {
            BizTextField(kategoriBaru, { kategoriBaru = it }, "Nama kategori baru", leadingIcon = Icons.Rounded.Category, placeholder = "mis. MINUMAN")
            TextButton(onClick = { buatKategori = false; kategoriBaru = "" }, contentPadding = PaddingValues(0.dp)) { Text("Pilih dari daftar") }
        } else {
            PilihanField("Kategori", listOf("" to "Tanpa kategori") + kategoriList.map { it.id.toString() to it.namaKategori }, kategoriId?.toString() ?: "", { kategoriId = it.toIntOrNull() })
            TextButton(onClick = { buatKategori = true }, contentPadding = PaddingValues(0.dp)) { Icon(Icons.Rounded.Add, null, Modifier.size(16.dp)); Spacer(Modifier.width(4.dp)); Text("Kategori baru") }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(Modifier.weight(1f)) { BizTextField(sku, { sku = it }, "SKU", leadingIcon = Icons.Rounded.Tag, placeholder = "otomatis") }
            Box(Modifier.weight(1f)) { BizTextField(barcode, { barcode = it }, "Barcode", leadingIcon = Icons.Rounded.QrCode, keyboardType = androidx.compose.ui.text.input.KeyboardType.Number) }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(Modifier.weight(1f)) { AngkaField(hargaBeli, { hargaBeli = it }, "Harga beli / HPP", desimal = false) }
            if (!punyaVarian) Box(Modifier.weight(1f)) { AngkaField(hargaJual, { hargaJual = it }, if (bedaJenis) "Harga jual" else "Harga jual *", desimal = false) }
        }
        if (beli > 0 && jual > 0 && !punyaVarian) {
            val margin = ((jual - beli) / beli * 100).toInt()
            val warna = if (margin >= 0) BizgrowColors.Success else BizgrowColors.Danger
            Text("Margin $margin%  •  laba ${(jual - beli).rupiah()} per unit", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = warna)
        }

        if (!punyaVarian) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                if (awal == null) Box(Modifier.weight(1f)) { AngkaField(stok, { stok = it }, "Stok awal", desimal = false) }
                Box(Modifier.weight(1f)) { AngkaField(minStok, { minStok = it }, "Peringatan stok minimum", desimal = false) }
            }
            if (awal != null) Text("Stok saat ini ${awal.stok}. Ubah jumlah lewat 'Koreksi stok' agar tercatat di log.", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        } else {
            AngkaField(minStok, { minStok = it }, "Peringatan stok minimum", desimal = false)
        }

        // Varian (hanya tambah)
        if (awal == null) {
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            Text("Varian produk", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
            Text("Opsional — mis. Ukuran: S, M, L dan Warna: Merah, Biru. Maksimal 3 opsi.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            opsi.forEachIndexed { i, o ->
                BizSurface(Modifier.fillMaxWidth(), contentPadding = PaddingValues(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("Opsi ${i + 1}", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
                        if (opsi.size > 1 || o.nama.isNotBlank()) BizIconButton(Icons.Rounded.Close, "Hapus opsi") { if (opsi.size > 1) opsi.removeAt(i) else { o.nama = ""; o.nilai = "" } }
                    }
                    BizTextField(o.nama, { o.nama = it }, "Nama opsi", placeholder = "Ukuran / Warna")
                    Spacer(Modifier.height(8.dp))
                    BizTextField(o.nilai, { o.nilai = it }, "Nilai (pisahkan koma)", placeholder = "S, M, L")
                }
            }
            if (opsi.size < 3) TextButton(onClick = { opsi.add(OpsiVarian()) }) { Icon(Icons.Rounded.Add, null); Spacer(Modifier.width(6.dp)); Text("Tambah opsi") }
            if (namaKombinasi.isNotEmpty()) {
                Text("${namaKombinasi.size} varian", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold)
                namaKombinasi.forEach { n ->
                    val b = baris.getOrPut(n) { BarisVarian(n, hargaJual, "0", "") }
                    BizSurface(Modifier.fillMaxWidth(), contentPadding = PaddingValues(12.dp)) {
                        Text(n, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                        Spacer(Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Box(Modifier.weight(1f)) { AngkaField(b.hargaJual, { b.hargaJual = it }, "Harga jual", desimal = false) }
                            Box(Modifier.weight(1f)) { AngkaField(b.stok, { b.stok = it }, "Stok", desimal = false) }
                        }
                    }
                }
            }
        }
        galat?.let { Text(it, color = BizgrowColors.Danger, style = MaterialTheme.typography.bodySmall) }
    }
}
