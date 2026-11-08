package com.upstyle.bizgrow.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.data.*
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors

private val tabBantuan = listOf("Panduan", "FAQ", "Kendala", "Hubungi")

/** Pusat Bantuan — konten sama dengan halaman /help di web: panduan modul, FAQ (cari + kategori), troubleshooting, hubungi tim & ulasan. */
@Composable
fun HelpCenterScreen(viewModel: AppViewModel) {
    val konten by viewModel.bantuan.collectAsState(initial = viewModel.bantuan.value)
    val galat by viewModel.bantuanGalat.collectAsState(initial = viewModel.bantuanGalat.value)
    var tab by remember { mutableStateOf(0) }

    LaunchedEffect(Unit) { viewModel.muatBantuan() }

    BizScreen(
        title = "Pusat bantuan", subtitle = "Panduan, FAQ, dan dukungan", onBack = { viewModel.navigateBack() },
        actions = {
            BizIconButton(Icons.Rounded.AutoAwesome, "Tanya Asisten AI") { viewModel.navigate(Screen.AiChat) }
            BizIconButton(Icons.Rounded.MonitorHeart, "Diagnostik sistem") { viewModel.navigate(Screen.Diagnostics) }
        }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            TabRow(selectedTabIndex = tab, containerColor = MaterialTheme.colorScheme.background) {
                tabBantuan.forEachIndexed { i, t -> Tab(selected = tab == i, onClick = { tab = i }, text = { Text(t) }) }
            }
            val k = konten
            when {
                tab == 3 -> TabHubungi(viewModel)
                k == null && galat != null -> ErrorView(galat ?: "", { viewModel.muatBantuan() })
                k == null -> SkeletonList(5, Modifier.padding(16.dp))
                tab == 0 -> TabPanduan(k.panduan)
                tab == 1 -> TabFaq(k)
                else -> TabKendala(k.troubleshoot)
            }
        }
    }
}

