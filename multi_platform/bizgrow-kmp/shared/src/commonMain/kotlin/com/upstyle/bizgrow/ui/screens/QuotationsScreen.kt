package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.data.*
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors

internal fun warnaStatusJual(s: String): Color = when (s.uppercase()) {
    "DRAFT" -> Color(0xFF64748B)
    "SENT", "PROCESSING" -> BizgrowColors.Info
    "ACCEPTED", "CLOSED" -> BizgrowColors.Success
    "REJECTED", "CANCELLED", "EXPIRED" -> BizgrowColors.Danger
    "SHIPPED" -> BizgrowColors.Violet
    else -> BizgrowColors.Warning
}

internal fun labelStatusJual(s: String): String = when (s.uppercase()) {
    "DRAFT" -> "Draf"; "SENT" -> "Terkirim"; "ACCEPTED" -> "Diterima"; "REJECTED" -> "Ditolak"; "EXPIRED" -> "Kedaluwarsa"
    "PENDING" -> "Menunggu"; "PROCESSING" -> "Diproses"; "SHIPPED" -> "Dikirim"; "CLOSED" -> "Selesai"; "CANCELLED" -> "Dibatalkan"
    else -> s
}

/** Draf satu baris item pada formulir penawaran / sales order. */
internal class ItemDraft(val produk: Product, qty: String = "1", harga: String = "") {
    var qty by mutableStateOf(qty)
    var harga by mutableStateOf(harga.ifBlank { produk.hargaJual.toLong().toString() })
    val subtotal: Double get() = (qty.toIntOrNull() ?: 0) * (harga.toDoubleOrNull() ?: 0.0)
}

