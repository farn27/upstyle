package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.data.KategoriProduk
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors
import kotlinx.coroutines.launch

/** Kelola kategori produk: daftar + jumlah produk, tambah, hapus (ditolak bila masih dipakai). */
@Composable
fun KategoriProdukScreen(viewModel: AppViewModel) {
    val kategori by viewModel.kategoriProduk.collectAsState()
    val produk by viewModel.products.collectAsState()
    var tambah by remember { mutableStateOf(false) }
    var hapus by remember { mutableStateOf<KategoriProduk?>(null) }
    var galat by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) { viewModel.loadKategoriProduk(); viewModel.loadProducts() }
    val jumlah = remember(produk) { produk.groupingBy { it.kategoriId }.eachCount() }

    BizScreen(
        "Kategori produk", subtitle = "${kategori.size} kategori", onBack = { viewModel.navigateBack() },
        floatingActionButton = { FabTambah("Kategori baru") { tambah = true; galat = null } }
    ) { padding ->
        if (kategori.isEmpty()) {
            EmptyView("Belum ada kategori", "Kelompokkan produk (mis. MINUMAN, MAKANAN) agar mudah dicari di kasir dan laporan.", Icons.Rounded.Category, "Tambah kategori", { tambah = true }, Modifier.padding(padding))
        } else LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(16.dp, 4.dp, 16.dp, 96.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            galat?.let { item { Text(it, color = BizgrowColors.Danger, style = MaterialTheme.typography.bodySmall) } }
            itemsIndexed(kategori, key = { _, k -> k.id }) { i, k ->
                val n = jumlah[k.id] ?: 0
                ListRow(
                    k.namaKategori, subtitle = if (n == 0) "Belum ada produk" else "$n produk", icon = Icons.Rounded.Category,
                    tint = BizgrowColors.ModuleColors[i % BizgrowColors.ModuleColors.size], modifier = Modifier.enterAnimation(i),
                    trailing = { BizIconButton(Icons.Rounded.DeleteOutline, "Hapus", tint = BizgrowColors.Danger) { hapus = k } }
                )
            }
        }
    }

    if (tambah) {
        var nama by remember { mutableStateOf("") }
        var err by remember { mutableStateOf<String?>(null) }
        FormSheet("Kategori baru", onDismiss = { tambah = false }, simpanAktif = nama.trim().isNotEmpty(), onSimpan = {
            scope.launch {
                val e = viewModel.tambahKategoriProduk(nama.trim())
                if (e == null) tambah = false else err = e
            }
        }) {
            BizTextField(nama, { nama = it }, "Nama kategori", leadingIcon = Icons.Rounded.Category, placeholder = "mis. MINUMAN", supportingText = "Otomatis huruf besar")
            err?.let { Text(it, color = BizgrowColors.Danger, style = MaterialTheme.typography.bodySmall) }
        }
    }
    hapus?.let { k ->
        KonfirmasiHapus("Hapus kategori?", "\"${k.namaKategori}\" akan dihapus. Kategori yang masih dipakai produk tidak bisa dihapus.", {
            scope.launch { galat = viewModel.hapusKategoriProduk(k.id) }
            hapus = null
        }, { hapus = null })
    }
}
