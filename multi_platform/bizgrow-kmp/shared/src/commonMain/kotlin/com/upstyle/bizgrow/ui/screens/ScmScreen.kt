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
import kotlinx.coroutines.launch
import kotlinx.datetime.toLocalDateTime
import kotlinx.datetime.plus
import kotlinx.datetime.minus
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
    var ubahSupplier by remember { mutableStateOf<Supplier?>(null) }

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
                onClick = { if (tab == 0) showPo = true else if (tab == 1) showSupplier = true else tab = 0 },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary,
                shape = RoundedCornerShape(18.dp),
                icon = { Icon(Icons.Rounded.Add, null) },
                text = { Text(if (tab == 0) "Buat PO" else if (tab == 1) "Supplier" else "Buat PO") }
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
                    listOf("Purchase order", "Supplier", "Laporan").forEachIndexed { i, label ->
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
            } else if (tab == 2) {
                item { LaporanPembelianTab(viewModel) }
            } else {
                if (suppliers.isEmpty()) item {
                    EmptyView("Belum ada supplier", "Tambahkan pemasok barang agar bisa membuat purchase order.", Icons.Rounded.Storefront, "Tambah supplier", { showSupplier = true })
                }
                itemsIndexed(suppliers, key = { _, s -> s.id }) { i, s ->
                    SupplierCard(s, Modifier.padding(vertical = 5.dp).enterAnimation(i), onUbah = { ubahSupplier = s }, onAktif = { viewModel.aturSupplierAktif(s, s.isActive != 1) }) { viewModel.deleteSupplier(s.id) }
                }
            }
        }
    }

    if (showPo) {
        PoFormLengkap(viewModel, suppliers.filter { it.isActive == 1 }, products.filter { it.status != "archived" }, presetProduk, onDismiss = { showPo = false; presetProduk = null })
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
        SupplierFormSheet(null, { showSupplier = false }) { nama, kontak, telp, email, alamat, _ ->
            viewModel.createSupplier(nama, kontak, telp, email, "Umum", alamat)
            null
        }
    }
    ubahSupplier?.let { sup ->
        val scope = rememberCoroutineScope()
        SupplierFormSheet(sup, { ubahSupplier = null }) { nama, kontak, telp, email, alamat, termin -> viewModel.ubahSupplier(sup, nama, kontak, telp, email, alamat, termin) }
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
                Text("${po.qty} × ${po.unitCost.rupiah()}" + if (po.jumlahItem > 1) "  +${po.jumlahItem - 1} barang lain" else "", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
private fun SupplierCard(s: Supplier, modifier: Modifier, onUbah: () -> Unit, onAktif: () -> Unit, onHapus: () -> Unit) {
    var tanya by remember { mutableStateOf(false) }
    var menu by remember { mutableStateOf(false) }
    BizSurface(modifier.fillMaxWidth(), onClick = onUbah, contentPadding = PaddingValues(14.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            ProductThumb(s.name, null, Modifier.size(44.dp), RoundedCornerShape(14.dp), fontSize = androidx.compose.ui.unit.TextUnit(15f, androidx.compose.ui.unit.TextUnitType.Sp))
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(s.name, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f, fill = false))
                    if (s.isActive != 1) { Spacer(Modifier.width(6.dp)); StatusChip("Nonaktif", BizgrowColors.Warning) }
                }
                Text(listOf(s.contactName, s.phone).filter { it.isNotBlank() }.joinToString(" • ").ifBlank { "Tanpa kontak" }, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("Termin ${s.termPembayaran} hari" + if (s.address.isNotBlank()) " • ${s.address}" else "", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Box {
                IconButton(onClick = { menu = true }) { Icon(Icons.Rounded.MoreVert, "Menu", tint = MaterialTheme.colorScheme.onSurfaceVariant) }
                DropdownMenu(menu, { menu = false }) {
                    DropdownMenuItem(text = { Text("Ubah") }, leadingIcon = { Icon(Icons.Rounded.Edit, null) }, onClick = { menu = false; onUbah() })
                    DropdownMenuItem(text = { Text(if (s.isActive == 1) "Nonaktifkan" else "Aktifkan") }, leadingIcon = { Icon(if (s.isActive == 1) Icons.Rounded.PauseCircle else Icons.Rounded.PlayCircle, null) }, onClick = { menu = false; onAktif() })
                    DropdownMenuItem(text = { Text("Hapus", color = BizgrowColors.Danger) }, leadingIcon = { Icon(Icons.Rounded.DeleteOutline, null, tint = BizgrowColors.Danger) }, onClick = { menu = false; tanya = true })
                }
            }
        }
    }
    if (tanya) {
        KonfirmasiHapus("Hapus ${s.name}?", "Supplier yang sudah punya PO tidak bisa dihapus — nonaktifkan saja.", { tanya = false; onHapus() }, { tanya = false })
    }
}

private class BarisPo(produk: com.upstyle.bizgrow.data.Product? = null, qty: String = "1", harga: String = "") {
    var produk by mutableStateOf(produk)
    var qty by mutableStateOf(qty)
    var harga by mutableStateOf(harga)
}

/** PO lengkap seperti web: banyak barang, diskon, ongkir, PPN, perkiraan tiba, catatan. Total dihitung server. */
@Composable
private fun PoFormLengkap(viewModel: AppViewModel, suppliers: List<Supplier>, products: List<com.upstyle.bizgrow.data.Product>, produkAwal: com.upstyle.bizgrow.data.Product?, onDismiss: () -> Unit) {
    val hari = remember { kotlinx.datetime.Clock.System.now().toLocalDateTime(kotlinx.datetime.TimeZone.of("Asia/Jakarta")).date }
    var supplierId by remember { mutableStateOf(suppliers.firstOrNull()?.id) }
    val baris = remember {
        mutableStateListOf(
            if (produkAwal != null) BarisPo(produkAwal, (produkAwal.minStok * 2 - produkAwal.stok).coerceAtLeast(1).toString(), produkAwal.hargaBeli.takeIf { it > 0 }?.toLong()?.toString() ?: "") else BarisPo()
        )
    }
    var tiba by remember { mutableStateOf(hari.plus(7, kotlinx.datetime.DateTimeUnit.DAY).toString()) }
    var diskon by remember { mutableStateOf("") }
    var ongkir by remember { mutableStateOf("") }
    var ppn by remember { mutableStateOf("") }
    var catatan by remember { mutableStateOf("") }
    var galat by remember { mutableStateOf<String?>(null) }
    var proses by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val subtotal = baris.sumOf { (it.qty.toIntOrNull() ?: 0) * (it.harga.toDoubleOrNull() ?: 0.0) }
    val dDiskon = diskon.toDoubleOrNull() ?: 0.0
    val dOngkir = ongkir.toDoubleOrNull() ?: 0.0
    val pPpn = ppn.toDoubleOrNull() ?: 0.0
    val dpp = (subtotal - dDiskon).coerceAtLeast(0.0)
    val nilaiPpn = dpp * pPpn / 100
    val total = dpp + nilaiPpn + dOngkir
    val lengkap = baris.isNotEmpty() && baris.all { it.produk != null && (it.qty.toIntOrNull() ?: 0) > 0 && (it.harga.toDoubleOrNull() ?: -1.0) >= 0 } &&
        baris.mapNotNull { it.produk?.id }.let { it.toSet().size == it.size }

    FormSheet(
        judul = "Purchase order baru", subjudul = "Total dihitung server saat disimpan",
        onDismiss = onDismiss, labelSimpan = if (proses) "Menyimpan…" else "Simpan sebagai draft",
        simpanAktif = supplierId != null && lengkap && dDiskon <= subtotal && !proses,
        onSimpan = {
            proses = true; galat = null
            scope.launch {
                val err = viewModel.buatPoLengkap(
                    supplierId!!, baris.map { Triple(it.produk!!.id, it.qty.toInt(), it.harga.toDouble()) },
                    dDiskon, dOngkir, pPpn, tiba, catatan.trim().ifBlank { null }
                )
                proses = false
                if (err == null) onDismiss() else galat = err
            }
        }
    ) {
        if (suppliers.isEmpty()) Text("Tambahkan supplier aktif terlebih dahulu.", color = BizgrowColors.Danger)
        PilihanField("Supplier *", suppliers.map { it.id to it.name }, supplierId, { supplierId = it }, placeholder = "Pilih supplier…")
        TanggalField("Perkiraan tiba", tiba) { tiba = it }
        Text("Barang", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
        baris.forEachIndexed { i, b ->
            BizSurface(Modifier.fillMaxWidth(), contentPadding = PaddingValues(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Barang ${i + 1}", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
                    if (baris.size > 1) BizIconButton(Icons.Rounded.Close, "Hapus") { baris.removeAt(i) }
                }
                PilihanField("Produk / bahan", products.map { it.id to "${it.nama} (stok ${it.stok})" }, b.produk?.id, { id ->
                    val p = products.firstOrNull { it.id == id }
                    b.produk = p
                    if (p != null && b.harga.isBlank()) b.harga = p.hargaBeli.toLong().takeIf { it > 0 }?.toString() ?: ""
                }, placeholder = "Pilih barang…")
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(Modifier.weight(0.8f)) { AngkaField(b.qty, { b.qty = it }, "Jumlah", desimal = false) }
                    Box(Modifier.weight(1.2f)) { AngkaField(b.harga, { b.harga = it }, "Harga beli satuan", desimal = false) }
                }
                val sub = (b.qty.toIntOrNull() ?: 0) * (b.harga.toDoubleOrNull() ?: 0.0)
                if (sub > 0) Text("Subtotal ${sub.rupiah()}", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
            }
        }
        if (baris.mapNotNull { it.produk?.id }.let { it.toSet().size != it.size }) Text("Ada produk yang sama lebih dari sekali — gabungkan jumlahnya.", color = BizgrowColors.Danger, style = MaterialTheme.typography.bodySmall)
        TextButton(onClick = { baris.add(BarisPo()) }) { Icon(Icons.Rounded.Add, null); Spacer(Modifier.width(6.dp)); Text("Tambah barang") }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(Modifier.weight(1f)) { AngkaField(diskon, { diskon = it }, "Diskon (Rp)", desimal = false) }
            Box(Modifier.weight(1f)) { AngkaField(ongkir, { ongkir = it }, "Ongkir (Rp)", desimal = false) }
        }
        AngkaField(ppn, { ppn = it }, "PPN (%)", placeholder = "0", supporting = "Dihitung dari subtotal setelah diskon")
        BizTextField(catatan, { catatan = it }, "Catatan (opsional)", leadingIcon = Icons.Rounded.Notes)
        BizSurface(Modifier.fillMaxWidth(), contentPadding = PaddingValues(12.dp)) {
            RowInfo("Subtotal", subtotal.rupiah())
            if (dDiskon > 0) RowInfo("Diskon", "− " + dDiskon.rupiah())
            if (nilaiPpn > 0) RowInfo("PPN ${pPpn}%", nilaiPpn.rupiah())
            if (dOngkir > 0) RowInfo("Ongkir", dOngkir.rupiah())
            HorizontalDivider(Modifier.padding(vertical = 6.dp), color = MaterialTheme.colorScheme.outlineVariant)
            RowInfo("Total", total.rupiah(), tebal = true)
            if (dDiskon > subtotal) Text("Diskon tidak boleh melebihi subtotal", color = BizgrowColors.Danger, style = MaterialTheme.typography.labelSmall)
        }
        galat?.let { Text(it, color = BizgrowColors.Danger, style = MaterialTheme.typography.bodySmall) }
    }
}

@Composable
private fun RowInfo(label: String, nilai: String, tebal: Boolean = false) {
    Row(Modifier.fillMaxWidth().padding(vertical = 2.dp)) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
        Text(nilai, style = if (tebal) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyMedium, fontWeight = if (tebal) FontWeight.Bold else FontWeight.SemiBold)
    }
}

/** Tambah / ubah supplier. [onSimpan] mengembalikan pesan galat (null = berhasil). */
@Composable
private fun SupplierFormSheet(awal: Supplier?, onDismiss: () -> Unit, onSimpan: suspend (String, String, String, String, String, Int) -> String?) {
    var nama by remember { mutableStateOf(awal?.name ?: "") }
    var kontak by remember { mutableStateOf(awal?.contactName ?: "") }
    var telp by remember { mutableStateOf(awal?.phone ?: "") }
    var email by remember { mutableStateOf(awal?.email ?: "") }
    var alamat by remember { mutableStateOf(awal?.address ?: "") }
    var termin by remember { mutableStateOf((awal?.termPembayaran ?: 30).toString()) }
    var galat by remember { mutableStateOf<String?>(null) }
    var proses by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    FormSheet(
        judul = if (awal == null) "Supplier baru" else "Ubah supplier", onDismiss = onDismiss,
        simpanAktif = nama.isNotBlank() && !proses && (email.isBlank() || "@" in email),
        onSimpan = {
            proses = true; galat = null
            scope.launch {
                val err = onSimpan(nama.trim(), kontak.trim(), telp.trim(), email.trim(), alamat.trim(), termin.toIntOrNull() ?: 30)
                proses = false
                if (err == null) onDismiss() else galat = err
            }
        }
    ) {
        BizTextField(nama, { nama = it }, "Nama supplier *", leadingIcon = Icons.Rounded.Storefront)
        BizTextField(kontak, { kontak = it }, "Nama kontak", leadingIcon = Icons.Rounded.Person)
        BizTextField(telp, { telp = it }, "Telepon", leadingIcon = Icons.Rounded.Phone, keyboardType = KeyboardType.Phone)
        BizTextField(email, { email = it }, "Email (opsional)", leadingIcon = Icons.Rounded.MailOutline, keyboardType = KeyboardType.Email)
        BizTextField(alamat, { alamat = it }, "Alamat (opsional)", leadingIcon = Icons.Rounded.Place)
        AngkaField(termin, { termin = it }, "Termin pembayaran (hari)", desimal = false, supporting = "Dipakai sebagai jatuh tempo default tagihan")
        galat?.let { Text(it, color = BizgrowColors.Danger, style = MaterialTheme.typography.bodySmall) }
    }
}

/** Laporan pembelian periode: ringkasan, per supplier, per produk (dari tagihan supplier). */
@Composable
private fun LaporanPembelianTab(viewModel: AppViewModel) {
    val lap by viewModel.laporanPembelian.collectAsState()
    val hari = remember { kotlinx.datetime.Clock.System.now().toLocalDateTime(kotlinx.datetime.TimeZone.of("Asia/Jakarta")).date }
    var periode by remember { mutableStateOf("Bulan ini") }
    fun rentang(p: String): Pair<String, String> = when (p) {
        "Bulan lalu" -> kotlinx.datetime.LocalDate(hari.year, hari.monthNumber, 1).minus(1, kotlinx.datetime.DateTimeUnit.MONTH).let { a -> a.toString() to a.plus(1, kotlinx.datetime.DateTimeUnit.MONTH).minus(1, kotlinx.datetime.DateTimeUnit.DAY).toString() }
        "3 bulan" -> hari.minus(90, kotlinx.datetime.DateTimeUnit.DAY).toString() to hari.toString()
        "Tahun ini" -> kotlinx.datetime.LocalDate(hari.year, 1, 1).toString() to hari.toString()
        else -> kotlinx.datetime.LocalDate(hari.year, hari.monthNumber, 1).toString() to hari.toString()
    }
    LaunchedEffect(periode) { val (d, s) = rentang(periode); viewModel.loadLaporanPembelian(d, s) }
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("Bulan ini", "Bulan lalu", "3 bulan", "Tahun ini").forEach { FilterPill(it, periode == it, { periode = it }) }
        }
        val l = lap
        if (l == null) { SkeletonList(rows = 3); return@Column }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            StatTile("Total pembelian", l.total.rupiahRingkas(), Icons.Rounded.ShoppingCart, BizgrowColors.Primary, Modifier.weight(1f), caption = "${l.jumlahFaktur} faktur")
            StatTile("PPN masukan", l.ppn.rupiahRingkas(), Icons.Rounded.ReceiptLong, BizgrowColors.Info, Modifier.weight(1f), caption = "diskon ${l.diskon.rupiahRingkas()}")
        }
        SectionTitle("Per supplier")
        if (l.perSupplier.isEmpty()) Text("Tidak ada pembelian pada periode ini.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        l.perSupplier.forEachIndexed { i, s -> ListRow(s.nama, subtitle = "${s.jumlah} faktur", icon = Icons.Rounded.Storefront, tint = BizgrowColors.ModuleColors[i % BizgrowColors.ModuleColors.size], trailing = { Text(s.total.rupiahRingkas(), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold) }) }
        if (l.perProduk.isNotEmpty()) {
            SectionTitle("Per produk", subtitle = "Sebelum diskon & pajak")
            l.perProduk.forEachIndexed { i, p -> ListRow(p.nama, subtitle = "${p.qty} unit", icon = Icons.Rounded.Inventory2, tint = BizgrowColors.ModuleColors[i % BizgrowColors.ModuleColors.size], trailing = { Text(p.nilai.rupiahRingkas(), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold) }) }
        }
    }
}