/** Formulir bersama: pelanggan + daftar item produk (+ tanggal berlaku bila penawaran). */
@Composable
internal fun PenjualanFormSheet(
    judul: String, kontak: List<CrmContact>, produk: List<Product>, denganBerlaku: Boolean,
    onDismiss: () -> Unit, onSimpan: (customerId: Int?, validUntil: String?, notes: String?, items: List<ItemJual>) -> Unit
) {
    var pelanggan by remember { mutableStateOf<String?>(null) }
    var berlaku by remember { mutableStateOf("") }
    var catatan by remember { mutableStateOf("") }
    val item = remember { mutableStateListOf<ItemDraft>() }
    val total = item.sumOf { it.subtotal }
    val valid = item.isNotEmpty() && item.all { (it.qty.toIntOrNull() ?: 0) > 0 }

    FormSheet(
        judul = judul, onDismiss = onDismiss, simpanAktif = valid, labelSimpan = "Simpan",
        onSimpan = {
            onSimpan(
                pelanggan?.toIntOrNull(), berlaku.ifBlank { null }, catatan.trim().ifBlank { null },
                item.map { ItemJual(it.produk.id, it.qty.toIntOrNull() ?: 1, it.harga.toDoubleOrNull() ?: it.produk.hargaJual) }
            )
        }
    ) {
        PilihanField("Pelanggan", listOf("" to "— Tanpa pelanggan —") + kontak.map { it.id.toString() to it.nama }, pelanggan ?: "", { pelanggan = it.ifBlank { null } }, placeholder = "Pilih pelanggan")
        if (denganBerlaku) TanggalField("Berlaku sampai (kosong = 7 hari)", berlaku, { berlaku = it })
        Text("Produk", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
        item.forEachIndexed { i, d ->
            BizSurface(Modifier.fillMaxWidth(), contentPadding = PaddingValues(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(d.produk.nama, Modifier.weight(1f), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    BizIconButton(Icons.Rounded.Close, "Hapus baris") { item.removeAt(i) }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(Modifier.weight(0.7f)) { AngkaField(d.qty, { d.qty = it }, "Jumlah", desimal = false) }
                    Box(Modifier.weight(1.3f)) { AngkaField(d.harga, { d.harga = it }, "Harga satuan") }
                }
                Text("Subtotal ${d.subtotal.rupiah()}", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        PilihanField("Tambah produk", produk.map { it.id to "${it.nama} • ${it.hargaJual.rupiahRingkas()}" }, null, { id -> produk.firstOrNull { it.id == id }?.let { item.add(ItemDraft(it)) } }, placeholder = if (produk.isEmpty()) "Belum ada produk" else "Pilih produk untuk ditambahkan")
        BizTextField(catatan, { catatan = it }, "Catatan", singleLine = false)
        Text("Total ${total.rupiah()}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = BizgrowColors.Success)
    }
}

@Composable
internal fun ItemJualBaris(nama: String, qty: Int, harga: Double, total: Double) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(nama.ifBlank { "Item" }, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
            Text("$qty × ${harga.rupiah()}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Text(total.rupiah(), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun QuotationsScreen(viewModel: AppViewModel) {
    val daftar by viewModel.quotations.collectAsState(initial = viewModel.quotations.value)
    val kontak by viewModel.crmContacts.collectAsState(initial = viewModel.crmContacts.value)
    val produk by viewModel.products.collectAsState(initial = viewModel.products.value)
    var filter by remember { mutableStateOf("SEMUA") }
    var baru by remember { mutableStateOf(false) }
    var dipilih by remember { mutableStateOf<Quotation?>(null) }

    LaunchedEffect(Unit) { viewModel.loadQuotations(); viewModel.loadCrmData(); viewModel.loadProducts() }

    val tampil = daftar.filter { filter == "SEMUA" || it.status == filter }
    BizScreen(
        title = "Penawaran", subtitle = "${daftar.size} penawaran • ${daftar.filter { it.status == "ACCEPTED" }.sumOf { it.totalAmount }.rupiahRingkas()} diterima",
        onBack = { viewModel.navigateBack() },
        floatingActionButton = { FabTambah("Penawaran") { baru = true } }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterPill("Semua", filter == "SEMUA", { filter = "SEMUA" })
                listOf("DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED").forEach { st -> FilterPill(labelStatusJual(st), filter == st, { filter = st }) }
            }
            if (tampil.isEmpty()) {
                EmptyView(
                    if (daftar.isEmpty()) "Belum ada penawaran" else "Tidak ada penawaran ${labelStatusJual(filter).lowercase()}",
                    "Buat penawaran harga untuk pelanggan, kirim, lalu jadikan sales order saat diterima.",
                    Icons.Rounded.Description, if (daftar.isEmpty()) "Buat penawaran" else null, if (daftar.isEmpty()) ({ baru = true }) else null
                )
            } else {
                LazyColumn(contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 96.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(tampil, key = { it.id }) { q ->
                        BizSurface(Modifier.fillMaxWidth(), onClick = { dipilih = q }, contentPadding = PaddingValues(14.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                IconBadge(Icons.Rounded.Description, warnaStatusJual(q.status), size = 46.dp, iconSize = 22.dp)
                                Spacer(Modifier.width(12.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(q.customerName.ifBlank { "Tanpa pelanggan" }, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    Text(q.quotationNumber.ifBlank { "QUO-${q.id}" }, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    if (q.validUntil.isNotBlank()) Text("Berlaku s/d ${q.validUntil.tanggalJam()}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(q.totalAmount.rupiah(), fontWeight = FontWeight.Bold, color = BizgrowColors.Success)
                                    StatusChip(labelStatusJual(q.status), warnaStatusJual(q.status))
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (baru) PenjualanFormSheet("Penawaran baru", kontak, produk, true, { baru = false }) { cust, berlaku, catatan, item ->
        viewModel.buatPenawaran(cust, berlaku, catatan, item); baru = false
    }
    dipilih?.let { awal ->
        val q = daftar.firstOrNull { it.id == awal.id } ?: awal
        DetailPenawaranSheet(q, { dipilih = null }, { viewModel.ubahStatusPenawaran(q.id, it) }, { viewModel.jadikanSalesOrder(q.id); dipilih = null })
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DetailPenawaranSheet(q: Quotation, onDismiss: () -> Unit, onStatus: (String) -> Unit, onKonversi: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = MaterialTheme.colorScheme.surface) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 20.dp).padding(bottom = 20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(q.customerName.ifBlank { "Tanpa pelanggan" }, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text(q.quotationNumber, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                StatusChip(labelStatusJual(q.status), warnaStatusJual(q.status))
            }
            if (q.validUntil.isNotBlank()) Text("Berlaku sampai ${q.validUntil.tanggalJam()}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            HorizontalDivider()
            q.items.forEach { ItemJualBaris(it.productName, it.qty, it.price, it.total) }
            HorizontalDivider()
            Row(Modifier.fillMaxWidth()) {
                Text("Total", Modifier.weight(1f), fontWeight = FontWeight.Bold)
                Text(q.totalAmount.rupiah(), fontWeight = FontWeight.Bold, color = BizgrowColors.Success)
            }
            if (!q.notes.isNullOrBlank()) Text("Catatan: ${q.notes}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            when (q.status) {
                "DRAFT" -> BizButton("Tandai terkirim", onClick = { onStatus("SENT") }, modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.Send)
                "SENT" -> Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    BizOutlineButton("Ditolak", onClick = { onStatus("REJECTED") }, tint = BizgrowColors.Danger)
                    BizButton("Diterima", onClick = { onStatus("ACCEPTED") }, modifier = Modifier.weight(1f), icon = Icons.Rounded.Check)
                }
                "ACCEPTED" -> BizButton("Jadikan sales order", onClick = onKonversi, modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.ShoppingCart)
                else -> {}
            }
            if (q.status in listOf("SENT", "DRAFT")) BizOutlineButton("Tandai kedaluwarsa", onClick = { onStatus("EXPIRED") }, modifier = Modifier.fillMaxWidth())
        }
    }
}
