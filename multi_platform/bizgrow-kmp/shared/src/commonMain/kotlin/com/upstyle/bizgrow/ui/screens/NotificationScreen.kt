package com.upstyle.bizgrow.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.data.RiwayatAksi
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors
import com.upstyle.bizgrow.ui.theme.LocalBizPalette
import kotlinx.datetime.*

/** Tujuan saat notifikasi diketuk — dari field link (mis. "/finance/x/piutang") atau kategori. */
private fun tujuanNotif(n: RiwayatAksi): Screen? {
    val t = "${n.link.orEmpty()} ${n.kategori}".lowercase()
    return when {
        "piutang" in t -> Screen.Piutang
        "hutang" in t || "tagihan" in t -> Screen.Hutang
        "pengadaan" in t || "purchase" in t || "supplier" in t -> Screen.Scm
        "produk" in t || "product" in t || "stok" in t -> Screen.Products
        "pos" in t || "kasir" in t -> Screen.Pos
        "crm" in t || "pelanggan" in t -> Screen.Crm
        "hr" in t || "karyawan" in t || "absensi" in t || "payroll" in t -> Screen.Hr
        "order" in t || "pesanan" in t -> Screen.Orders
        "billing" in t || "langganan" in t -> Screen.SubscriptionPlans
        "finance" in t || "keuangan" in t || "transaksi" in t || "history" in t -> Screen.Finance
        else -> null
    }
}

private fun gayaNotif(n: RiwayatAksi): Pair<ImageVector, Color> {
    val k = "${n.kategori} ${n.link.orEmpty()}".lowercase()
    val ikon = when {
        "pos" in k || "kasir" in k -> Icons.Rounded.PointOfSale
        "produk" in k || "stok" in k -> Icons.Rounded.Inventory2
        "pengadaan" in k -> Icons.Rounded.LocalShipping
        "crm" in k -> Icons.Rounded.Groups
        "hr" in k || "karyawan" in k -> Icons.Rounded.Badge
        "billing" in k -> Icons.Rounded.WorkspacePremium
        "keuangan" in k || "finance" in k || "piutang" in k || "hutang" in k -> Icons.Rounded.AccountBalanceWallet
        else -> Icons.Rounded.Notifications
    }
    val warna = when (n.tipe.lowercase()) {
        "success" -> BizgrowColors.Success
        "error" -> BizgrowColors.Danger
        "warning" -> BizgrowColors.Warning
        else -> BizgrowColors.Primary
    }
    return ikon to warna
}

