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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.data.*
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors

private val LANGKAH_SO = mapOf("PENDING" to "PROCESSING", "PROCESSING" to "SHIPPED", "SHIPPED" to "CLOSED")

@Composable
fun SalesOrdersScreen(viewModel: AppViewModel) {
    val daftar by viewModel.salesOrders.collectAsState(initial = viewModel.salesOrders.value)
    val kontak by viewModel.crmContacts.collectAsState(initial = viewModel.crmContacts.value)
    val produk by viewModel.products.collectAsState(initial = viewModel.products.value)
    var filter by remember { mutableStateOf("SEMUA") }
    var baru by remember { mutableStateOf(false) }
    var dipilih by remember { mutableStateOf<SalesOrder?>(null) }

    LaunchedEffect(Unit) { viewModel.loadSalesOrders(); viewModel.loadCrmData(); viewModel.loadProducts() }

    val tampil = daftar.filter { filter == "SEMUA" || it.status == filter }
    BizScreen(
        title = "Sales order",
        subtitle = "${daftar.size} pesanan • ${daftar.filter { it.status != "CANCELLED" }.sumOf { it.totalAmount }.rupiahRingkas()}",
        onBack = { viewModel.navigateBack() },
        floatingActionButton = { FabTambah("Sales order") { baru = true } }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterPill("Semua", filter == "SEMUA", { filter = "SEMUA" })
                listOf("PENDING", "PROCESSING", "SHIPPED", "CLOSED", "CANCELLED").forEach { st -> FilterPill(labelStatusJual(st), filter == st, { filter = st }) }
            }
            if (tampil.isEmpty()) {
                EmptyView(
                    if (daftar.isEmpty()) "Belum ada sales order" else "Tidak ada sales order ${labelStatusJual(filter).lowercase()}",
                    "Catat pesanan pelanggan dan pantau prosesnya sampai selesai.",
                    Icons.Rounded.ShoppingCart, if (daftar.isEmpty()) "Buat sales order" else null, if (daftar.isEmpty()) ({ baru = true }) else null
                )
            } else {
                LazyColumn(contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 96.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(tampil, key = { it.id }) { o ->
                        BizSurface(Modifier.fillMaxWidth(), onClick = { dipilih = o }, contentPadding = PaddingValues(14.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                IconBadge(Icons.Rounded.ShoppingCart, warnaStatusJual(o.status), size = 46.dp, iconSize = 22.dp)
                                Spacer(Modifier.width(12.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(o.customerName.ifBlank { "Tanpa pelanggan" }, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    Text(o.orderNumber.ifBlank { "SO-${o.id}" }, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text("${o.items.size} item", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(o.totalAmount.rupiah(), fontWeight = FontWeight.Bold, color = BizgrowColors.Success)
                                    StatusChip(labelStatusJual(o.status), warnaStatusJual(o.status))
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (baru) PenjualanFormSheet("Sales order baru", kontak, produk, false, { baru = false }) { cust, _, catatan, item ->
        viewModel.buatSalesOrder(cust, catatan, item); baru = false
    }
    dipilih?.let { awal ->
        val o = daftar.firstOrNull { it.id == awal.id } ?: awal
        DetailSalesOrderSheet(o, { dipilih = null }) { viewModel.ubahStatusSalesOrder(o.id, it) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DetailSalesOrderSheet(o: SalesOrder, onDismiss: () -> Unit, onStatus: (String) -> Unit) {
    var batal by remember { mutableStateOf(false) }
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = MaterialTheme.colorScheme.surface) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 20.dp).padding(bottom = 20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(o.customerName.ifBlank { "Tanpa pelanggan" }, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text(o.orderNumber, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                StatusChip(labelStatusJual(o.status), warnaStatusJual(o.status))
            }
            if (o.createdAt.isNotBlank()) Text("Dibuat ${o.createdAt.tanggalJam()}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            HorizontalDivider()
            o.items.forEach { ItemJualBaris(it.productName, it.qty, it.price, it.total) }
            HorizontalDivider()
            Row(Modifier.fillMaxWidth()) {
                Text("Total", Modifier.weight(1f), fontWeight = FontWeight.Bold)
                Text(o.totalAmount.rupiah(), fontWeight = FontWeight.Bold, color = BizgrowColors.Success)
            }
            if (!o.notes.isNullOrBlank()) Text("Catatan: ${o.notes}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            val lanjut = LANGKAH_SO[o.status]
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                if (o.status != "CLOSED" && o.status != "CANCELLED") BizOutlineButton("Batalkan", onClick = { batal = true }, tint = BizgrowColors.Danger)
                if (lanjut != null) BizButton("Lanjut: ${labelStatusJual(lanjut)}", onClick = { onStatus(lanjut) }, modifier = Modifier.weight(1f), icon = Icons.Rounded.ArrowForward)
            }
        }
    }
    if (batal) AlertDialog(
        onDismissRequest = { batal = false },
        title = { Text("Batalkan sales order?") },
        text = { Text("${o.orderNumber} akan ditandai Dibatalkan.") },
        confirmButton = { TextButton(onClick = { batal = false; onStatus("CANCELLED") }) { Text("Batalkan pesanan", color = BizgrowColors.Danger) } },
        dismissButton = { TextButton(onClick = { batal = false }) { Text("Kembali") } }
    )
}
