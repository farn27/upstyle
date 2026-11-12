package com.upstyle.bizgrow.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.data.Analitik
import com.upstyle.bizgrow.data.WawasanAnalitik
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors

/**
 * Analisis Cerdas: skor kesehatan terjelaskan, perkiraan omzet (Holt-Winters) + kisaran, wawasan & aksi.
 * Data dari mesin statistik server (/api/analitik) — tanpa model AI, tanpa token.
 */
@Composable
fun AnalisisCerdasCard(a: Analitik?, sembunyi: Boolean, modifier: Modifier = Modifier) {
    BizSurface(modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier.clip(RoundedCornerShape(6.dp)).background(BizgrowColors.Primary).padding(horizontal = 8.dp, vertical = 3.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.AutoAwesome, null, tint = Color.White, modifier = Modifier.size(12.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("ANALISIS CERDAS", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Black, color = Color.White)
                }
            }
            Spacer(Modifier.width(8.dp))
            Text("Statistik otomatis · tanpa token", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Spacer(Modifier.height(12.dp))

        if (a == null) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp)
                Spacer(Modifier.width(10.dp))
                Text("Menghitung analisis…", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            return@BizSurface
        }

        Text(a.ringkasan, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
        Spacer(Modifier.height(12.dp))

        // ── Skor kesehatan ──
        val k = a.kesehatan
        val warnaSkor = when {
            k.skor >= 80 -> BizgrowColors.Success
            k.skor >= 65 -> BizgrowColors.Primary
            k.skor >= 45 -> BizgrowColors.Warning
            else -> BizgrowColors.Danger
        }
        val trek = MaterialTheme.colorScheme.outlineVariant
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(78.dp), contentAlignment = Alignment.Center) {
                Canvas(Modifier.fillMaxSize()) {
                    drawArc(trek, 0f, 360f, false, style = Stroke(16f))
                    drawArc(warnaSkor, -90f, k.skor / 100f * 360f, false, style = Stroke(16f, cap = StrokeCap.Round))
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("${k.skor}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
                    Text("NILAI ${k.nilai}", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = warnaSkor)
                }
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                k.komponen.forEach { c ->
                    val w = when {
                        c.skor >= 70 -> BizgrowColors.Success
                        c.skor >= 45 -> BizgrowColors.Warning
                        else -> BizgrowColors.Danger
                    }
                    Column {
                        Row {
                            Text(c.nama, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
                            Text("${c.skor}", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                        }
                        Box(Modifier.fillMaxWidth().height(5.dp).clip(RoundedCornerShape(3.dp)).background(trek)) {
                            Box(Modifier.fillMaxWidth(c.skor.coerceIn(0, 100) / 100f).fillMaxHeight().clip(RoundedCornerShape(3.dp)).background(w))
                        }
                    }
                }
            }
        }
        k.komponen.filter { it.skor < 60 }.forEach {
            Spacer(Modifier.height(6.dp))
            Text("${it.nama}: ${it.alasan}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }

        // ── Prediksi ──
        val p = a.prediksi
        Spacer(Modifier.height(16.dp))
        Text("PERKIRAAN OMZET BULAN INI", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(if (sembunyi) "Rp ••••" else p.akhirBulan.nilai.rupiah(), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black)
        if (!sembunyi) {
            Text(
                "kisaran ${p.akhirBulan.bawah.rupiahRingkas()} – ${p.akhirBulan.atas.rupiahRingkas()} · bulan lalu ${p.akhirBulan.bulanLalu.rupiahRingkas()}",
                style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Text(
            "${p.metode} · ${p.galatUji?.let { "galat validasi ±$it%" } ?: "data belum cukup untuk uji akurasi"}",
            style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        if (p.riwayat.isNotEmpty()) {
            Spacer(Modifier.height(8.dp))
            GrafikPrediksi(a, Modifier.fillMaxWidth().height(110.dp))
            Row(Modifier.padding(top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(8.dp).clip(RoundedCornerShape(2.dp)).background(BizgrowColors.Success))
                Text(" Omzet 28 hari   ", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Box(Modifier.size(8.dp).clip(RoundedCornerShape(2.dp)).background(BizgrowColors.Primary))
                Text(" Prediksi 7 hari", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        // ── Wawasan ──
        if (a.wawasan.isNotEmpty()) {
            var semua by remember { mutableStateOf(false) }
            Spacer(Modifier.height(14.dp))
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                a.wawasan.take(3).forEach { KartuWawasan(it) }
                AnimatedVisibility(semua) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) { a.wawasan.drop(3).forEach { KartuWawasan(it) } }
                }
            }
            if (a.wawasan.size > 3) {
                Text(
                    if (semua) "Sembunyikan" else "Lihat ${a.wawasan.size - 3} wawasan lain",
                    style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = BizgrowColors.Primary,
                    modifier = Modifier.padding(top = 8.dp).clip(RoundedCornerShape(6.dp)).clickable { semua = !semua }.padding(4.dp)
                )
            }
        }
    }
}

@Composable
private fun KartuWawasan(w: WawasanAnalitik) {
    val (ikon, warna) = when (w.tipe) {
        "bahaya" -> Icons.Rounded.Warning to BizgrowColors.Danger
        "peringatan" -> Icons.Rounded.ErrorOutline to BizgrowColors.Warning
        "baik" -> Icons.Rounded.CheckCircle to BizgrowColors.Success
        else -> Icons.Rounded.Info to BizgrowColors.Primary
    }
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(warna.copy(alpha = 0.07f)).padding(10.dp),
        verticalAlignment = Alignment.Top
    ) {
        Icon(ikon, null, tint = warna, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(10.dp))
        Column {
            Text(w.judul, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
            Text(w.isi, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            w.aksi?.let { Text("→ $it", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold, color = BizgrowColors.Primary, modifier = Modifier.padding(top = 2.dp)) }
        }
    }
}

/** Omzet 28 hari (garis hijau) + prediksi 7 hari (garis putus ungu) dengan pita kisaran 80%. */
@Composable
private fun GrafikPrediksi(a: Analitik, modifier: Modifier) {
    val riwayat = a.prediksi.riwayat.map { it.nilai.toFloat() }
    val ramal = a.prediksi.ramalan
    val semua = riwayat + ramal.map { it.atas.toFloat() }
    val maks = (semua.maxOrNull() ?: 1f).coerceAtLeast(1f)
    val n = riwayat.size + ramal.size
    val kisi = MaterialTheme.colorScheme.outlineVariant
    val hijau = BizgrowColors.Success
    val ungu = BizgrowColors.Primary
    Canvas(modifier) {
        val lebar = size.width
        val tinggi = size.height
        val x = { i: Int -> if (n <= 1) 0f else i * lebar / (n - 1) }
        val y = { v: Float -> tinggi - (v / maks) * tinggi * 0.92f }
        for (g in 1..3) drawLine(kisi, Offset(0f, tinggi * g / 4), Offset(lebar, tinggi * g / 4), strokeWidth = 1f)
        // pita kisaran
        if (ramal.isNotEmpty()) {
            val pita = Path().apply {
                moveTo(x(riwayat.size - 1), y(riwayat.last()))
                ramal.forEachIndexed { h, r -> lineTo(x(riwayat.size + h), y(r.atas.toFloat())) }
                for (h in ramal.indices.reversed()) lineTo(x(riwayat.size + h), y(ramal[h].bawah.toFloat()))
                close()
            }
            drawPath(pita, ungu.copy(alpha = 0.12f))
        }
        val garis = Path().apply { riwayat.forEachIndexed { i, v -> if (i == 0) moveTo(x(i), y(v)) else lineTo(x(i), y(v)) } }
        drawPath(garis, hijau, style = Stroke(4f, cap = StrokeCap.Round))
        if (ramal.isNotEmpty()) {
            val prediksi = Path().apply {
                moveTo(x(riwayat.size - 1), y(riwayat.last()))
                ramal.forEachIndexed { h, r -> lineTo(x(riwayat.size + h), y(r.nilai.toFloat())) }
            }
            drawPath(prediksi, ungu, style = Stroke(4f, cap = StrokeCap.Round, pathEffect = PathEffect.dashPathEffect(floatArrayOf(12f, 10f))))
        }
    }
}