@Composable
private fun KartuLipat(judul: String, ringkas: String? = null, label: String? = null, isi: @Composable ColumnScope.() -> Unit) {
    var buka by remember { mutableStateOf(false) }
    BizSurface(Modifier.fillMaxWidth(), onClick = { buka = !buka }, contentPadding = PaddingValues(14.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                if (label != null) Text(label.uppercase(), style = MaterialTheme.typography.labelSmall, color = BizgrowColors.Primary, fontWeight = FontWeight.Bold)
                Text(judul, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                if (ringkas != null && !buka) Text(ringkas, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Icon(if (buka) Icons.Rounded.ExpandLess else Icons.Rounded.ExpandMore, null, tint = MaterialTheme.colorScheme.outline)
        }
        AnimatedVisibility(buka) { Column(Modifier.padding(top = 10.dp), content = isi) }
    }
}

@Composable
private fun TabPanduan(daftar: List<BantuanPanduan>) {
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        items(daftar, key = { it.title }) { g ->
            KartuLipat(g.title, ringkas = g.desc) {
                Text(g.desc, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(8.dp))
                g.steps.forEachIndexed { i, langkah ->
                    Row(Modifier.padding(vertical = 4.dp)) {
                        Text("${i + 1}.", fontWeight = FontWeight.Bold, color = BizgrowColors.Primary, modifier = Modifier.width(24.dp))
                        Text(langkah, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }
    }
}

@Composable
private fun TabFaq(k: BantuanKonten) {
    var cari by remember { mutableStateOf("") }
    var kat by remember { mutableStateOf("") }
    val tampil = k.items.filter { (kat.isBlank() || it.category == kat) && (cari.isBlank() || it.q.contains(cari, true) || it.a.contains(cari, true)) }
    Column(Modifier.fillMaxSize()) {
        BizSearchField(cari, { cari = it }, "Cari pertanyaan…", Modifier.padding(horizontal = 16.dp, vertical = 8.dp))
        Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterPill("Semua", kat.isBlank(), { kat = "" })
            k.kategori.forEach { c -> FilterPill(c.label, kat == c.id, { kat = c.id }) }
        }
        if (tampil.isEmpty()) EmptyView("Tidak ada hasil", "Coba kata kunci lain, atau tanya Asisten AI / hubungi tim kami.", Icons.Rounded.SearchOff)
        else LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(tampil, key = { it.id }) { f ->
                KartuLipat(f.q, label = k.kategori.firstOrNull { it.id == f.category }?.label ?: f.category) {
                    Text(f.a, style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
    }
}

@Composable
private fun TabKendala(grup: List<BantuanTroubleshoot>) {
    var pilih by remember { mutableStateOf(grup.firstOrNull()?.id ?: "") }
    val aktif = grup.firstOrNull { it.id == pilih } ?: grup.firstOrNull()
    Column(Modifier.fillMaxSize()) {
        Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            grup.forEach { g -> FilterPill(g.label, aktif?.id == g.id, { pilih = g.id }) }
        }
        LazyColumn(contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(aktif?.masalah.orEmpty(), key = { it.problem }) { m ->
                KartuLipat(m.problem, label = "Kendala") { Text(m.solution, style = MaterialTheme.typography.bodyMedium) }
            }
        }
    }
}

@Composable
private fun TabHubungi(viewModel: AppViewModel) {
    val awal = remember { viewModel.ulasanTersimpan() }
    var judul by remember { mutableStateOf("") }
    var isi by remember { mutableStateOf("") }
    var prioritas by remember { mutableStateOf("medium") }
    var bintang by remember { mutableStateOf(awal?.first ?: 0) }
    var komentar by remember { mutableStateOf(awal?.second.orEmpty()) }
    var terkirimUlasan by remember { mutableStateOf(awal != null) }

    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item {
            BizSurface(Modifier.fillMaxWidth()) {
                Text("Kirim tiket ke tim Bizgrow", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text("Untuk kendala yang tidak terjawab di panduan atau FAQ.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(10.dp))
                BizTextField(judul, { judul = it }, "Judul masalah *")
                Spacer(Modifier.height(8.dp))
                BizTextField(isi, { isi = it }, "Ceritakan kendalanya *", singleLine = false)
                Spacer(Modifier.height(8.dp))
                PilihanPil("Prioritas", listOf("low" to "Rendah", "medium" to "Sedang", "high" to "Tinggi"), prioritas) { prioritas = it }
                Spacer(Modifier.height(10.dp))
                BizButton("Kirim tiket", onClick = { viewModel.kirimTiketTim(judul.trim(), isi.trim(), prioritas) { judul = ""; isi = "" } }, modifier = Modifier.fillMaxWidth(), enabled = judul.isNotBlank() && isi.isNotBlank(), icon = Icons.Rounded.Send)
            }
        }
        item {
            BizSurface(Modifier.fillMaxWidth()) {
                Text("Ulasan aplikasi", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(if (terkirimUlasan) "Terima kasih! Kamu bisa memperbarui ulasanmu." else "Seberapa puas kamu memakai Bizgrow?", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    (1..5).forEach { n ->
                        BizIconButton(if (n <= bintang) Icons.Rounded.Star else Icons.Rounded.StarBorder, "$n bintang", tint = if (n <= bintang) BizgrowColors.Warning else MaterialTheme.colorScheme.outline) { bintang = n }
                    }
                }
                Spacer(Modifier.height(8.dp))
                BizTextField(komentar, { komentar = it }, "Komentar (opsional)", singleLine = false)
                Spacer(Modifier.height(10.dp))
                BizButton(if (terkirimUlasan) "Perbarui ulasan" else "Kirim ulasan", onClick = { viewModel.kirimUlasan(bintang, komentar.trim()); terkirimUlasan = true }, modifier = Modifier.fillMaxWidth(), enabled = bintang > 0, icon = Icons.Rounded.Star)
            }
        }
        item {
            BizSurface(Modifier.fillMaxWidth(), onClick = { viewModel.navigate(Screen.Diagnostics) }) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconBadge(Icons.Rounded.MonitorHeart, BizgrowColors.Success); Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text("Diagnostik sistem", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                        Text("Cek koneksi server, database, dan layanan secara langsung", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Icon(Icons.Rounded.ChevronRight, null, tint = MaterialTheme.colorScheme.outline)
                }
            }
        }
    }
}