private fun waktuNotif(raw: String): Pair<LocalDate?, String> {
    val s = raw.trim()
    if (s.length >= 16 && s[4] == '-' && s[7] == '-') {
        val tgl = runCatching { LocalDate.parse(s.substring(0, 10)) }.getOrNull()
        return tgl to s.substring(11, 16)
    }
    val ms = s.toLongOrNull() ?: return null to ""
    val dt = Instant.fromEpochMilliseconds(ms).toLocalDateTime(TimeZone.currentSystemDefault())
    return dt.date to "${dt.hour.toString().padStart(2, '0')}:${dt.minute.toString().padStart(2, '0')}"
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationScreen(viewModel: AppViewModel) {
    val semua by viewModel.notifications.collectAsState()
    val uiState by viewModel.uiState.collectAsState(initial = viewModel.uiState.value)
    var kategori by remember { mutableStateOf<String?>(null) }
    var hanyaBelumDibaca by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { viewModel.loadNotifications() }

    val kategoriList = remember(semua) { semua.map { it.kategori }.filter { it.isNotBlank() }.distinct().sorted() }
    val belumDibaca = semua.count { it.isRead == 0 }
    val hariIni = remember { Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).date }
    val tampil = remember(semua, kategori, hanyaBelumDibaca) {
        semua.filter { (kategori == null || it.kategori.equals(kategori, true)) && (!hanyaBelumDibaca || it.isRead == 0) }
    }
    val grup = remember(tampil, hariIni) {
        tampil.groupBy {
            val d = waktuNotif(it.waktu).first
            when {
                d == null -> "Lainnya"
                d == hariIni -> "Hari ini"
                d == hariIni.minus(1, DateTimeUnit.DAY) -> "Kemarin"
                d >= hariIni.minus(7, DateTimeUnit.DAY) -> "Minggu ini"
                else -> "Lebih lama"
            }
        }
    }

    BizScreen(
        title = "Notifikasi",
        subtitle = if (belumDibaca > 0) "$belumDibaca belum dibaca" else "Semua sudah dibaca",
        onBack = { viewModel.navigateBack() },
        actions = {
            AnimatedVisibility(belumDibaca > 0, enter = fadeIn(), exit = fadeOut()) {
                TextButton(onClick = { viewModel.markAllNotificationsRead() }) {
                    Icon(Icons.Rounded.DoneAll, null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Tandai dibaca")
                }
            }
        }
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = uiState.isLoading,
            onRefresh = { viewModel.loadNotifications() },
            modifier = Modifier.fillMaxSize().padding(padding)
        ) {
            LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 32.dp)) {
                item {
                    LazyRow(contentPadding = PaddingValues(horizontal = 20.dp, vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        item { FilterPill("Semua", kategori == null && !hanyaBelumDibaca, { kategori = null; hanyaBelumDibaca = false }) }
                        item { FilterPill("Belum dibaca", hanyaBelumDibaca, { hanyaBelumDibaca = !hanyaBelumDibaca }) }
                        items(kategoriList) { k -> FilterPill(k, kategori == k, { kategori = if (kategori == k) null else k }) }
                    }
                }
                if (tampil.isEmpty()) {
                    item {
                        EmptyView(
                            if (hanyaBelumDibaca) "Tidak ada yang belum dibaca" else "Belum ada notifikasi",
                            "Aktivitas penting bisnismu akan muncul di sini.",
                            Icons.Rounded.NotificationsNone
                        )
                    }
                }
                listOf("Hari ini", "Kemarin", "Minggu ini", "Lebih lama", "Lainnya").forEach { judul ->
                    val isi = grup[judul].orEmpty()
                    if (isi.isNotEmpty()) {
                        item(key = "h-$judul") {
                            Text(
                                judul,
                                style = MaterialTheme.typography.labelLarge,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(start = 24.dp, top = 14.dp, bottom = 4.dp)
                            )
                        }
                        itemsIndexed(isi, key = { _, n -> n.id }) { i, n ->
                            NotifRow(n, Modifier.padding(horizontal = 14.dp).animateItem().enterAnimation(i)) {
                                if (n.isRead == 0) viewModel.markNotifRead(n.id)
                                tujuanNotif(n)?.let { viewModel.navigate(it) }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun NotifRow(n: RiwayatAksi, modifier: Modifier, onClick: () -> Unit) {
    val (ikon, warna) = gayaNotif(n)
    val baru = n.isRead == 0
    Row(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(if (baru) MaterialTheme.colorScheme.primary.copy(alpha = if (LocalBizPalette.current.isDark) 0.10f else 0.05f) else Color.Transparent)
            .pressClick(pressedScale = 0.98f, onClick = onClick)
            .padding(12.dp),
        verticalAlignment = Alignment.Top
    ) {
        IconBadge(ikon, warna, size = 42.dp, iconSize = 20.dp)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(
                n.pesan,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = if (baru) FontWeight.SemiBold else FontWeight.Normal,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 3
            )
            Spacer(Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (n.kategori.isNotBlank()) {
                    StatusChip(n.kategori, warna)
                    Spacer(Modifier.width(8.dp))
                }
                Text(waktuNotif(n.waktu).second, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        if (baru) {
            Box(Modifier.padding(top = 6.dp, start = 6.dp).size(8.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary))
        }
    }
}
