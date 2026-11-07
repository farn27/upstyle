package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.data.FinanceData
import com.upstyle.bizgrow.data.LowStockProduct
import com.upstyle.bizgrow.data.PresetPeriode
import com.upstyle.bizgrow.data.RiwayatAksi
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizMotion
import com.upstyle.bizgrow.ui.theme.BizgrowColors
import kotlinx.datetime.*

// Komponen dashboard unit yang ada di web (finance/[slug]) — Ringkasan Kinerja, Analisis,
// Target Bulan Ini, Risk Assessment, Stok Menipis, Tagihan jatuh tempo, Audit Log.

/** Perhitungan sama dengan halaman web: health score, cost ratio, proyeksi arus kas. */
class MetrikKinerja(fd: FinanceData?, bulanIni: Boolean) {
    val masuk = fd?.summary?.totalMasuk ?: 0.0
    val keluar = fd?.summary?.totalKeluar ?: 0.0
    val hpp = fd?.summary?.totalHpp ?: 0.0
    val selisih = masuk - keluar
    val saldoKas = fd?.summary?.saldoKas ?: selisih
    val persenLaba = if (masuk > 0) selisih / masuk * 100 else 0.0
    private val opex = keluar - hpp
    val healthScore: Int = run {
        var p = 0
        if (persenLaba > 20) p += 40 else if (persenLaba > 0) p += 20
        if (masuk > keluar && masuk > 0) p += 30
        if (hpp > opex) p += 30
        p
    }
    val costRatio: Int = if (keluar > 0) ((keluar - hpp) / (if (masuk == 0.0) 1.0 else masuk) * 100).toInt() else 0
    val proyeksi: Long? = if (!bulanIni) null else {
        val t = Clock.System.now().toLocalDateTime(TimeZone.of("Asia/Jakarta")).date
        val jumlahHari = LocalDate(t.year, t.monthNumber, 1).plus(1, DateTimeUnit.MONTH).minus(1, DateTimeUnit.DAY).dayOfMonth
        Math.round(selisih / t.dayOfMonth * jumlahHari)
    }
    fun analisis(periode: String): String = when {
        masuk == 0.0 -> "Menunggu data operasional periode $periode untuk kalkulasi."
        selisih < 0 -> "DEFISIT ARUS KAS: pengeluaran melebihi pemasukan ${kotlin.math.abs(selisih).rupiah()} pada periode $periode. Pangkas pengeluaran operasional (OPEX) untuk menjaga likuiditas."
        opex > hpp && hpp > 0 -> "EFISIENSI BURUK: Biaya Operasional lebih tinggi dari HPP barang terjual. Evaluasi pengeluaran bulanan."
        else -> "OPTIMAL: Performa efisien dengan Health Score $healthScore/100. Struktur biaya unit terpantau sangat sehat."
    }
}

@Composable
fun PeriodeDashboard(viewModel: AppViewModel, modifier: Modifier = Modifier) {
    val aktif by viewModel.periodeDashboard.collectAsState()
    Row(modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        PresetPeriode.forEach { p -> FilterPill(p, aktif == p, { viewModel.setPeriodeDashboard(p) }) }
    }
}

@Composable
fun RingkasanKinerja(m: MetrikKinerja, sembunyi: Boolean, modifier: Modifier = Modifier) {
    fun f(v: Double) = if (sembunyi) "Rp ••••" else v.rupiahRingkas()
    Column(modifier, verticalArrangement = Arrangement.spacedBy(10.dp)) {
        SectionTitle("Ringkasan kinerja", subtitle = "Periode yang dipilih")
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            StatTile("Saldo kas", f(m.saldoKas), Icons.Rounded.Paid, BizgrowColors.Primary, Modifier.weight(1f), caption = "sepanjang waktu")
            StatTile("Pemasukan", f(m.masuk), Icons.Rounded.SouthWest, BizgrowColors.Success, Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            StatTile("Pengeluaran", f(m.keluar), Icons.Rounded.NorthEast, BizgrowColors.Danger, Modifier.weight(1f))
            StatTile(
                "Arus kas", f(m.selisih), Icons.Rounded.SwapVert,
                if (m.selisih >= 0) BizgrowColors.Success else BizgrowColors.Danger, Modifier.weight(1f),
                caption = "${(m.persenLaba * 10).toLong() / 10.0}% dari pemasukan"
            )
        }
    }
}

