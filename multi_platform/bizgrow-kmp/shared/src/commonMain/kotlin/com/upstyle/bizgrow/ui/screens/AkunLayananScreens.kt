package com.upstyle.bizgrow.ui.screens

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ReceiptLong
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizMotion
import com.upstyle.bizgrow.ui.theme.BizgrowColors

// ═══════════════════════════════════════════════════════════════════════════
//  Riwayat tagihan langganan
// ═══════════════════════════════════════════════════════════════════════════

@Composable
fun InvoiceHistoryScreen(viewModel: AppViewModel) {
    val state by viewModel.subscriptionState.collectAsState(initial = viewModel.subscriptionState.value)
    var memuat by remember { mutableStateOf(true) }
    LaunchedEffect(Unit) { viewModel.loadInvoices().join(); memuat = false }
    val invoices = state.invoices

    BizScreen("Riwayat tagihan", subtitle = "Pembayaran paket langganan", onBack = { viewModel.navigateBack() }) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(16.dp)) {
            if (invoices.isNotEmpty()) {
                item {
                    val lunas = invoices.filter { it.status.equals("paid", true) }.sumOf { it.amount }
                    GradientCard(Modifier.fillMaxWidth().padding(bottom = 16.dp), colors = BizgrowColors.GradEmerald) {
                        Column {
                            Text("Total dibayar", style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.8f))
                            AnimatedAmount(lunas, MaterialTheme.typography.headlineMedium, Color.White)
                            Text("${invoices.size} tagihan", style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.8f))
                        }
                    }
                }
            }
            when {
                memuat && invoices.isEmpty() -> item { SkeletonList(rows = 5) }
                invoices.isEmpty() -> item {
                    EmptyView(
                        "Belum ada tagihan",
                        "Tagihan muncul setelah kamu berlangganan paket Pro atau Enterprise.",
                        Icons.AutoMirrored.Rounded.ReceiptLong,
                        actionLabel = "Lihat paket",
                        onAction = { viewModel.navigate(Screen.SubscriptionPlans) }
                    )
                }
                else -> itemsIndexed(invoices, key = { i, inv -> inv.id.ifBlank { "$i" } }) { i, inv ->
                    val (label, warna) = when (inv.status.lowercase()) {
                        "paid", "success" -> "Lunas" to BizgrowColors.Success
                        "unpaid", "pending" -> "Menunggu" to BizgrowColors.Warning
                        else -> "Batal" to BizgrowColors.Danger
                    }
                    BizSurface(Modifier.fillMaxWidth().padding(vertical = 5.dp).enterAnimation(i), contentPadding = PaddingValues(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            IconBadge(Icons.AutoMirrored.Rounded.ReceiptLong, warna)
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(inv.invoiceNumber.ifBlank { inv.id }, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface)
                                Text(inv.description.ifBlank { inv.issuedAt.take(10) }, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(inv.amount.rupiah(), style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface)
                                Spacer(Modifier.height(4.dp))
                                StatusChip(label, warna)
                            }
                        }
                    }
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Pemakaian & kuota paket
// ═══════════════════════════════════════════════════════════════════════════

@Composable
fun UsageMetricsScreen(viewModel: AppViewModel) {
    val state by viewModel.subscriptionState.collectAsState(initial = viewModel.subscriptionState.value)
    val units by viewModel.units.collectAsState(initial = viewModel.units.value)
    LaunchedEffect(Unit) { viewModel.loadUsageMetrics() }
    val m = state.usageMetrics
    val paket = labelPaket(viewModel.currentUser?.role)

    BizScreen("Pemakaian & kuota", subtitle = "Paket $paket", onBack = { viewModel.navigateBack() }) { padding ->
        LazyColumn(
            Modifier.fillMaxSize().padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                GradientCard(Modifier.fillMaxWidth()) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("Paket aktif", style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.8f))
                            Text(paket, style = MaterialTheme.typography.headlineMedium, color = Color.White)
                            Text("Pantau batas paket agar bisnis tetap lancar", style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.8f))
                        }
                        Icon(Icons.Rounded.WorkspacePremium, null, tint = Color(0xFFFDE68A), modifier = Modifier.size(44.dp))
                    }
                }
            }
            val batasUnit = m?.limits?.maxBusinessUnits ?: 0 // batas dari server (billing), bukan angka bawaan app
            if (batasUnit > 0) item { KuotaBar("Unit bisnis", units.size.toDouble(), batasUnit.toDouble(), Icons.Rounded.Business, BizgrowColors.Primary, 0) }
            if (m != null) {
                item { KuotaBar("Produk", m.productCount.toDouble(), m.maxProducts.toDouble(), Icons.Rounded.Inventory2, BizgrowColors.Warning, 1) }
                item { KuotaBar("Pengguna", m.userCount.toDouble(), m.maxUsers.toDouble(), Icons.Rounded.Group, BizgrowColors.Info, 2) }
                item {
                    KuotaBar(
                        "Penyimpanan", m.storageUsedMb.toDouble() / 1024.0, m.maxStorageMb.toDouble() / 1024.0,
                        Icons.Rounded.Storage, BizgrowColors.Violet, 3, satuan = "GB"
                    )
                }
            } else {
                item { SkeletonList(rows = 3) }
            }
            if (paket == "Gratis") {
                item {
                    BizButton("Upgrade paket", { viewModel.navigate(Screen.SubscriptionPlans) }, icon = Icons.Rounded.RocketLaunch, modifier = Modifier.fillMaxWidth())
                }
            }
        }
    }
}

