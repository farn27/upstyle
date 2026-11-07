package com.upstyle.bizgrow.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.data.ProductVariant
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors
import com.upstyle.bizgrow.ui.theme.LocalBizPalette

// ═══════════════════════════════════════════════════════════════════════════
//  Varian produk
// ═══════════════════════════════════════════════════════════════════════════

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductVariantsScreen(viewModel: AppViewModel, productId: String) {
    val state by viewModel.productVariantsState.collectAsState(initial = viewModel.productVariantsState.value)
    val products by viewModel.products.collectAsState(initial = viewModel.products.value)
    val produk = products.find { it.id == productId }
    var edit by remember { mutableStateOf<ProductVariant?>(null) }
    var hapus by remember { mutableStateOf<ProductVariant?>(null) }

    LaunchedEffect(productId) { viewModel.loadProductVariants(productId) }
    val varian = state.variantsByProduct[productId] ?: state.variants.filter { it.productId == productId }

    BizScreen(
        "Varian produk",
        subtitle = produk?.nama,
        onBack = { viewModel.navigateBack() },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { edit = ProductVariant(productId = productId, namaVariasi = "", hargaBeli = produk?.hargaBeli ?: 0.0, hargaJual = produk?.hargaJual ?: 0.0) },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary,
                shape = RoundedCornerShape(18.dp),
                icon = { Icon(Icons.Rounded.Add, null) },
                text = { Text("Varian") }
            )
        }
    ) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 96.dp)) {
            when {
                state.isLoading && varian.isEmpty() -> item { SkeletonList(rows = 4) }
                varian.isEmpty() -> item {
                    EmptyView("Belum ada varian", "Tambah varian seperti ukuran, warna, atau rasa — masing-masing dengan harga & stok sendiri.", Icons.Rounded.Style)
                }
                else -> itemsIndexed(varian, key = { _, v -> v.id }) { i, v ->
                    BizSurface(Modifier.fillMaxWidth().padding(vertical = 5.dp).enterAnimation(i), onClick = { edit = v }, contentPadding = PaddingValues(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            ProductThumb(v.namaVariasi, null, Modifier.size(44.dp), RoundedCornerShape(13.dp))
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(v.namaVariasi, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface)
                                Text(listOfNotNull(v.sku.ifBlank { null }, "Stok ${v.stok}").joinToString(" • "), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(v.hargaJual.rupiah(), style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.primary)
                                if (v.stok <= v.minStok) StatusChip(if (v.stok <= 0) "Habis" else "Menipis", if (v.stok <= 0) BizgrowColors.Danger else BizgrowColors.Warning)
                            }
                            IconButton(onClick = { hapus = v }) { Icon(Icons.Rounded.DeleteOutline, "Hapus", tint = MaterialTheme.colorScheme.onSurfaceVariant) }
                        }
                    }
                }
            }
        }
    }

    edit?.let { awal ->
        ModalBottomSheet(onDismissRequest = { edit = null }, containerColor = MaterialTheme.colorScheme.surface, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
            VarianForm(awal) { hasil ->
                if (hasil.id.isBlank()) viewModel.createVariant(hasil) else viewModel.updateVariant(hasil)
                edit = null
            }
        }
    }
    hapus?.let { v ->
        AlertDialog(
            onDismissRequest = { hapus = null },
            shape = RoundedCornerShape(24.dp),
            containerColor = MaterialTheme.colorScheme.surface,
            title = { Text("Hapus varian \"${v.namaVariasi}\"?") },
            confirmButton = { TextButton(onClick = { viewModel.deleteVariant(v.id, productId); hapus = null }) { Text("Hapus", color = BizgrowColors.Danger) } },
            dismissButton = { TextButton(onClick = { hapus = null }) { Text("Batal") } }
        )
    }
}

