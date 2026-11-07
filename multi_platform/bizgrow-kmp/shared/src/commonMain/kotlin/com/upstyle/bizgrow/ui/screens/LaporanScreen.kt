package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.data.*
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors
import kotlinx.datetime.*

private val namaBulanPanjang = listOf("Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember")
private val tabLaporan = listOf("Dashboard Analisis", "Laba Rugi", "Neraca")

/** Pusat Laporan & Analisis — padanan halaman Laporan web (dashboard analisis, laba rugi formal, neraca). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LaporanScreen(viewModel: AppViewModel) {
    val laporan by viewModel.laporanLengkap.collectAsState()
    val memuat by viewModel.laporanMemuat.collectAsState()
    val hariIni = remember { Clock.System.now().toLocalDateTime(TimeZone.of("Asia/Jakarta")).date }
    var tahun by remember { mutableIntStateOf(hariIni.year) }
    var bulan by remember { mutableStateOf("all") }
    var tab by remember { mutableIntStateOf(0) }
    var menuBulan by remember { mutableStateOf(false) }
    var menuTahun by remember { mutableStateOf(false) }

    LaunchedEffect(tahun, bulan) { viewModel.loadLaporanLengkap(tahun, bulan) }

    val labelPeriode = (if (bulan == "all") "Tahunan" else namaBulanPanjang[bulan.toInt() - 1]) + " $tahun"

    BizScreen(
        "Laporan & Analisis", subtitle = "Keuangan pusat • $labelPeriode",
        onBack = { viewModel.navigateBack() },
        actions = {
            BizIconButton(Icons.Rounded.FileDownload, "Ekspor") { viewModel.navigate(Screen.ExportImport) }
            Spacer(Modifier.width(8.dp))
            BizIconButton(Icons.Rounded.Refresh, "Muat ulang") { viewModel.loadLaporanLengkap(tahun, bulan) }
            Spacer(Modifier.width(8.dp))
        }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            // Periode (Bulan + Tahun) — sama dengan filter di web
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(Modifier.weight(1f)) {
                    PilihPeriode("Bulan", if (bulan == "all") "Semua bulan (tahunan)" else namaBulanPanjang[bulan.toInt() - 1]) { menuBulan = true }
                    DropdownMenu(expanded = menuBulan, onDismissRequest = { menuBulan = false }) {
                        DropdownMenuItem(text = { Text("Semua bulan (tahunan)") }, onClick = { bulan = "all"; menuBulan = false })
                        namaBulanPanjang.forEachIndexed { i, n -> DropdownMenuItem(text = { Text(n) }, onClick = { bulan = (i + 1).toString(); menuBulan = false }) }
                    }
                }
                Box(Modifier.width(120.dp)) {
                    PilihPeriode("Tahun", tahun.toString()) { menuTahun = true }
                    DropdownMenu(expanded = menuTahun, onDismissRequest = { menuTahun = false }) {
                        (0..5).map { hariIni.year - it }.forEach { y -> DropdownMenuItem(text = { Text(y.toString()) }, onClick = { tahun = y; menuTahun = false }) }
                    }
                }
            }
            Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                tabLaporan.forEachIndexed { i, t -> FilterPill(t, tab == i, { tab = i }) }
            }

            val data = laporan
            when {
                memuat && data == null -> SkeletonList(rows = 5)
                data == null -> ErrorView("Laporan belum bisa dimuat.", onRetry = { viewModel.loadLaporanLengkap(tahun, bulan) })
                else -> Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp).padding(bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    if (memuat) LinearProgressIndicator(Modifier.fillMaxWidth())
                    when (tab) {
                        0 -> DashboardAnalisis(data.dashboard, tahun)
                        1 -> LabaRugiFormal(data.labaRugi, labelPeriode)
                        else -> NeracaFormal(data.neraca, data.labaRugi.labaBersih)
                    }
                }
            }
        }
    }
}

@Composable
private fun PilihPeriode(label: String, nilai: String, onClick: () -> Unit) {
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(MaterialTheme.colorScheme.surface)
            .then(Modifier.pressClick(pressedScale = 0.98f, onClick = onClick)).padding(horizontal = 14.dp, vertical = 8.dp)
    ) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(nilai, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
            Icon(Icons.Rounded.UnfoldMore, null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Tab 1 — Dashboard Analisis
// ═══════════════════════════════════════════════════════════════════════════

@Composable
private fun DashboardAnalisis(d: LaporanDashboard, tahun: Int) {
    val s = d.summary
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        StatTile("Total pemasukan (gross)", s.totalMasuk.rupiahRingkas(), Icons.Rounded.SouthWest, BizgrowColors.Success, Modifier.weight(1f))
        StatTile("Total pengeluaran", s.totalKeluar.rupiahRingkas(), Icons.Rounded.NorthEast, BizgrowColors.Danger, Modifier.weight(1f))
    }
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        StatTile("Harga pokok (HPP)", s.totalHpp.rupiahRingkas(), Icons.Rounded.Inventory2, BizgrowColors.Warning, Modifier.weight(1f))
        StatTile("Laba kotor transaksi", s.labaKotor.rupiahRingkas(), Icons.Rounded.TrendingUp, BizgrowColors.Primary, Modifier.weight(1f), caption = "${s.jumlahTrx} transaksi")
    }

    // Tren per bulan
    BizSurface(Modifier.fillMaxWidth()) {
        Text("Tren pemasukan & pengeluaran ($tahun)", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(12.dp))
        val maks = (d.arusKas.maxOfOrNull { maxOf(it.masuk, it.keluar) } ?: 0.0).takeIf { it > 0 } ?: 1.0
        val hijau = BizgrowColors.Success
        val merah = BizgrowColors.Danger.copy(alpha = 0.85f)
        Canvas(Modifier.fillMaxWidth().height(120.dp)) {
            val n = d.arusKas.size.coerceAtLeast(1)
            val slot = size.width / n
            val batang = (slot * 0.3f)
            d.arusKas.forEachIndexed { i, b ->
                val cx = slot * i + slot / 2
                val hm = (b.masuk / maks).toFloat() * size.height
                val hk = (b.keluar / maks).toFloat() * size.height
                drawRoundRect(hijau, Offset(cx - batang - 1f, size.height - hm), Size(batang, hm), CornerRadius(4f))
                drawRoundRect(merah, Offset(cx + 1f, size.height - hk), Size(batang, hk), CornerRadius(4f))
            }
        }
        Row(Modifier.fillMaxWidth().padding(top = 4.dp)) {
            listOf("J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D").forEach {
                Text(it, Modifier.weight(1f), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
            }
        }
    }

    // Distribusi metode bayar
    BizSurface(Modifier.fillMaxWidth()) {
        Text("Distribusi metode bayar", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(10.dp))
        val total = d.metodeBayarStats.sumOf { it.total }
        if (total <= 0) Text("Belum ada data", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        d.metodeBayarStats.sortedByDescending { it.total }.forEachIndexed { i, m ->
            val persen = (m.total / total).toFloat()
            val warna = BizgrowColors.ModuleColors[i % BizgrowColors.ModuleColors.size]
            Column(Modifier.padding(vertical = 5.dp)) {
                Row {
                    Text(m.metode.ifBlank { "KAS" }, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                    Text("${m.total.rupiahRingkas()} • ${(persen * 100).toInt()}%", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Spacer(Modifier.height(4.dp))
                Box(Modifier.fillMaxWidth().height(7.dp).clip(CircleShape).background(MaterialTheme.colorScheme.outlineVariant)) {
                    Box(Modifier.fillMaxWidth(persen).fillMaxHeight().clip(CircleShape).background(warna))
                }
            }
        }
    }

    // Produk terlaris
    BizSurface(Modifier.fillMaxWidth()) {
        Text("Produk terlaris (Top 5)", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(6.dp))
        if (d.produkTerlaris.isEmpty()) Text("Belum ada data penjualan produk.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        d.produkTerlaris.forEachIndexed { i, p ->
            Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(26.dp).clip(CircleShape).background(BizgrowColors.Primary.copy(alpha = 0.12f)), contentAlignment = Alignment.Center) {
                    Text("${i + 1}", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = BizgrowColors.Primary)
                }
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text(p.namaProduk ?: p.productId ?: "-", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text("${p.totalQty.toInt()} terjual", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Text(p.totalRevenue.rupiahRingkas(), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = BizgrowColors.Success)
            }
        }
    }

    // Riwayat terbaru
    BizSurface(Modifier.fillMaxWidth()) {
        Text("Riwayat transaksi terbaru", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(4.dp))
        if (d.riwayatTrx.isEmpty()) Text("Belum ada transaksi.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        d.riwayatTrx.forEach { t ->
            val masuk = t.kategoriTrx.uppercase().contains("MASUK")
            val warna = if (masuk) BizgrowColors.Success else BizgrowColors.Danger
            val tgl = t.tanggal?.let { Instant.fromEpochMilliseconds(it).toLocalDateTime(TimeZone.currentSystemDefault()).date }
            ListRow(
                t.keterangan.ifBlank { if (masuk) "Pemasukan" else "Pengeluaran" },
                subtitle = listOfNotNull("TRX-${t.id}", tgl?.let { "${it.dayOfMonth} ${namaBulanPendek(it.monthNumber)} ${it.year}" }).joinToString(" • "),
                icon = if (masuk) Icons.Rounded.SouthWest else Icons.Rounded.NorthEast, tint = warna,
                trailing = { Text((if (masuk) "+" else "-") + t.nominal.rupiahRingkas(), style = MaterialTheme.typography.titleSmall, color = warna) }
            )
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Tab 2 — Laba Rugi (double-entry)
// ═══════════════════════════════════════════════════════════════════════════

@Composable
private fun LabaRugiFormal(l: LaporanLabaRugi, periode: String) {
    BizSurface(Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Laporan Laba Rugi", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(periode, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text("DOUBLE-ENTRY STANDARD", style = MaterialTheme.typography.labelSmall, color = BizgrowColors.Primary, fontWeight = FontWeight.Bold,
                modifier = Modifier.clip(CircleShape).background(BizgrowColors.Primary.copy(alpha = 0.10f)).padding(horizontal = 8.dp, vertical = 3.dp))
        }
        Spacer(Modifier.height(10.dp))
        BlokAkun("Pendapatan usaha", l.pendapatan, l.totalPendapatan, "Total pendapatan", "Tidak ada data pendapatan.")
        BlokAkun("Harga pokok penjualan (HPP)", l.hpp, l.totalHpp, "Total HPP", null)
        BarisTotal("Laba kotor akuntansi", l.labaKotor, BizgrowColors.Info)
        BlokAkun("Beban operasional", l.beban, l.totalBeban, "Total beban operasional", null)
        if (l.pendapatanLainnya.isNotEmpty()) BlokAkun("Pendapatan lainnya", l.pendapatanLainnya, l.totalPendapatanLainnya, "Total pendapatan lainnya", null)
        if (l.bebanLainnya.isNotEmpty()) BlokAkun("Beban lainnya", l.bebanLainnya, l.totalBebanLainnya, "Total beban lainnya", null)
        Spacer(Modifier.height(6.dp))
        BarisTotal("Laba bersih tahun berjalan", l.labaBersih, if (l.labaBersih >= 0) BizgrowColors.Success else BizgrowColors.Danger, besar = true)
    }
}

@Composable
private fun BlokAkun(judul: String, akun: List<AkunSaldo>, total: Double, labelTotal: String, kosong: String?) {
    Text(judul, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.padding(top = 10.dp, bottom = 4.dp))
    if (akun.isEmpty() && kosong != null) Text(kosong, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    akun.forEach { a ->
        Row(Modifier.fillMaxWidth().padding(vertical = 3.dp)) {
            Text("${a.kodeAkun}  ${a.namaAkun}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f), maxLines = 2)
            Text(a.saldo.rupiah(), style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
        }
    }
    HorizontalDivider(Modifier.padding(vertical = 4.dp), color = MaterialTheme.colorScheme.outlineVariant)
    Row(Modifier.fillMaxWidth()) {
        Text(labelTotal, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
        Text(total.rupiah(), style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun BarisTotal(label: String, nilai: Double, warna: Color, besar: Boolean = false) {
    Row(
        Modifier.fillMaxWidth().padding(top = 8.dp).clip(RoundedCornerShape(12.dp)).background(warna.copy(alpha = 0.10f)).padding(horizontal = 12.dp, vertical = if (besar) 12.dp else 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, style = if (besar) MaterialTheme.typography.titleSmall else MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
        Text(nilai.rupiah(), style = if (besar) MaterialTheme.typography.titleMedium else MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = warna)
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Tab 3 — Neraca
// ═══════════════════════════════════════════════════════════════════════════

@Composable
private fun NeracaFormal(n: LaporanNeraca, labaBerjalan: Double) {
    BizSurface(Modifier.fillMaxWidth()) {
        Text("Neraca (Balance Sheet)", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(4.dp))
        Text("ASET", style = MaterialTheme.typography.labelSmall, color = BizgrowColors.Primary, fontWeight = FontWeight.Black, modifier = Modifier.padding(top = 8.dp))
        BlokAkun("Aset lancar", n.asetLancar, n.totalAsetLancar, "Total aset lancar", "Belum ada aset lancar.")
        if (n.asetTetap.isNotEmpty()) BlokAkun("Aset tetap", n.asetTetap, n.totalAsetTetap, "Total aset tetap", null)
        BarisTotal("Total aset", n.totalAset, BizgrowColors.Primary, besar = true)

        Text("LIABILITAS & EKUITAS", style = MaterialTheme.typography.labelSmall, color = BizgrowColors.Violet, fontWeight = FontWeight.Black, modifier = Modifier.padding(top = 18.dp))
        BlokAkun("Liabilitas (hutang)", n.liabilitasLancar + n.liabilitasJangkaPanjang, n.totalLiabilitas, "Total liabilitas", "Tidak ada liabilitas.")
        BlokAkun("Ekuitas modal", n.ekuitas, n.totalEkuitas - labaBerjalan, "Subtotal modal", null)
        Row(Modifier.fillMaxWidth().padding(top = 4.dp)) {
            Text("Laba tahun berjalan", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
            Text(labaBerjalan.rupiah(), style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
        }
        Row(Modifier.fillMaxWidth().padding(top = 4.dp)) {
            Text("Total ekuitas", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            Text(n.totalEkuitas.rupiah(), style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
        }
        val totalLE = n.totalLiabilitas + n.totalEkuitas
        BarisTotal("Total liab. & ekuitas", totalLE, BizgrowColors.Violet, besar = true)
        val seimbang = kotlin.math.abs(n.totalAset - totalLE) < 1.0
        Row(
            Modifier.fillMaxWidth().padding(top = 12.dp).clip(RoundedCornerShape(12.dp))
                .background((if (seimbang) BizgrowColors.Success else BizgrowColors.Warning).copy(alpha = 0.12f)).padding(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(if (seimbang) Icons.Rounded.CheckCircle else Icons.Rounded.WarningAmber, null, tint = if (seimbang) BizgrowColors.Success else BizgrowColors.WarningDark, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text(if (seimbang) "Neraca seimbang (balanced)" else "Neraca belum seimbang — selisih ${kotlin.math.abs(n.totalAset - totalLE).rupiah()}", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
        }
    }
}
