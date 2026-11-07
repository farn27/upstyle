package com.upstyle.bizgrow.ui.screens

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ShowChart
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import kotlin.math.roundToInt
import com.upstyle.bizgrow.data.FinanceData
import com.upstyle.bizgrow.data.ProdukTerlaris
import com.upstyle.bizgrow.data.TitikGrafik
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizMotion
import com.upstyle.bizgrow.ui.theme.BizgrowColors

/**
 * "Grafik Analisis" dashboard web: mode CASH (garis pemasukan/pengeluaran mengikuti periode, per jam bila
 * satu hari) dan mode ITEMS (produk terlaris), filter Semua/Masuk/Keluar. Data dihitung server untuk seluruh periode.
 */
@Composable
fun GrafikAnalisis(fd: FinanceData?, periode: String, sembunyi: Boolean, modifier: Modifier = Modifier) {
    var mode by rememberSaveable { mutableStateOf("CASH") }
    var kategori by rememberSaveable { mutableStateOf("") }
    BizSurface(modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconBadge(Icons.Rounded.ShowChart, BizgrowColors.Primary, size = 36.dp, iconSize = 18.dp)
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text("Grafik analisis", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(
                    (if (mode == "CASH") "Arus kas" else "Produk terlaris") + " • $periode",
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterPill("CASH", mode == "CASH", { mode = "CASH" })
            FilterPill("ITEMS", mode == "ITEMS", { mode = "ITEMS" })
            Spacer(Modifier.weight(1f))
        }
        if (mode == "CASH") {
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterPill("Semua", kategori == "", { kategori = "" })
                FilterPill("Masuk", kategori == "MASUK", { kategori = "MASUK" })
                FilterPill("Keluar", kategori == "KELUAR", { kategori = "KELUAR" })
            }
            Spacer(Modifier.height(14.dp))
            val titik = fd?.grafik.orEmpty()
            if (titik.isEmpty()) KosongGrafik("Belum ada transaksi pada periode ini")
            else GrafikGaris(titik, kategori != "KELUAR", kategori != "MASUK", fd?.perJam == true, sembunyi)
        } else {
            Spacer(Modifier.height(14.dp))
            val terlaris = fd?.produkTerlaris.orEmpty()
            if (terlaris.isEmpty()) KosongGrafik("Belum ada data terlaris — transaksi belum terhubung ke produk")
            else ProdukTerlarisList(terlaris, sembunyi)
        }
    }
}