@Composable
private fun VarianForm(awal: ProductVariant, onSimpan: (ProductVariant) -> Unit) {
    var nama by remember { mutableStateOf(awal.namaVariasi) }
    var sku by remember { mutableStateOf(awal.sku) }
    var beli by remember { mutableStateOf(if (awal.hargaBeli > 0) awal.hargaBeli.toLong().toString() else "") }
    var jual by remember { mutableStateOf(if (awal.hargaJual > 0) awal.hargaJual.toLong().toString() else "") }
    var stok by remember { mutableStateOf(awal.stok.toString()) }
    var minStok by remember { mutableStateOf(awal.minStok.toString()) }
    val valid = nama.isNotBlank() && (jual.toDoubleOrNull() ?: 0.0) > 0
    Column(Modifier.padding(horizontal = 20.dp).padding(bottom = 28.dp).imePadding(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(if (awal.id.isBlank()) "Varian baru" else "Ubah varian", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface)
        BizTextField(nama, { nama = it }, "Nama varian", placeholder = "mis. Large / Merah")
        BizTextField(sku, { sku = it }, "SKU (opsional)")
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            BizTextField(beli, { beli = it.filter(Char::isDigit) }, "Harga beli", Modifier.weight(1f), keyboardType = KeyboardType.Number)
            BizTextField(jual, { jual = it.filter(Char::isDigit) }, "Harga jual", Modifier.weight(1f), keyboardType = KeyboardType.Number)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            BizTextField(stok, { stok = it.filter(Char::isDigit) }, "Stok", Modifier.weight(1f), keyboardType = KeyboardType.Number)
            BizTextField(minStok, { minStok = it.filter(Char::isDigit) }, "Stok minimum", Modifier.weight(1f), keyboardType = KeyboardType.Number)
        }
        Spacer(Modifier.height(4.dp))
        BizButton("Simpan", {
            onSimpan(awal.copy(namaVariasi = nama.trim(), sku = sku.trim(), hargaBeli = beli.toDoubleOrNull() ?: 0.0, hargaJual = jual.toDoubleOrNull() ?: 0.0, stok = stok.toIntOrNull() ?: 0, minStok = minStok.toIntOrNull() ?: 0))
        }, enabled = valid, icon = Icons.Rounded.Check, modifier = Modifier.fillMaxWidth())
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Operasi massal produk
// ═══════════════════════════════════════════════════════════════════════════

private data class JenisMassal(val kode: String, val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector, val tint: Color)
private val jenisMassal = listOf(
    JenisMassal("PRICE_UPDATE", "Ubah harga", Icons.Rounded.Sell, BizgrowColors.Success),
    JenisMassal("CATEGORY_CHANGE", "Ganti kategori", Icons.Rounded.Category, BizgrowColors.Info),
    JenisMassal("STATUS_CHANGE", "Ubah status", Icons.Rounded.ToggleOn, BizgrowColors.Violet),
    JenisMassal("ARCHIVE", "Arsipkan", Icons.Rounded.Archive, BizgrowColors.Warning),
)

@Composable
fun BulkOperationsScreen(viewModel: AppViewModel) {
    val products by viewModel.products.collectAsState(initial = viewModel.products.value)
    val kategori by viewModel.kategoriProduk.collectAsState(initial = viewModel.kategoriProduk.value)
    val state by viewModel.bulkOperationState.collectAsState(initial = viewModel.bulkOperationState.value)
    var dipilih by remember { mutableStateOf(setOf<String>()) }
    var jenis by remember { mutableStateOf(jenisMassal.first()) }
    var query by remember { mutableStateOf("") }
    var persen by remember { mutableStateOf("") }
    var kategoriId by remember { mutableStateOf<Int?>(null) }
    var status by remember { mutableStateOf("active") }

    LaunchedEffect(Unit) { viewModel.loadProducts(); viewModel.loadKategoriProduk(); viewModel.clearBulkOperationResult() }
    val aktif = products.filter { it.status != "archived" }
    val tampil = remember(aktif, query) { aktif.filter { query.isBlank() || it.nama.contains(query, true) || it.sku.contains(query, true) } }

    val payload: Map<String, String>? = when (jenis.kode) {
        "PRICE_UPDATE" -> persen.toDoubleOrNull()?.takeIf { it != 0.0 }?.let { mapOf("persen" to it.toString()) }
        "CATEGORY_CHANGE" -> kategoriId?.let { mapOf("kategoriId" to it.toString()) }
        "STATUS_CHANGE" -> mapOf("status" to status)
        else -> emptyMap()
    }
    val siap = dipilih.isNotEmpty() && payload != null && !state.isRunning

    BizScreen(
        "Operasi massal",
        subtitle = if (dipilih.isEmpty()) "Pilih produk yang ingin diubah" else "${dipilih.size} produk dipilih",
        onBack = { viewModel.navigateBack() },
        actions = {
            TextButton(onClick = { dipilih = if (dipilih.size == tampil.size) emptySet() else tampil.map { it.id }.toSet() }) {
                Text(if (dipilih.size == tampil.size && tampil.isNotEmpty()) "Batal semua" else "Pilih semua")
            }
        },
        bottomBar = {
            Surface(color = MaterialTheme.colorScheme.surface, shadowElevation = 12.dp) {
                Column(Modifier.navigationBarsPadding().padding(16.dp)) {
                    AnimatedVisibility(state.isRunning) { LinearProgressIndicator(Modifier.fillMaxWidth().padding(bottom = 10.dp)) }
                    BizButton(
                        "${jenis.label} • ${dipilih.size} produk",
                        { viewModel.bulkUpdateProducts(dipilih.toList(), jenis.kode, payload ?: emptyMap()) },
                        enabled = siap,
                        loading = state.isRunning,
                        icon = jenis.icon,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }
    ) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(bottom = 16.dp)) {
            item {
                LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(jenisMassal) { j ->
                        val aktifJ = j == jenis
                        Row(
                            Modifier
                                .clip(RoundedCornerShape(16.dp))
                                .background(if (aktifJ) j.tint.copy(alpha = 0.12f) else MaterialTheme.colorScheme.surface)
                                .border(if (aktifJ) 1.5.dp else 1.dp, if (aktifJ) j.tint else LocalBizPalette.current.border, RoundedCornerShape(16.dp))
                                .pressClick { jenis = j }
                                .padding(horizontal = 14.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(j.icon, null, tint = j.tint, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(6.dp))
                            Text(j.label, style = MaterialTheme.typography.labelMedium, color = if (aktifJ) j.tint else MaterialTheme.colorScheme.onSurface)
                        }
                    }
                }
            }
            item {
                AnimatedContent(jenis.kode, label = "param", modifier = Modifier.padding(16.dp)) { kode ->
                    when (kode) {
                        "PRICE_UPDATE" -> BizTextField(persen, { persen = it.filter { c -> c.isDigit() || c == '-' || c == '.' } }, "Naik/turun harga (%)", leadingIcon = Icons.Rounded.Percent, keyboardType = KeyboardType.Number, supportingText = "Contoh: 10 untuk naik 10%, -5 untuk turun 5%")
                        "CATEGORY_CHANGE" -> LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            if (kategori.isEmpty()) item { Text("Belum ada kategori produk", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                            items(kategori) { k -> FilterPill(k.namaKategori, kategoriId == k.id, { kategoriId = k.id }) }
                        }
                        "STATUS_CHANGE" -> Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            listOf("active" to "Aktif", "draft" to "Draft").forEach { (k, l) -> FilterPill(l, status == k, { status = k }) }
                        }
                        else -> Text("Produk terpilih dipindah ke arsip. Bisa dipulihkan dari Sampah Produk.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            state.currentResult?.let { r ->
                item {
                    BizSurface(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp), color = BizgrowColors.SuccessLight, border = false) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Rounded.CheckCircle, null, tint = BizgrowColors.Success)
                            Spacer(Modifier.width(10.dp))
                            Column(Modifier.weight(1f)) {
                                Text("${r.successCount} berhasil, ${r.failureCount} gagal", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface)
                                Text("Salah ubah? Kamu bisa membatalkannya.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            if (r.operationId.isNotBlank()) TextButton(onClick = { viewModel.rollbackBulkOperation(r.operationId) }) { Text("Batalkan") }
                        }
                    }
                }
            }
            state.error?.let { e -> item { AuthErrorBanner(pesanRamah(e)) } }
            item { BizSearchField(query, { query = it }, "Cari produk", Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) }
            itemsIndexed(tampil, key = { _, p -> p.id }) { i, p ->
                val cek = p.id in dipilih
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(if (cek) MaterialTheme.colorScheme.primary.copy(alpha = 0.07f) else Color.Transparent)
                        .pressClick(pressedScale = 0.99f) { dipilih = if (cek) dipilih - p.id else dipilih + p.id }
                        .padding(horizontal = 8.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Checkbox(cek, { dipilih = if (cek) dipilih - p.id else dipilih + p.id })
                    ProductThumb(p.nama, p.foto, Modifier.size(40.dp), RoundedCornerShape(12.dp), viewModel.session.getServerUrl(), fontSize = androidx.compose.ui.unit.TextUnit(13f, androidx.compose.ui.unit.TextUnitType.Sp))
                    Spacer(Modifier.width(10.dp))
                    Column(Modifier.weight(1f)) {
                        Text(p.nama, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(p.kategori, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Text(p.hargaJual.rupiahRingkas(), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurface)
                }
            }
        }
    }
}
