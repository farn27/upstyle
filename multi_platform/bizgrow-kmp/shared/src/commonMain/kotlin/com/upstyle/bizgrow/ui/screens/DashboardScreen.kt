package com.upstyle.bizgrow.ui.screens

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.TrendingDown
import androidx.compose.material.icons.automirrored.rounded.TrendingUp
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.data.FinanceData
import com.upstyle.bizgrow.data.LowStockProduct
import com.upstyle.bizgrow.data.Transaction
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizMotion
import com.upstyle.bizgrow.ui.theme.BizgrowColors
import kotlinx.datetime.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(viewModel: AppViewModel) {
    val activeUnit by viewModel.activeUnit.collectAsState(initial = viewModel.activeUnit.value)
    val financeData by viewModel.financeData.collectAsState(initial = viewModel.financeData.value)
    val lowStock by viewModel.lowStockProducts.collectAsState(initial = viewModel.lowStockProducts.value)
    val unread by viewModel.unreadCount.collectAsState(initial = viewModel.unreadCount.value)
    val dashState by viewModel.dashboardState.collectAsState(initial = viewModel.dashboardState.value)
    var sembunyi by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { viewModel.refreshAll() }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = { BottomNavBar(viewModel, Screen.Dashboard) },
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = dashState.isLoading,
            onRefresh = { viewModel.refreshAll() },
            modifier = Modifier.fillMaxSize().padding(bottom = padding.calculateBottomPadding())
        ) {
            LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 24.dp)) {
                item {
                    DashboardHeader(
                        unitName = activeUnit?.name ?: "Pilih bisnis",
                        kategori = kategoriDari(activeUnit?.type).label,
                        unread = unread,
                        onSwitchUnit = { viewModel.navigateToRoot(Screen.Home) },
                        onNotif = { viewModel.navigate(Screen.Notifications) }
                    )
                }
                item {
                    HeroSaldo(financeData, sembunyi, { sembunyi = !sembunyi }, Modifier.padding(horizontal = 20.dp).enterAnimation(0)) {
                        viewModel.navigate(Screen.Laporan)
                    }
                }
                item {
                    Pintasan(viewModel, Modifier.padding(top = 18.dp).enterAnimation(1))
                }
                item {
                    PerluPerhatian(financeData, lowStock, viewModel, Modifier.enterAnimation(2))
                }
                item {
                    ArusKasCard(financeData, sembunyi, Modifier.padding(horizontal = 20.dp, vertical = 8.dp).enterAnimation(3))
                }
                val bank = financeData?.bankBalances.orEmpty()
                if (bank.isNotEmpty()) {
                    item {
                        SectionTitle("Saldo kas & bank", Modifier.padding(start = 20.dp, end = 12.dp, top = 14.dp, bottom = 8.dp))
                        LazyRow(contentPadding = PaddingValues(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            itemsIndexed(bank) { i, b ->
                                BizSurface(Modifier.width(170.dp).enterAnimation(i), contentPadding = PaddingValues(14.dp)) {
                                    IconBadge(
                                        if (b.nama.contains("bank", true) || b.nama.contains("transfer", true)) Icons.Rounded.AccountBalance else Icons.Rounded.Payments,
                                        BizgrowColors.ModuleColors[i % BizgrowColors.ModuleColors.size], size = 34.dp, iconSize = 18.dp
                                    )
                                    Spacer(Modifier.height(10.dp))
                                    Text(b.nama, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    Text(if (sembunyi) "Rp ••••" else b.saldo.rupiahRingkas(), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                                }
                            }
                        }
                    }
                }
                financeData?.let { fd ->
                    item { InsightBisnis(fd, Modifier.padding(horizontal = 20.dp, vertical = 8.dp)) }
                }
                item {
                    SectionTitle(
                        "Transaksi terbaru",
                        Modifier.padding(start = 20.dp, end = 12.dp, top = 14.dp, bottom = 4.dp),
                        actionLabel = "Lihat semua",
                        onAction = { viewModel.navigate(Screen.Finance) }
                    )
                }
                val trx = financeData?.transactions.orEmpty().take(6)
                when {
                    dashState.isLoading && financeData == null -> item { SkeletonList(rows = 4) }
                    trx.isEmpty() -> item {
                        EmptyView(
                            "Belum ada transaksi",
                            "Catat penjualan atau pengeluaran pertamamu.",
                            Icons.Rounded.ReceiptLong,
                            actionLabel = "Catat transaksi",
                            onAction = { viewModel.navigate(Screen.TransactionEntry) }
                        )
                    }
                    else -> itemsIndexed(trx, key = { _, t -> t.id }) { i, t ->
                        TransaksiRow(t, sembunyi, Modifier.padding(horizontal = 16.dp).enterAnimation(i))
                    }
                }
            }
        }
    }
}

