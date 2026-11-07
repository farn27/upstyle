package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors

private val BAYAR = listOf("PENDING" to "Belum bayar", "PAID" to "Lunas", "FAILED" to "Gagal", "EXPIRED" to "Kedaluwarsa")
private val KIRIM = listOf("PENDING" to "Belum dikirim", "PROCESSING" to "Diproses", "SHIPPED" to "Dikirim", "DELIVERED" to "Diterima")

/** Detail pesanan online: pelanggan, barang, rincian harga, dan ubah status bayar / kirim. */
@Composable
fun OrderDetailScreen(viewModel: AppViewModel, orderId: Int) {
    val o by viewModel.selectedOrder.collectAsState(initial = viewModel.selectedOrder.value)
    val uriHandler = LocalUriHandler.current
    var batal by remember { mutableStateOf(false) }

    LaunchedEffect(orderId) { viewModel.loadOrderDetail(orderId) }
    val order = o?.takeIf { it.id == orderId }

    BizScreen(
        title = order?.orderNumber ?: "Pesanan #$orderId", subtitle = order?.let { labelStatusPesanan(it.status) },
        onBack = { viewModel.navigateBack() },
        actions = { BizIconButton(Icons.Rounded.Refresh, "Muat ulang") { viewModel.loadOrderDetail(orderId) } }
    ) { padding ->
        if (order == null) {
            SkeletonList(4, Modifier.padding(padding).padding(16.dp))
        } else LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                BizSurface(Modifier.fillMaxWidth()) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(order.customerName, Modifier.weight(1f), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        StatusChip(labelStatusPesanan(order.status), warnaStatusPesanan(order.status))
                    }
                    if (order.customerPhone.isNotBlank()) {
                        Spacer(Modifier.height(6.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Rounded.Call, null, Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(Modifier.width(8.dp))
                            Text(order.customerPhone, Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
                            val nomor = order.customerPhone.filter { it.isDigit() }.let { if (it.startsWith("0")) "62" + it.drop(1) else it }
                            TextButton(onClick = { runCatching { uriHandler.openUri("https://wa.me/$nomor") } }) { Text("WhatsApp") }
                        }
                    }
                    if (order.customerEmail.isNotBlank()) Text(order.customerEmail, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    if (order.shippingAddress.isNotBlank()) {
                        Spacer(Modifier.height(6.dp))
                        Text("Alamat kirim", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(order.shippingAddress, style = MaterialTheme.typography.bodyMedium)
                    }
                    if (order.createdAt.isNotBlank()) Text("Dipesan ${order.createdAt.take(16).replace('T', ' ')}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            item { SectionTitle("Barang (${order.items.size})") }
            item {
                BizSurface(Modifier.fillMaxWidth()) {
                    if (order.items.isEmpty()) Text("Tidak ada rincian barang.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    order.items.forEachIndexed { i, it ->
                        if (i > 0) HorizontalDivider(Modifier.padding(vertical = 8.dp))
                        ItemJualBaris(it.productName, it.qty, it.price, it.total)
                    }
                    HorizontalDivider(Modifier.padding(vertical = 8.dp))
                    BarisAngka("Subtotal", order.subtotal.rupiah())
                    if (order.discountAmount > 0) BarisAngka("Diskon", "-" + order.discountAmount.rupiah())
                    BarisAngka("Total", order.totalAmount.rupiah(), tebal = true)
                }
            }
            item {
                BizSurface(Modifier.fillMaxWidth()) {
                    PilihanPil("Pembayaran", BAYAR, order.paymentStatus) { if (it != order.paymentStatus) viewModel.ubahStatusPesanan(orderId, paymentStatus = it) }
                    Spacer(Modifier.height(12.dp))
                    PilihanPil("Pengiriman", KIRIM, order.shippingStatus) { if (it != order.shippingStatus) viewModel.ubahStatusPesanan(orderId, shippingStatus = it) }
                }
            }
            if (order.status.uppercase() != "CANCELLED" && order.status.uppercase() != "COMPLETED") item {
                BizOutlineButton("Batalkan pesanan", onClick = { batal = true }, icon = Icons.Rounded.Cancel, tint = BizgrowColors.Danger, modifier = Modifier.fillMaxWidth())
            }
        }
    }
    if (batal) AlertDialog(
        onDismissRequest = { batal = false },
        title = { Text("Batalkan pesanan?") },
        text = { Text("Pesanan ditandai gagal dan tidak dihitung sebagai pendapatan.") },
        confirmButton = { TextButton(onClick = { batal = false; viewModel.ubahStatusPesanan(orderId, paymentStatus = "FAILED") }) { Text("Batalkan", color = BizgrowColors.Danger) } },
        dismissButton = { TextButton(onClick = { batal = false }) { Text("Kembali") } }
    )
}

@Composable
private fun BarisAngka(label: String, nilai: String, tebal: Boolean = false) {
    Row(Modifier.fillMaxWidth().padding(vertical = 2.dp)) {
        Text(label, Modifier.weight(1f), fontWeight = if (tebal) FontWeight.Bold else FontWeight.Normal)
        Text(nilai, fontWeight = if (tebal) FontWeight.Bold else FontWeight.Normal, color = if (tebal) BizgrowColors.Success else MaterialTheme.colorScheme.onSurface)
    }
}
