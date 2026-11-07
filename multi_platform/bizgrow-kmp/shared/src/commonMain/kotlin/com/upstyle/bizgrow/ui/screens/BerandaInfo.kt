package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors
import kotlinx.datetime.*

// Blok informasi Beranda web (Kalender Deadline Keuangan, Developer Hub & Updates, Bizgrow Academy, Bantuan).

private data class Deadline(val tanggal: LocalDate, val judul: String)

/** Deadline pajak terdekat (hitung dari hari ini, bukan teks tetap seperti di web). */
private fun hitungDeadline(hariIni: LocalDate): List<Deadline> {
    fun berikutnya(hari: Int, judul: String): Deadline {
        var d = LocalDate(hariIni.year, hariIni.monthNumber, hari.coerceAtMost(28))
        if (d < hariIni) d = d.plus(1, DateTimeUnit.MONTH)
        return Deadline(d, judul)
    }
    val spt = LocalDate(hariIni.year, 4, 30).let { if (it < hariIni) LocalDate(hariIni.year + 1, 4, 30) else it }
    return listOf(
        berikutnya(10, "Batas setor PPh 21"),
        berikutnya(20, "Batas lapor PPN masa"),
        Deadline(spt, "Batas SPT Tahunan Badan")
    ).sortedBy { it.tanggal }
}

@Composable
fun KalenderDeadline(modifier: Modifier = Modifier) {
    val hariIni = remember { Clock.System.now().toLocalDateTime(TimeZone.of("Asia/Jakarta")).date }
    val daftar = remember(hariIni) { hitungDeadline(hariIni) }
    BizSurface(modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconBadge(Icons.Rounded.EventNote, BizgrowColors.Danger, size = 36.dp, iconSize = 18.dp)
            Spacer(Modifier.width(10.dp))
            Column {
                Text("Kalender deadline keuangan", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                Text("Pengingat kewajiban pajak terdekat", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Spacer(Modifier.height(10.dp))
        daftar.forEach { d ->
            val sisa = hariIni.daysUntil(d.tanggal)
            val warna = when { sisa <= 3 -> BizgrowColors.Danger; sisa <= 10 -> BizgrowColors.Warning; else -> BizgrowColors.Info }
            Row(Modifier.fillMaxWidth().padding(vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(
                    Modifier.size(44.dp).clip(RoundedCornerShape(12.dp)).background(warna.copy(alpha = 0.12f)),
                    horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center
                ) {
                    Text("${d.tanggal.dayOfMonth}", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = warna)
                    Text(namaBulanPendek(d.tanggal.monthNumber), style = MaterialTheme.typography.labelSmall, color = warna)
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(d.judul, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                    Text(if (sisa == 0) "Hari ini!" else "$sisa hari lagi", style = MaterialTheme.typography.labelSmall, color = warna)
                }
            }
        }
    }
}

private data class Kabar(val tag: String, val judul: String, val desk: String, val warna: Color)

@Composable
fun KabarTerbaru(modifier: Modifier = Modifier) {
    val daftar = listOf(
        Kabar("NEW", "Modul POS Terintegrasi", "Transaksi kasir langsung tercatat di dashboard keuangan unit.", BizgrowColors.Success),
        Kabar("UPDATE", "Keamanan Portal Karyawan", "Password karyawan kini di-hash Argon2 saat login dan pendaftaran.", BizgrowColors.Info),
        Kabar("TIPS", "Keamanan Akun", "Gunakan password unik dan rotate API key Groq secara berkala.", BizgrowColors.Warning)
    )
    Column(modifier.fillMaxWidth()) {
        SectionTitle("Developer hub & update terbaru", subtitle = "Bizgrow v2.6.4")
        Spacer(Modifier.height(8.dp))
        daftar.forEachIndexed { i, k ->
            BizSurface(Modifier.fillMaxWidth().padding(bottom = 8.dp).enterAnimation(i), contentPadding = PaddingValues(12.dp)) {
                Row(verticalAlignment = Alignment.Top) {
                    Text(k.tag, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Black, color = k.warna,
                        modifier = Modifier.clip(RoundedCornerShape(6.dp)).background(k.warna.copy(alpha = 0.14f)).padding(horizontal = 7.dp, vertical = 3.dp))
                    Spacer(Modifier.width(10.dp))
                    Column {
                        Text(k.judul, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                        Text(k.desk, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}

@Composable
fun BizgrowAcademy(viewModel: AppViewModel, modifier: Modifier = Modifier) {
    val topik = listOf(
        Triple("TIPS", "Manajemen Kas Tanpa Pusing", "Cara optimasi cashflow UMKM"),
        Triple("IDE", "Strategi Ekspansi Unit Baru", "Cara tambah unit bisnis baru?")
    )
    Column(modifier.fillMaxWidth()) {
        SectionTitle("Bizgrow Academy", subtitle = "Belajar langsung bersama AI")
        Spacer(Modifier.height(8.dp))
        topik.forEachIndexed { i, (tag, judul, prompt) ->
            BizSurface(Modifier.fillMaxWidth().padding(bottom = 8.dp).enterAnimation(i), onClick = { viewModel.tanyaAi(prompt) }, contentPadding = PaddingValues(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconBadge(Icons.Rounded.School, BizgrowColors.Violet, size = 40.dp, iconSize = 20.dp)
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(tag, style = MaterialTheme.typography.labelSmall, color = BizgrowColors.Violet, fontWeight = FontWeight.Bold)
                        Text(judul, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                    }
                    Icon(Icons.Rounded.AutoAwesome, null, tint = BizgrowColors.Violet, modifier = Modifier.size(18.dp))
                }
            }
        }
        BizSurface(Modifier.fillMaxWidth().enterAnimation(2), onClick = { viewModel.navigate(Screen.Marketing) }, contentPadding = PaddingValues(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconBadge(Icons.Rounded.Campaign, BizgrowColors.Danger, size = 40.dp, iconSize = 20.dp)
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text("Marketing poster", style = MaterialTheme.typography.labelSmall, color = BizgrowColors.Danger, fontWeight = FontWeight.Bold)
                    Text("Desain kampanye iklan", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                    Text("Tingkatkan omzet e-commerce dengan otomasi target audiens ads pelanggan.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

@Composable
fun BantuanSistem(viewModel: AppViewModel, modifier: Modifier = Modifier) {
    BizSurface(modifier.fillMaxWidth(), onClick = { viewModel.navigate(Screen.HelpCenter) }) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconBadge(Icons.Rounded.SupportAgent, BizgrowColors.Info, size = 44.dp)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text("Butuh bantuan sistem Bizgrow?", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                Text("Tanya Asisten AI, troubleshoot konektivitas printer/barcode, dan ulasan sistem.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Icon(Icons.Rounded.ChevronRight, null, tint = MaterialTheme.colorScheme.outline)
        }
    }
}