@Composable
private fun KosongGrafik(pesan: String) {
    Box(Modifier.fillMaxWidth().height(110.dp), contentAlignment = Alignment.Center) {
        Text(pesan, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
    }
}

private fun labelTitik(raw: String): String =
    if (raw.length == 10 && raw[4] == '-' && raw[7] == '-') {
        val bln = raw.substring(5, 7).toIntOrNull() ?: 0
        "${raw.substring(8).toIntOrNull() ?: 0} ${namaBulanPendek(bln)}"
    } else raw

@Composable
private fun GrafikGaris(titik: List<TitikGrafik>, tampilMasuk: Boolean, tampilKeluar: Boolean, perJam: Boolean, sembunyi: Boolean) {
    val warnaMasuk = BizgrowColors.Success
    val warnaKeluar = BizgrowColors.Danger
    val grid = MaterialTheme.colorScheme.outlineVariant
    var terpilih by remember(titik) { mutableStateOf<Int?>(null) }
    val maks = (titik.maxOfOrNull { maxOf(if (tampilMasuk) it.masuk else 0.0, if (tampilKeluar) it.keluar else 0.0) } ?: 0.0)
        .takeIf { it > 0 } ?: 1.0
    val tumbuh = remember { Animatable(0f) }
    LaunchedEffect(titik, tampilMasuk, tampilKeluar) { tumbuh.snapTo(0f); tumbuh.animateTo(1f, tween(700, easing = BizMotion.Emphasized)) }

    Canvas(
        Modifier.fillMaxWidth().height(170.dp)
            .pointerInput(titik) {
                detectTapGestures { o -> terpilih = indeksDari(o.x, size.width.toFloat(), titik.size) }
            }
            .pointerInput(titik) {
                detectHorizontalDragGestures { change, _ -> terpilih = indeksDari(change.position.x, size.width.toFloat(), titik.size) }
            }
    ) {
        val tinggi = size.height
        for (g in 0..3) {
            val y = tinggi * g / 3f
            drawLine(grid, Offset(0f, y), Offset(size.width, y), strokeWidth = 1f)
        }
        val n = titik.size
        fun x(i: Int) = if (n == 1) size.width / 2f else size.width * i / (n - 1f)
        fun y(v: Double) = tinggi - (v / maks).toFloat() * tinggi * 0.92f * tumbuh.value - 2f
        if (tampilMasuk) gambarSeri(titik.map { it.masuk }, ::x, ::y, warnaMasuk, tinggi)
        if (tampilKeluar) gambarSeri(titik.map { it.keluar }, ::x, ::y, warnaKeluar, tinggi)
        terpilih?.let { i ->
            drawLine(grid.copy(alpha = 1f), Offset(x(i), 0f), Offset(x(i), tinggi), strokeWidth = 2f)
            if (tampilMasuk) drawCircle(warnaMasuk, 6f, Offset(x(i), y(titik[i].masuk)))
            if (tampilKeluar) drawCircle(warnaKeluar, 6f, Offset(x(i), y(titik[i].keluar)))
        }
    }
    Spacer(Modifier.height(6.dp))
    // Label sumbu X: awal, tengah, akhir
    Row(Modifier.fillMaxWidth()) {
        Text(labelTitik(titik.first().label), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.weight(1f))
        if (titik.size > 2) Text(labelTitik(titik[titik.size / 2].label), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.weight(1f))
        if (titik.size > 1) Text(labelTitik(titik.last().label), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
    Spacer(Modifier.height(10.dp))
    // Ringkasan: titik yang disentuh, atau total periode
    val t = terpilih?.let { titik.getOrNull(it) }
    val masuk = t?.masuk ?: titik.sumOf { it.masuk }
    val keluar = t?.keluar ?: titik.sumOf { it.keluar }
    Text(
        if (t != null) labelTitik(t.label) + (if (perJam) " WIB" else "") else "Total periode • sentuh grafik untuk detail",
        style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant
    )
    Spacer(Modifier.height(4.dp))
    Row {
        if (tampilMasuk) Column(Modifier.weight(1f)) {
            Legenda("Pemasukan", warnaMasuk)
            Text(if (sembunyi) "••••" else masuk.rupiahRingkas(), style = MaterialTheme.typography.titleSmall, color = warnaMasuk)
        }
        if (tampilKeluar) Column(Modifier.weight(1f)) {
            Legenda("Pengeluaran", warnaKeluar)
            Text(if (sembunyi) "••••" else keluar.rupiahRingkas(), style = MaterialTheme.typography.titleSmall, color = warnaKeluar)
        }
        if (tampilMasuk && tampilKeluar) Column(Modifier.weight(1f)) {
            Text("Selisih", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(if (sembunyi) "••••" else (masuk - keluar).rupiahRingkas(), style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface)
        }
    }
}

private fun indeksDari(x: Float, lebar: Float, n: Int): Int? {
    if (n <= 0 || lebar <= 0f) return null
    if (n == 1) return 0
    return ((x / lebar) * (n - 1)).roundToInt().coerceIn(0, n - 1)
}

/** Garis halus (kurva) + isian gradien di bawahnya, seperti chart.js tension 0.35. */
private fun DrawScope.gambarSeri(nilai: List<Double>, x: (Int) -> Float, y: (Double) -> Float, warna: Color, tinggi: Float) {
    if (nilai.isEmpty()) return
    val garis = Path()
    garis.moveTo(x(0), y(nilai[0]))
    for (i in 1 until nilai.size) {
        val x0 = x(i - 1); val y0 = y(nilai[i - 1]); val x1 = x(i); val y1 = y(nilai[i])
        val tengah = (x0 + x1) / 2f
        garis.cubicTo(tengah, y0, tengah, y1, x1, y1)
    }
    if (nilai.size > 1) {
        val isi = Path().apply {
            addPath(garis)
            lineTo(x(nilai.size - 1), tinggi); lineTo(x(0), tinggi); close()
        }
        drawPath(isi, Brush.verticalGradient(listOf(warna.copy(alpha = 0.22f), warna.copy(alpha = 0.0f)), startY = 0f, endY = tinggi))
    }
    drawPath(garis, warna, style = Stroke(width = 5f))
    if (nilai.size == 1) drawCircle(warna, 8f, Offset(x(0), y(nilai[0])))
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
private fun ProdukTerlarisList(daftar: List<ProdukTerlaris>, sembunyi: Boolean) {
    val maks = daftar.maxOfOrNull { it.total }?.takeIf { it > 0 } ?: 1.0
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        daftar.forEachIndexed { i, p ->
            val warna = BizgrowColors.ModuleColors[i % BizgrowColors.ModuleColors.size]
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("${i + 1}", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Black, color = warna, modifier = Modifier.width(22.dp))
                    Text(p.nama, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                    Text(if (sembunyi) "••••" else p.total.rupiahRingkas(), style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onSurface)
                }
                Spacer(Modifier.height(5.dp))
                Box(Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(50)).background(warna.copy(alpha = 0.12f))) {
                    Box(Modifier.fillMaxWidth((p.total / maks).toFloat().coerceIn(0.03f, 1f)).fillMaxHeight().clip(RoundedCornerShape(50)).background(warna))
                }
                if (p.qty > 0) Text("${p.qty} terjual", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 2.dp, start = 22.dp))
            }
        }
    }
}