@Composable
fun BannerAnalisis(m: MetrikKinerja, periode: String, modifier: Modifier = Modifier) {
    val defisit = m.selisih < 0
    val warna = if (defisit) BizgrowColors.Danger else BizgrowColors.Primary
    Row(
        modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(warna.copy(alpha = 0.09f)).padding(14.dp),
        verticalAlignment = Alignment.Top
    ) {
        AiAvatar(32.dp)
        Spacer(Modifier.width(12.dp))
        Column {
            Text("Analisis bisnis", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = warna)
            Text(m.analisis(periode), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface)
        }
    }
}

@Composable
fun TargetBulanIni(fd: FinanceData?, sembunyi: Boolean, modifier: Modifier = Modifier) {
    val target = fd?.kpi?.target ?: 0.0
    val saat = fd?.kpi?.current ?: 0.0
    val persen = if (target > 0) (saat / target * 100).coerceAtMost(100.0) else 0.0
    val warna = if (persen >= 100) BizgrowColors.Success else BizgrowColors.Primary
    val sudut = remember { androidx.compose.animation.core.Animatable(0f) }
    LaunchedEffect(persen) { sudut.animateTo((persen / 100.0 * 360).toFloat(), androidx.compose.animation.core.tween(900, easing = BizMotion.Emphasized)) }
    val trek = MaterialTheme.colorScheme.outlineVariant
    BizSurface(modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(84.dp), contentAlignment = Alignment.Center) {
                Canvas(Modifier.fillMaxSize()) {
                    drawArc(trek, 0f, 360f, false, style = Stroke(18f))
                    drawArc(warna, -90f, sudut.value, false, style = Stroke(18f, cap = StrokeCap.Round))
                }
                Text("${persen.toInt()}%", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.width(16.dp))
            Column(Modifier.weight(1f)) {
                Text("Target bulan ini", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                Text(
                    if (sembunyi) "Rp •••• / Rp ••••" else "${saat.rupiahRingkas()} / ${target.rupiahRingkas()}",
                    style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface
                )
                Text("estimasi otomatis: modal × 1,5 (min. Rp10 jt)", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
fun RiskAssessment(m: MetrikKinerja, sembunyi: Boolean, modifier: Modifier = Modifier) {
    val sehat = m.healthScore > 70
    Column(
        modifier.fillMaxWidth().clip(RoundedCornerShape(22.dp))
            .background(Brush.linearGradient(listOf(Color(0xFF0F172A), Color(0xFF1E1B4B)))).padding(18.dp)
    ) {
        Text("RISK ASSESSMENT", style = MaterialTheme.typography.labelSmall, color = Color(0xFF94A3B8), fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(10.dp))
        Row(verticalAlignment = Alignment.Bottom) {
            Column(Modifier.weight(1f)) {
                Text("Health Score", style = MaterialTheme.typography.labelSmall, color = Color(0xFF94A3B8))
                Row(verticalAlignment = Alignment.Bottom) {
                    Text("${m.healthScore}", style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Black, color = if (sehat) Color(0xFF34D399) else Color(0xFFFB7185))
                    Text(" / 100", style = MaterialTheme.typography.labelMedium, color = Color(0xFF94A3B8), modifier = Modifier.padding(bottom = 6.dp))
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("Cost Ratio", style = MaterialTheme.typography.labelSmall, color = Color(0xFF94A3B8))
                Text("${m.costRatio}%", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Color(0xFF818CF8))
            }
        }
        Spacer(Modifier.height(10.dp))
        Box(Modifier.fillMaxWidth().height(6.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.1f))) {
            Box(Modifier.fillMaxWidth(m.healthScore / 100f).fillMaxHeight().clip(CircleShape).background(if (sehat) Color(0xFF34D399) else Color(0xFFFB7185)))
        }
        HorizontalDivider(Modifier.padding(vertical = 12.dp), color = Color.White.copy(alpha = 0.08f))
        Text("Projected Cash Flow", style = MaterialTheme.typography.labelSmall, color = Color(0xFF94A3B8))
        val p = m.proyeksi
        Text(
            if (p == null) "— (pilih periode Bulan Ini)" else if (sembunyi) "Rp ••••" else p.toDouble().rupiah(),
            style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold,
            color = if (p == null) Color(0xFF94A3B8) else if (p >= 0) Color(0xFF34D399) else Color(0xFFFB7185)
        )
    }
}

@Composable
fun StokMenipisCard(daftar: List<LowStockProduct>, onBuka: () -> Unit, modifier: Modifier = Modifier) {
    if (daftar.isEmpty()) return
    Column(
        modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(BizgrowColors.Warning.copy(alpha = 0.12f))
            .pressClick(pressedScale = 0.99f, onClick = onBuka).padding(14.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Rounded.ErrorOutline, null, tint = BizgrowColors.WarningDark, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text("Stok menipis (${daftar.size})", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = BizgrowColors.WarningDark, modifier = Modifier.weight(1f))
            Icon(Icons.Rounded.ChevronRight, null, tint = BizgrowColors.WarningDark)
        }
        Spacer(Modifier.height(6.dp))
        daftar.take(5).forEach { p ->
            Row(Modifier.fillMaxWidth().padding(vertical = 2.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(p.nama, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis, color = MaterialTheme.colorScheme.onSurface)
                Text("Sisa ${p.stok}", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = BizgrowColors.WarningDark,
                    modifier = Modifier.clip(RoundedCornerShape(6.dp)).background(BizgrowColors.Warning.copy(alpha = 0.25f)).padding(horizontal = 8.dp, vertical = 2.dp))
            }
        }
        if (daftar.size > 5) Text("+${daftar.size - 5} produk lainnya", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
    }
}

@Composable
fun TagihanJatuhTempo(fd: FinanceData?, viewModel: AppViewModel, modifier: Modifier = Modifier) {
    val ar = fd?.alerts?.receivables ?: 0
    val ap = fd?.alerts?.payables ?: 0
    if (ar == 0 && ap == 0) return
    Column(modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp)).background(BizgrowColors.Danger.copy(alpha = 0.08f)).padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(7.dp).clip(CircleShape).background(BizgrowColors.Danger))
            Spacer(Modifier.width(8.dp))
            Text("Tagihan jatuh tempo!", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = BizgrowColors.DangerDark)
        }
        if (ar > 0) BarisTagihan("$ar piutang pelanggan") { viewModel.navigate(Screen.Piutang) }
        if (ap > 0) BarisTagihan("$ap hutang supplier") { viewModel.navigate(Screen.Hutang) }
    }
}

@Composable
private fun BarisTagihan(teks: String, onTinjau: () -> Unit) {
    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surface).padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(teks, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
        Text("TINJAU", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Black, color = Color.White,
            modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(BizgrowColors.Danger).pressClick(onClick = onTinjau).padding(horizontal = 10.dp, vertical = 5.dp))
    }
}

@Composable
fun AuditLogCard(log: List<RiwayatAksi>, modifier: Modifier = Modifier) {
    BizSurface(modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Rounded.History, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text("Audit log sistem", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
        }
        Spacer(Modifier.height(10.dp))
        if (log.isEmpty()) {
            Text("Sistem belum mencatat aktivitas.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        } else log.take(15).forEachIndexed { i, l ->
            val warna = when (l.tipe.lowercase()) {
                "error" -> BizgrowColors.Danger; "warning" -> BizgrowColors.Warning; "success" -> BizgrowColors.Success; else -> BizgrowColors.Primary
            }
            Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min)) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(14.dp)) {
                    Box(Modifier.padding(top = 5.dp).size(8.dp).clip(CircleShape).background(warna))
                    if (i < minOf(log.size, 15) - 1) Box(Modifier.width(1.5.dp).weight(1f).background(MaterialTheme.colorScheme.outlineVariant))
                }
                Column(Modifier.padding(start = 8.dp, bottom = 10.dp)) {
                    Text(l.pesan, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface)
                    waktuAudit(l.waktu)?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                }
            }
        }
    }
}

private fun waktuAudit(raw: String): String? {
    val ms = raw.trim().toLongOrNull()
    val dt = when {
        ms != null -> Instant.fromEpochMilliseconds(ms).toLocalDateTime(TimeZone.currentSystemDefault())
        raw.length >= 16 && raw[4] == '-' -> runCatching { LocalDateTime.parse(raw.trim().replace(' ', 'T').take(19)) }.getOrNull()
        else -> null
    } ?: return null
    return "${dt.dayOfMonth} ${namaBulanPendek(dt.monthNumber)} ${dt.hour.toString().padStart(2, '0')}:${dt.minute.toString().padStart(2, '0')}"
}