@Composable
private fun KuotaBar(label: String, pakai: Double, batas: Double, icon: ImageVector, tint: Color, index: Int, satuan: String = "") {
    val tanpaBatas = batas <= 0 || batas >= 999
    val rasio = if (tanpaBatas) 0f else (pakai / batas).toFloat().coerceIn(0f, 1f)
    val anim by animateFloatAsState(rasio, BizMotion.slow(), label = "kuota")
    val warna = when {
        rasio >= 0.9f -> BizgrowColors.Danger
        rasio >= 0.75f -> BizgrowColors.Warning
        else -> tint
    }
    fun f(v: Double) = if (satuan.isEmpty()) v.toLong().toString() else "${(v * 100).toLong() / 100.0} $satuan"
    BizSurface(Modifier.fillMaxWidth().enterAnimation(index)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconBadge(icon, tint, size = 38.dp, iconSize = 19.dp)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(label, style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface)
                Text(
                    if (tanpaBatas) "${f(pakai)} • tanpa batas" else "${f(pakai)} dari ${f(batas)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            if (!tanpaBatas) Text("${(rasio * 100).toInt()}%", style = MaterialTheme.typography.titleSmall, color = warna)
        }
        if (!tanpaBatas) {
            Spacer(Modifier.height(10.dp))
            Box(Modifier.fillMaxWidth().height(8.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surfaceVariant)) {
                Box(Modifier.fillMaxHeight().fillMaxWidth(anim).clip(CircleShape).background(warna))
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Sinkronisasi offline
// ═══════════════════════════════════════════════════════════════════════════

@Composable
fun SyncStatusScreen(viewModel: AppViewModel) {
    val jumlah by viewModel.antreanOfflineCount.collectAsState(initial = viewModel.antreanOfflineCount.value)
    var versi by remember { mutableStateOf(0) }
    val antrean = remember(jumlah, versi) { viewModel.daftarAntreanOffline() }
    val gagal = remember(jumlah, versi) { viewModel.daftarAntreanGagal() }

    BizScreen("Sinkronisasi", subtitle = "Data yang dicatat saat offline", onBack = { viewModel.navigateBack() }) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                GradientCard(Modifier.fillMaxWidth(), colors = if (jumlah == 0) BizgrowColors.GradEmerald else BizgrowColors.GradWarning) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(if (jumlah == 0) Icons.Rounded.CloudDone else Icons.Rounded.CloudUpload, null, tint = Color.White, modifier = Modifier.size(40.dp))
                        Spacer(Modifier.width(14.dp))
                        Column(Modifier.weight(1f)) {
                            Text(if (jumlah == 0) "Semua tersinkron" else "$jumlah data menunggu", style = MaterialTheme.typography.titleLarge, color = Color.White)
                            Text(
                                if (jumlah == 0) "Tidak ada data yang tertunda." else "Dikirim otomatis saat internet kembali. Tidak akan tercatat dua kali.",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.White.copy(alpha = 0.85f)
                            )
                        }
                    }
                }
            }
            if (jumlah > 0) {
                item {
                    BizButton("Kirim sekarang", { viewModel.sinkronkanOffline(); versi++ }, icon = Icons.Rounded.Sync, modifier = Modifier.fillMaxWidth())
                }
                item { SectionTitle("Menunggu dikirim", subtitle = "Urutan sesuai waktu dicatat") }
                itemsIndexed(antrean, key = { _, it -> it.id }) { i, it ->
                    BizSurface(Modifier.fillMaxWidth().enterAnimation(i), contentPadding = PaddingValues(horizontal = 10.dp, vertical = 2.dp)) {
                        ListRow(
                            title = labelEntitas(it.entityType),
                            subtitle = "${it.method} • ${it.enqueuedAt.take(16).replace('T', ' ')}",
                            icon = Icons.Rounded.Schedule,
                            tint = BizgrowColors.Warning
                        )
                    }
                }
            }
            if (gagal.isNotEmpty()) {
                item {
                    SectionTitle("Ditolak server", subtitle = "Data tidak valid, tidak dikirim ulang", actionLabel = "Hapus", onAction = { viewModel.hapusAntreanGagal(); versi++ })
                }
                itemsIndexed(gagal, key = { _, it -> "g-${it.id}" }) { i, it ->
                    BizSurface(Modifier.fillMaxWidth().enterAnimation(i), contentPadding = PaddingValues(horizontal = 10.dp, vertical = 2.dp)) {
                        ListRow(
                            title = labelEntitas(it.entityType),
                            subtitle = it.lastError ?: "Ditolak",
                            icon = Icons.Rounded.ErrorOutline,
                            tint = BizgrowColors.Danger
                        )
                    }
                }
            }
        }
    }
}

private fun labelEntitas(e: String) = when (e.lowercase()) {
    "transaction" -> "Transaksi keuangan"
    "pos", "order" -> "Penjualan kasir"
    "product" -> "Produk"
    "contact" -> "Kontak"
    else -> e.ifBlank { "Data" }.replaceFirstChar { it.uppercase() }
}
