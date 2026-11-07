package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
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
import com.upstyle.bizgrow.data.EcommerceOrder
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors

internal val FILTER_PESANAN = listOf(
    "SEMUA" to "Semua", "PENDING" to "Belum bayar", "PAID" to "Perlu diproses", "PROCESSING" to "Diproses",
    "SHIPPED" to "Dikirim", "COMPLETED" to "Selesai", "CANCELLED" to "Batal"
)

internal fun labelStatusPesanan(s: String): String = FILTER_PESANAN.firstOrNull { it.first == s.uppercase() }?.second ?: s

internal fun warnaStatusPesanan(s: String): Color = when (s.uppercase()) {
    "PAID" -> BizgrowColors.Info
    "PROCESSING" -> BizgrowColors.Warning
    "SHIPPED" -> BizgrowColors.Violet
    "COMPLETED" -> BizgrowColors.Success
    "CANCELLED" -> BizgrowColors.Danger
    else -> Color(0xFF64748B)
}

/** Pesanan toko online: daftar dengan filter status dan ringkasan. */
@Composable
fun OrdersScreen(viewModel: AppViewModel) {
    val state by viewModel.ordersState.collectAsState(initial = viewModel.ordersState.value)
    var filter by remember { mutableStateOf("SEMUA") }
    val listState = rememberLazyListState()

    LaunchedEffect(Unit) { viewModel.loadOrders() }

    val semua = state.orders
    val tampil = semua.filter { filter == "SEMUA" || it.status.uppercase() == filter }
    val pendapatan = semua.filter { it.status.uppercase() != "CANCELLED" && it.paymentStatus == "PAID" }.sumOf { it.totalAmount }
    val perluProses = semua.count { it.status.uppercase() == "PAID" }

    // muat halaman berikutnya saat mendekati akhir daftar
    val akhir by remember { derivedStateOf { listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0 } }
    LaunchedEffect(akhir, tampil.size) { if (tampil.isNotEmpty() && akhir >= tampil.size - 3) viewModel.loadMoreOrders() }

    BizScreen(
        title = "Pesanan online", subtitle = "${semua.size} pesanan",
        onBack = { viewModel.navigateBack() },
        actions = { BizIconButton(Icons.Rounded.Refresh, "Muat ulang") { viewModel.loadOrders() } },
        bottomBar = { BottomNavBar(viewModel, Screen.Orders) }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatTile("Sudah dibayar", pendapatan.rupiahRingkas(), Icons.Rounded.Payments, BizgrowColors.Success, Modifier.weight(1f))
                StatTile("Perlu diproses", "$perluProses", Icons.Rounded.Inventory2, BizgrowColors.Info, Modifier.weight(1f))
            }
            Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FILTER_PESANAN.forEach { (id, label) ->
                    val n = if (id == "SEMUA") semua.size else semua.count { it.status.uppercase() == id }
                    FilterPill("$label ($n)", filter == id, { filter = id })
                }
            }
            Spacer(Modifier.height(8.dp))
            when {
                state.isLoading && semua.isEmpty() -> SkeletonList(5, Modifier.padding(16.dp))
                state.error != null && semua.isEmpty() -> ErrorView(state.error ?: "", { viewModel.loadOrders() })
                tampil.isEmpty() -> EmptyView(
                    if (semua.isEmpty()) "Belum ada pesanan" else "Tidak ada pesanan ${labelStatusPesanan(filter).lowercase()}",
                    "Pesanan dari toko online pelanggan akan muncul di sini.", Icons.Rounded.ShoppingBag
                )
                else -> LazyColumn(state = listState, contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(tampil, key = { it.id }) { o -> KartuPesanan(o) { viewModel.navigate(Screen.OrderDetail(o.id)) } }
                }
            }
        }
    }
}

@Composable
private fun KartuPesanan(o: EcommerceOrder, onClick: () -> Unit) {
    val warna = warnaStatusPesanan(o.status)
    BizSurface(Modifier.fillMaxWidth(), onClick = onClick, contentPadding = PaddingValues(14.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconBadge(Icons.Rounded.ShoppingBag, warna, size = 46.dp, iconSize = 22.dp)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(o.customerName.ifBlank { "Pelanggan" }, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(o.orderNumber, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("${o.items.sumOf { it.qty }} barang • ${o.createdAt.take(10)}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(o.totalAmount.rupiah(), fontWeight = FontWeight.Bold, color = BizgrowColors.Success)
                StatusChip(labelStatusPesanan(o.status), warna)
            }
        }
    }
}
