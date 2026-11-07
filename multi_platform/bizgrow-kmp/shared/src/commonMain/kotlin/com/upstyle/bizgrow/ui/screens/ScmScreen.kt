package com.upstyle.bizgrow.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.background
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.data.PurchaseOrder
import com.upstyle.bizgrow.data.Supplier
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors

private fun statusPo(s: String): Pair<String, Color> = when (s.uppercase()) {
    "DRAFT" -> "Draft" to Color(0xFF64748B)
    "SENT", "ORDERED" -> "Dikirim" to BizgrowColors.Info
    "PARTIAL" -> "Diterima sebagian" to BizgrowColors.Warning
    "RECEIVED" -> "Diterima" to BizgrowColors.Success
    "CLOSED" -> "Selesai" to BizgrowColors.Success
    "CANCELLED" -> "Dibatalkan" to BizgrowColors.Danger
    else -> s to BizgrowColors.Primary
}

/** Modul Pengadaan: supplier & purchase order (terima barang menambah stok). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScmScreen(viewModel: AppViewModel) {
    val scm by viewModel.scmData.collectAsState(initial = viewModel.scmData.value)
    val products by viewModel.products.collectAsState(initial = viewModel.products.value)
    var tab by remember { mutableStateOf(0) }
    var showPo by remember { mutableStateOf(false) }
    var showSupplier by remember { mutableStateOf(false) }
    var konfirmasi by remember { mutableStateOf<Pair<PurchaseOrder, String>?>(null) }
    var presetProduk by remember { mutableStateOf<com.upstyle.bizgrow.data.Product?>(null) }
    var showRestock by remember { mutableStateOf(false) }
    var filter by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) { viewModel.loadScmData(); viewModel.loadProducts() }
    val pos = scm?.purchaseOrders.orEmpty()
    val suppliers = scm?.suppliers.orEmpty()
    val terbuka = pos.filter { it.status.uppercase() in setOf("DRAFT", "SENT", "ORDERED", "PARTIAL") }
    val tampilPo = if (filter == null) pos else pos.filter { statusPo(it.status).first == filter }

    BizScreen(
        "Pengadaan",
        subtitle = "Supplier & purchase order",
        onBack = { viewModel.navigateBack() },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { if (tab == 0) showPo = true else showSupplier = true },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary,
                shape = RoundedCornerShape(18.dp),
                icon = { Icon(Icons.Rounded.Add, null) },
                text = { Text(if (tab == 0) "Buat PO" else "Supplier") }
            )
        }
    ) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 96.dp)) {
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(bottom = 14.dp)) {
                    StatTile("PO terbuka", "${terbuka.size}", Icons.Rounded.PendingActions, BizgrowColors.Warning, Modifier.weight(1f))
                    StatTile("Nilai terbuka", terbuka.sumOf { it.totalAmount }.rupiahRingkas(), Icons.Rounded.Payments, BizgrowColors.Primary, Modifier.weight(1f))
                    StatTile("Supplier", "${suppliers.size}", Icons.Rounded.Storefront, BizgrowColors.Success, Modifier.weight(1f))
                }
            }
            item {
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.surfaceVariant).padding(4.dp)
                ) {
                    listOf("Purchase order", "Supplier").forEachIndexed { i, label ->
                        val aktif = tab == i
                        Box(
                            Modifier.weight(1f).clip(RoundedCornerShape(12.dp))
                                .background(if (aktif) MaterialTheme.colorScheme.surface else Color.Transparent)
                                .pressClick { tab = i }.padding(vertical = 10.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(label, style = MaterialTheme.typography.labelLarge, color = if (aktif) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
                Spacer(Modifier.height(12.dp))
            }

            if (tab == 0) {
                val perluRestock = products.filter { it.status != "archived" && it.stok <= it.minStok && it.jenis != "PERLENGKAPAN" }
                if (perluRestock.isNotEmpty()) item {
                    Row(
                        Modifier.fillMaxWidth().padding(bottom = 10.dp).clip(RoundedCornerShape(16.dp)).background(BizgrowColors.Warning.copy(alpha = 0.12f))
                            .pressClick { showRestock = true }.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Rounded.Inventory2, null, tint = BizgrowColors.WarningDark)
                        Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f)) {
                            Text("Saran restock: ${perluRestock.size} produk", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = BizgrowColors.WarningDark)
                            Text("Stok sudah di bawah atau sama dengan batas minimum", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Icon(Icons.Rounded.ChevronRight, null, tint = BizgrowColors.WarningDark)
                    }
                }
                item {
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(bottom = 8.dp)) {
                        item { FilterPill("Semua", filter == null, { filter = null }) }
                        items(listOf("Draft", "Dikirim", "Diterima", "Dibatalkan")) { f -> FilterPill(f, filter == f, { filter = if (filter == f) null else f }) }
                    }
                }
                if (tampilPo.isEmpty()) item {
                    EmptyView("Belum ada purchase order", "Buat PO ke supplier. Saat barang diterima, stok bertambah otomatis.", Icons.Rounded.LocalShipping, "Buat PO", { showPo = true })
                }
                itemsIndexed(tampilPo, key = { _, po -> po.id }) { i, po ->
                    PoCard(po, Modifier.padding(vertical = 5.dp).enterAnimation(i), onBuka = { viewModel.bukaPo(po.id) }) { aksi -> konfirmasi = po to aksi }
                }
            } else {
                if (suppliers.isEmpty()) item {
                    EmptyView("Belum ada supplier", "Tambahkan pemasok barang agar bisa membuat purchase order.", Icons.Rounded.Storefront, "Tambah supplier", { showSupplier = true })
                }
                itemsIndexed(suppliers, key = { _, s -> s.id }) { i, s ->
                    SupplierCard(s, Modifier.padding(vertical = 5.dp).enterAnimation(i)) { viewModel.deleteSupplier(s.id) }
                }
            }
        }
    }

    if (showPo) {
        ModalBottomSheet({ showPo = false; presetProduk = null }, containerColor = MaterialTheme.colorScheme.surface, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
            PoForm(suppliers, products.filter { it.status != "archived" }, presetProduk) { supplierId, productId, qty, harga ->
                viewModel.createPurchaseOrder(supplierId, productId, qty, harga) { ok -> if (ok) showPo = false }
            }
        }
    }
    if (showRestock) {
        val daftar = products.filter { it.status != "archived" && it.stok <= it.minStok && it.jenis != "PERLENGKAPAN" }
        ModalBottomSheet({ showRestock = false }, containerColor = MaterialTheme.colorScheme.surface) {
            Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 28.dp)) {
                Text("Saran restock", style = MaterialTheme.typography.titleLarge)
                Text("Ketuk produk untuk membuat PO dengan jumlah yang disarankan (2× batas minimum).", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(10.dp))
                Column(Modifier.heightIn(max = 460.dp).verticalScroll(rememberScrollState())) {
                    daftar.forEach { p ->
                        ListRow(p.nama, subtitle = "Stok ${p.stok} • minimum ${p.minStok}", icon = Icons.Rounded.Inventory2, tint = BizgrowColors.Warning, showChevron = true,
                            onClick = { presetProduk = p; showRestock = false; showPo = true })
                    }
                }
            }
        }
    }
    if (showSupplier) {
        ModalBottomSheet({ showSupplier = false }, containerColor = MaterialTheme.colorScheme.surface, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
            SupplierForm { nama, kontak, telp, email, alamat ->
                viewModel.createSupplier(nama, kontak, telp, email, "Umum", alamat)
                showSupplier = false
            }
        }
    }
    konfirmasi?.let { (po, aksi) ->
        val (judul, pesan) = when (aksi) {
            "SENT" -> "Kirim PO ke supplier?" to "Status berubah menjadi Dikirim."
            "RECEIVED" -> "Terima semua barang?" to "Stok ${po.productName} bertambah ${po.qty} dan harga pokok diperbarui."
            else -> "Batalkan PO?" to "PO ${po.poNumber} tidak bisa diproses lagi."
        }
        AlertDialog(
            onDismissRequest = { konfirmasi = null },
            shape = RoundedCornerShape(24.dp),
            containerColor = MaterialTheme.colorScheme.surface,
            title = { Text(judul) },
            text = { Text(pesan) },
            confirmButton = { TextButton(onClick = { viewModel.updatePoStatus(po.id, aksi); konfirmasi = null }) { Text("Ya, lanjutkan") } },
            dismissButton = { TextButton(onClick = { konfirmasi = null }) { Text("Batal") } }
        )
    }
}

@Composable
private fun PoCard(po: PurchaseOrder, modifier: Modifier, onBuka: () -> Unit, onAksi: (String) -> Unit) {
    val (label, warna) = statusPo(po.status)
    BizSurface(modifier.fillMaxWidth(), onClick = onBuka, contentPadding = PaddingValues(14.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconBadge(Icons.Rounded.LocalShipping, warna)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(po.poNumber, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface)
                Text(po.supplierName, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            StatusChip(label, warna)
        }
        Spacer(Modifier.height(10.dp))
        Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceVariant).padding(10.dp)) {
            Column(Modifier.weight(1f)) {
                Text(po.productName, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("${po.qty} × ${po.unitCost.rupiah()}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text(po.totalAmount.rupiah(), style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.primary)
        }
        val aksi = when (po.status.uppercase()) {
            "DRAFT" -> listOf("SENT" to "Kirim", "CANCELLED" to "Batalkan")
            "SENT", "ORDERED", "PARTIAL" -> listOf("RECEIVED" to "Terima semua", "CANCELLED" to "Batalkan")
            else -> emptyList()
        }
        if (aksi.isNotEmpty()) {
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                aksi.forEach { (kode, teks) ->
                    if (kode == "CANCELLED") BizOutlineButton(teks, { onAksi(kode) }, tint = BizgrowColors.Danger, height = 42.dp, modifier = Modifier.weight(1f))
                    else BizButton(teks, { onAksi(kode) }, height = 42.dp, icon = if (kode == "RECEIVED") Icons.Rounded.Inventory else Icons.Rounded.Send, modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun SupplierCard(s: Supplier, modifier: Modifier, onHapus: () -> Unit) {
    var tanya by remember { mutableStateOf(false) }
    BizSurface(modifier.fillMaxWidth(), contentPadding = PaddingValues(14.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            ProductThumb(s.name, null, Modifier.size(44.dp), RoundedCornerShape(14.dp), fontSize = androidx.compose.ui.unit.TextUnit(15f, androidx.compose.ui.unit.TextUnitType.Sp))
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(s.name, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface)
                Text(listOf(s.contactName, s.phone).filter { it.isNotBlank() }.joinToString(" • ").ifBlank { "Tanpa kontak" }, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (s.address.isNotBlank()) Text(s.address, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            IconButton(onClick = { tanya = true }) { Icon(Icons.Rounded.DeleteOutline, "Hapus", tint = MaterialTheme.colorScheme.onSurfaceVariant) }
        }
    }
    if (tanya) {
        AlertDialog(
            onDismissRequest = { tanya = false },
            shape = RoundedCornerShape(24.dp),
            containerColor = MaterialTheme.colorScheme.surface,
            title = { Text("Hapus ${s.name}?") },
            text = { Text("Supplier yang sudah punya PO tidak bisa dihapus.") },
            confirmButton = { TextButton(onClick = { tanya = false; onHapus() }) { Text("Hapus", color = BizgrowColors.Danger) } },
            dismissButton = { TextButton(onClick = { tanya = false }) { Text("Batal") } }
        )
    }
}

@Composable
private fun PoForm(suppliers: List<Supplier>, products: List<com.upstyle.bizgrow.data.Product>, produkAwal: com.upstyle.bizgrow.data.Product? = null, onSimpan: (String, String, Int, Double) -> Unit) {
    var supplier by remember { mutableStateOf(suppliers.firstOrNull()) }
    var cari by remember { mutableStateOf("") }
    var produk by remember { mutableStateOf<com.upstyle.bizgrow.data.Product?>(produkAwal) }
    var qty by remember { mutableStateOf(produkAwal?.let { (it.minStok * 2 - it.stok).coerceAtLeast(1).toString() } ?: "1") }
    var harga by remember { mutableStateOf(produkAwal?.hargaBeli?.takeIf { it > 0 }?.toLong()?.toString() ?: "") }
    val uiQty = qty.toIntOrNull() ?: 0
    val uiHarga = harga.toDoubleOrNull() ?: 0.0
    Column(Modifier.padding(horizontal = 20.dp).padding(bottom = 28.dp).imePadding(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Purchase order baru", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface)
        if (suppliers.isEmpty()) {
            Text("Tambahkan supplier terlebih dahulu.", color = BizgrowColors.Danger)
        } else {
        Text("Supplier", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface)
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) { items(suppliers) { s -> FilterPill(s.name, supplier?.id == s.id, { supplier = s }) } }
        Text("Barang", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface)
        if (produk == null) {
            BizSearchField(cari, { cari = it }, "Cari barang (termasuk bahan baku)")
            Column(Modifier.heightIn(max = 220.dp)) {
                LazyColumn {
                    items(products.filter { cari.isBlank() || it.nama.contains(cari, true) }.take(30), key = { it.id }) { p ->
                        ListRow(p.nama, subtitle = "Stok ${p.stok} • beli ${p.hargaBeli.rupiah()}", icon = Icons.Rounded.Inventory2, tint = BizgrowColors.Warning, onClick = {
                            produk = p; harga = p.hargaBeli.toLong().takeIf { it > 0 }?.toString() ?: ""
                        })
                    }
                }
            }
        } else {
            ListRow(produk!!.nama, subtitle = "Ketuk untuk ganti barang", icon = Icons.Rounded.Inventory2, tint = BizgrowColors.Warning, showChevron = true, onClick = { produk = null })
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                BizTextField(qty, { qty = it.filter(Char::isDigit) }, "Jumlah", Modifier.weight(1f), keyboardType = KeyboardType.Number)
                BizTextField(harga, { harga = it.filter(Char::isDigit) }, "Harga beli satuan", Modifier.weight(1.4f), keyboardType = KeyboardType.Number)
            }
            Text("Total ${(uiQty * uiHarga).rupiah()}", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
        }
        BizButton(
            "Buat purchase order",
            { onSimpan(supplier!!.id, produk!!.id, uiQty, uiHarga) },
            enabled = supplier != null && produk != null && uiQty > 0 && uiHarga > 0,
            icon = Icons.Rounded.Check,
            modifier = Modifier.fillMaxWidth()
        )
        }
    }
}

@Composable
private fun SupplierForm(onSimpan: (String, String, String, String, String) -> Unit) {
    var nama by remember { mutableStateOf("") }
    var kontak by remember { mutableStateOf("") }
    var telp by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var alamat by remember { mutableStateOf("") }
    Column(Modifier.padding(horizontal = 20.dp).padding(bottom = 28.dp).imePadding(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Supplier baru", style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface)
        BizTextField(nama, { nama = it }, "Nama supplier", leadingIcon = Icons.Rounded.Storefront)
        BizTextField(kontak, { kontak = it }, "Nama kontak", leadingIcon = Icons.Rounded.Person)
        BizTextField(telp, { telp = it }, "Telepon", leadingIcon = Icons.Rounded.Phone, keyboardType = KeyboardType.Phone)
        BizTextField(email, { email = it }, "Email (opsional)", leadingIcon = Icons.Rounded.MailOutline, keyboardType = KeyboardType.Email)
        BizTextField(alamat, { alamat = it }, "Alamat (opsional)", leadingIcon = Icons.Rounded.Place)
        BizButton("Simpan supplier", { onSimpan(nama.trim(), kontak.trim(), telp.trim(), email.trim(), alamat.trim()) }, enabled = nama.isNotBlank(), icon = Icons.Rounded.Check, modifier = Modifier.fillMaxWidth())
    }
}