@Composable
private fun DashboardHeader(unitName: String, kategori: String, unread: Int, onSwitchUnit: () -> Unit, onNotif: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().statusBarsPadding().padding(start = 20.dp, end = 20.dp, top = 12.dp, bottom = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(
            Modifier.weight(1f).clip(RoundedCornerShape(12.dp)).pressClick(pressedScale = 0.98f, onClick = onSwitchUnit).padding(vertical = 2.dp)
        ) {
            Text("${sapaanWaktu()} 👋", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(unitName, style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.onBackground, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false))
                Icon(Icons.Rounded.ExpandMore, "Ganti bisnis", tint = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text(kategori, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
        }
        BizIconButton(Icons.Rounded.NotificationsNone, "Notifikasi", badge = unread, onClick = onNotif)
    }
}

@Composable
private fun HeroSaldo(fd: FinanceData?, sembunyi: Boolean, onToggle: () -> Unit, modifier: Modifier, onClick: () -> Unit) {
    val masuk = fd?.summary?.totalMasuk ?: 0.0
    val keluar = fd?.summary?.totalKeluar ?: 0.0
    val bersih = masuk - keluar
    val margin = fd?.biMetrics?.margin ?: 0.0
    GradientCard(modifier.fillMaxWidth(), colors = BizgrowColors.GradPrimary, onClick = onClick) {
        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Laba bersih", style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.8f))
                Spacer(Modifier.width(6.dp))
                Icon(
                    if (sembunyi) Icons.Rounded.VisibilityOff else Icons.Rounded.Visibility,
                    "Sembunyikan angka",
                    tint = Color.White.copy(alpha = 0.8f),
                    modifier = Modifier.size(18.dp).clip(CircleShape).pressClick(onClick = onToggle)
                )
                Spacer(Modifier.weight(1f))
                if (margin != 0.0) {
                    Row(
                        Modifier.clip(RoundedCornerShape(50)).background(Color.White.copy(alpha = 0.18f)).padding(horizontal = 9.dp, vertical = 3.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(if (margin >= 0) Icons.AutoMirrored.Rounded.TrendingUp else Icons.AutoMirrored.Rounded.TrendingDown, null, tint = Color.White, modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Margin ${(margin * 10).toLong() / 10.0}%", style = MaterialTheme.typography.labelSmall, color = Color.White)
                    }
                }
            }
            Spacer(Modifier.height(6.dp))
            Crossfade(sembunyi, label = "saldo") { hide ->
                if (hide) Text("Rp ••••••••", style = MaterialTheme.typography.displayMedium, color = Color.White)
                else AnimatedAmount(bersih, MaterialTheme.typography.displayMedium, Color.White)
            }
            Spacer(Modifier.height(18.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                ArusMini("Pemasukan", masuk, Icons.Rounded.SouthWest, sembunyi, Modifier.weight(1f))
                ArusMini("Pengeluaran", keluar, Icons.Rounded.NorthEast, sembunyi, Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun ArusMini(label: String, nilai: Double, icon: ImageVector, sembunyi: Boolean, modifier: Modifier) {
    Row(
        modifier.clip(RoundedCornerShape(16.dp)).background(Color.White.copy(alpha = 0.14f)).padding(10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(Modifier.size(30.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.2f)), contentAlignment = Alignment.Center) {
            Icon(icon, null, tint = Color.White, modifier = Modifier.size(16.dp))
        }
        Spacer(Modifier.width(8.dp))
        Column {
            Text(label, style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.8f))
            Text(if (sembunyi) "••••" else nilai.rupiahRingkas(), style = MaterialTheme.typography.titleSmall, color = Color.White, maxLines = 1)
        }
    }
}

@Composable
private fun Pintasan(viewModel: AppViewModel, modifier: Modifier) {
    val items = listOf(
        Triple("Kasir", Icons.Rounded.PointOfSale, BizgrowColors.Success) to Screen.Pos,
        Triple("Catat", Icons.Rounded.EditNote, BizgrowColors.Primary) to Screen.TransactionEntry,
        Triple("Produk", Icons.Rounded.Inventory2, BizgrowColors.Warning) to Screen.Products,
        Triple("Laporan", Icons.Rounded.Assessment, BizgrowColors.Info) to Screen.Laporan,
        Triple("Piutang", Icons.Rounded.RequestQuote, BizgrowColors.Violet) to Screen.Piutang,
        Triple("Pelanggan", Icons.Rounded.Groups, Color(0xFFEC4899)) to Screen.CrmContacts,
        Triple("Karyawan", Icons.Rounded.Badge, Color(0xFF14B8A6)) to Screen.Hr,
        Triple("Semua", Icons.Rounded.GridView, Color(0xFF64748B)) to Screen.Modules,
    )
    Column(modifier.padding(horizontal = 14.dp)) {
        items.chunked(4).forEach { baris ->
            Row(Modifier.fillMaxWidth()) {
                baris.forEach { (meta, target) ->
                    ModuleTile(meta.first, meta.second, meta.third, Modifier.weight(1f)) {
                        if (target is Screen.Modules) viewModel.navigate(Screen.Modules) else viewModel.navigate(target)
                    }
                }
            }
        }
    }
}

@Composable
private fun PerluPerhatian(fd: FinanceData?, lowStock: List<LowStockProduct>, viewModel: AppViewModel, modifier: Modifier) {
    data class Peringatan(val judul: String, val sub: String, val icon: ImageVector, val warna: Color, val target: Screen)
    val list = buildList {
        val ar = fd?.alerts?.receivables ?: 0
        val ap = fd?.alerts?.payables ?: 0
        if (ar > 0) add(Peringatan("$ar invoice", "Piutang jatuh tempo", Icons.Rounded.RequestQuote, BizgrowColors.Warning, Screen.Piutang))
        if (ap > 0) add(Peringatan("$ap tagihan", "Hutang belum dibayar", Icons.Rounded.Payments, BizgrowColors.Danger, Screen.Hutang))
        if (lowStock.isNotEmpty()) add(Peringatan("${lowStock.size} produk", "Stok hampir habis", Icons.Rounded.Inventory2, BizgrowColors.Violet, Screen.Products))
    }
    if (list.isEmpty()) return
    Column(modifier) {
        SectionTitle("Perlu perhatian", Modifier.padding(start = 20.dp, end = 20.dp, top = 14.dp, bottom = 8.dp))
        LazyRow(contentPadding = PaddingValues(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            items(list) { p ->
                Row(
                    Modifier
                        .clip(RoundedCornerShape(18.dp))
                        .background(p.warna.copy(alpha = 0.12f))
                        .pressClick { viewModel.navigate(p.target) }
                        .padding(horizontal = 14.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(p.icon, null, tint = p.warna, modifier = Modifier.size(22.dp))
                    Spacer(Modifier.width(10.dp))
                    Column {
                        Text(p.judul, style = MaterialTheme.typography.titleSmall, color = p.warna, fontWeight = FontWeight.Bold)
                        Text(p.sub, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Spacer(Modifier.width(6.dp))
                    Icon(Icons.Rounded.ChevronRight, null, tint = p.warna, modifier = Modifier.size(18.dp))
                }
            }
        }
    }
}

/** Ambil tanggal (YYYY-MM-DD) dari teks MySQL "YYYY-MM-DD HH:MM:SS" / ISO, atau epoch millis. */
internal fun tanggalTransaksi(raw: String): LocalDate? {
    val s = raw.trim()
    if (s.length >= 10 && s[4] == '-' && s[7] == '-') return runCatching { LocalDate.parse(s.substring(0, 10)) }.getOrNull()
    val ms = s.toLongOrNull() ?: return null
    return Instant.fromEpochMilliseconds(ms).toLocalDateTime(TimeZone.currentSystemDefault()).date
}

@Composable
private fun ArusKasCard(fd: FinanceData?, sembunyi: Boolean, modifier: Modifier) {
    val hariIni = remember { Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).date }
    val hari = remember(hariIni) { (6 downTo 0).map { hariIni.minus(it, DateTimeUnit.DAY) } }
    val data = remember(fd) {
        val per = fd?.transactions.orEmpty().groupBy { tanggalTransaksi(it.tanggal) }
        hari.map { d ->
            val list = per[d].orEmpty()
            val masuk = list.filter { it.kategoriTrx.uppercase() in setOf("MASUK", "PEMASUKAN") }.sumOf { it.nominal }
            val keluar = list.filter { it.kategoriTrx.uppercase() in setOf("KELUAR", "PENGELUARAN") }.sumOf { it.nominal }
            masuk to keluar
        }
    }
    val maks = (data.maxOfOrNull { maxOf(it.first, it.second) } ?: 0.0).takeIf { it > 0 } ?: 1.0
    val tumbuh = remember { Animatable(0f) }
    LaunchedEffect(fd) { tumbuh.snapTo(0f); tumbuh.animateTo(1f, tween(800, easing = BizMotion.Emphasized)) }
    val warnaMasuk = BizgrowColors.Success
    val warnaKeluar = BizgrowColors.Danger.copy(alpha = 0.85f)
    val grid = MaterialTheme.colorScheme.outlineVariant

    BizSurface(modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Arus kas", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                Text("7 hari terakhir", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Legenda("Masuk", warnaMasuk)
            Spacer(Modifier.width(10.dp))
            Legenda("Keluar", warnaKeluar)
        }
        Spacer(Modifier.height(16.dp))
        Canvas(Modifier.fillMaxWidth().height(130.dp)) {
            val n = data.size
            val slot = size.width / n
            val batang = (slot * 0.26f).coerceAtMost(14.dp.toPx())
            for (g in 1..3) {
                val y = size.height * g / 4f
                drawLine(grid, Offset(0f, y), Offset(size.width, y), strokeWidth = 1f)
            }
            data.forEachIndexed { i, (m, k) ->
                val cx = slot * i + slot / 2
                val hm = (m / maks).toFloat() * size.height * 0.95f * tumbuh.value
                val hk = (k / maks).toFloat() * size.height * 0.95f * tumbuh.value
                val r = CornerRadius(batang / 2, batang / 2)
                drawRoundRect(warnaMasuk, Offset(cx - batang - 2f, size.height - hm), Size(batang, hm), r)
                drawRoundRect(warnaKeluar, Offset(cx + 2f, size.height - hk), Size(batang, hk), r)
            }
        }
        Spacer(Modifier.height(8.dp))
        Row(Modifier.fillMaxWidth()) {
            hari.forEach { d ->
                Text(
                    namaHariPendek(d.dayOfWeek),
                    Modifier.weight(1f),
                    style = MaterialTheme.typography.labelSmall,
                    color = if (d == hariIni) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
            }
        }
        val totalMasuk = data.sumOf { it.first }
        val totalKeluar = data.sumOf { it.second }
        HorizontalDivider(Modifier.padding(vertical = 12.dp), color = MaterialTheme.colorScheme.outlineVariant)
        Row {
            Column(Modifier.weight(1f)) {
                Text("Total masuk", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(if (sembunyi) "••••" else totalMasuk.rupiahRingkas(), style = MaterialTheme.typography.titleSmall, color = BizgrowColors.Success)
            }
            Column(Modifier.weight(1f)) {
                Text("Total keluar", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(if (sembunyi) "••••" else totalKeluar.rupiahRingkas(), style = MaterialTheme.typography.titleSmall, color = BizgrowColors.Danger)
            }
            Column(Modifier.weight(1f)) {
                Text("Selisih", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(if (sembunyi) "••••" else (totalMasuk - totalKeluar).rupiahRingkas(), style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface)
            }
        }
    }
}

private fun namaHariPendek(d: DayOfWeek) = when (d) {
    DayOfWeek.MONDAY -> "Sen"; DayOfWeek.TUESDAY -> "Sel"; DayOfWeek.WEDNESDAY -> "Rab"
    DayOfWeek.THURSDAY -> "Kam"; DayOfWeek.FRIDAY -> "Jum"; DayOfWeek.SATURDAY -> "Sab"
    else -> "Min"
}

@Composable
private fun Legenda(label: String, warna: Color) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(8.dp).clip(CircleShape).background(warna))
        Spacer(Modifier.width(4.dp))
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun InsightBisnis(fd: FinanceData, modifier: Modifier) {
    val bi = fd.biMetrics
    val (outlookLabel, outlookWarna) = when (bi.outlook.uppercase()) {
        "POSITIVE", "STRONG", "GOOD" -> "Positif" to BizgrowColors.Success
        "NEGATIVE", "WEAK", "POOR" -> "Waspada" to BizgrowColors.Danger
        else -> "Stabil" to BizgrowColors.Warning
    }
    Column(modifier) {
        SectionTitle("Insight bisnis", Modifier.padding(top = 6.dp, bottom = 8.dp), subtitle = "Dihitung otomatis dari transaksimu")
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            StatTile("Efisiensi", "${(bi.efficiency * 10).toLong() / 10.0}%", Icons.Rounded.Speed, BizgrowColors.Info, Modifier.weight(1f))
            StatTile("Ketahanan kas", if (bi.cashRunway > 0) "${bi.cashRunway.toInt()} bln" else "-", Icons.Rounded.HourglassBottom, BizgrowColors.Violet, Modifier.weight(1f))
            StatTile("Prospek", outlookLabel, Icons.Rounded.Insights, outlookWarna, Modifier.weight(1f))
        }
    }
}

@Composable
private fun TransaksiRow(t: Transaction, sembunyi: Boolean, modifier: Modifier) {
    val masuk = t.kategoriTrx.uppercase() in setOf("MASUK", "PEMASUKAN")
    val warna = if (masuk) BizgrowColors.Success else BizgrowColors.Danger
    val tgl = tanggalTransaksi(t.tanggal)
    ListRow(
        title = t.keterangan.ifBlank { if (masuk) "Pemasukan" else "Pengeluaran" },
        subtitle = listOfNotNull(tgl?.let { "${it.dayOfMonth} ${namaBulanPendek(it.monthNumber)}" }, t.metodeBayar.takeIf { it.isNotBlank() && it.toIntOrNull() == null }).joinToString(" • "),
        icon = if (masuk) Icons.Rounded.SouthWest else Icons.Rounded.NorthEast,
        tint = warna,
        modifier = modifier,
        trailing = {
            Text(
                if (sembunyi) "••••" else (if (masuk) "+" else "-") + t.nominal.rupiahRingkas().removePrefix("-"),
                style = MaterialTheme.typography.titleSmall,
                color = warna
            )
        }
    )
}

internal fun namaBulanPendek(m: Int) = listOf("Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des").getOrElse(m - 1) { "" }

/** Format Rupiah penuh (dipakai banyak layar lama). */
fun formatCurrency(amount: Double): String = amount.rupiah()
