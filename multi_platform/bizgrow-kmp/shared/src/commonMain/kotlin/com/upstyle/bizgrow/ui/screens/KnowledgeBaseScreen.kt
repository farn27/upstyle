package com.upstyle.bizgrow.ui.screens

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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.data.KnowledgeArticle
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors

/** Knowledge base layanan pelanggan (web: layanan/[slug]/knowledge-base) — tambah, baca, cari, hapus artikel. */
@Composable
fun KnowledgeBaseScreen(viewModel: AppViewModel) {
    val artikel by viewModel.knowledgeBase.collectAsState()
    var cari by remember { mutableStateOf("") }
    var kategori by remember { mutableStateOf("") }
    var baru by remember { mutableStateOf(false) }
    var hapus by remember { mutableStateOf<KnowledgeArticle?>(null) }

    LaunchedEffect(Unit) { viewModel.loadKnowledgeBase() }
    // Pencarian dikirim ke server (judul + isi) setelah jeda ketik
    LaunchedEffect(cari) {
        if (cari.isNotBlank()) kotlinx.coroutines.delay(350)
        viewModel.loadKnowledgeBase(cari.trim().ifEmpty { null })
    }

    val daftarKategori = remember(artikel) { artikel.map { it.category.ifBlank { "Umum" } }.distinct().sorted() }
    val tampil = artikel.filter { kategori.isEmpty() || it.category.ifBlank { "Umum" } == kategori }

    BizScreen(
        title = "Knowledge base", subtitle = "${artikel.size} artikel",
        onBack = { viewModel.navigateBack() },
        floatingActionButton = { FabTambah("Artikel") { baru = true } }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            BizSearchField(cari, { cari = it }, "Cari judul atau isi artikel…", Modifier.padding(horizontal = 16.dp, vertical = 8.dp))
            if (daftarKategori.size > 1) {
                Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterPill("Semua", kategori.isEmpty(), { kategori = "" })
                    daftarKategori.forEach { k -> FilterPill(k, kategori == k, { kategori = if (kategori == k) "" else k }) }
                }
            }
            if (tampil.isEmpty()) {
                EmptyView(
                    if (artikel.isEmpty() && cari.isBlank()) "Belum ada artikel" else "Artikel tidak ditemukan",
                    "Simpan jawaban untuk pertanyaan yang sering diajukan pelanggan agar tim CS menjawab seragam.",
                    Icons.Rounded.MenuBook, if (artikel.isEmpty() && cari.isBlank()) "Tulis artikel" else null,
                    if (artikel.isEmpty() && cari.isBlank()) ({ baru = true }) else null
                )
            } else {
                LazyColumn(contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 96.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(tampil, key = { it.id }) { a -> KartuArtikel(a) { hapus = a } }
                }
            }
        }
    }

    if (baru) ArtikelBaruSheet(daftarKategori, { baru = false }) { judul, kat, isi ->
        viewModel.createKnowledgeArticle(judul, kat, isi); baru = false
    }
    hapus?.let { a ->
        KonfirmasiHapus("Hapus artikel?", "\"${a.title}\" akan dihapus permanen.", { viewModel.deleteKnowledgeArticle(a.id); hapus = null }, { hapus = null })
    }
}

@Composable
private fun KartuArtikel(a: KnowledgeArticle, onHapus: () -> Unit) {
    var buka by remember { mutableStateOf(false) }
    BizSurface(Modifier.fillMaxWidth(), onClick = { buka = !buka }, contentPadding = PaddingValues(14.dp)) {
        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconBadge(Icons.Rounded.Article, BizgrowColors.Info, size = 40.dp, iconSize = 20.dp)
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(a.title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, maxLines = if (buka) 4 else 2, overflow = TextOverflow.Ellipsis)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                        StatusChip(a.category.ifBlank { "Umum" }, BizgrowColors.Violet)
                        if (a.createdAt.length >= 10) Text(a.createdAt.take(10), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                Icon(if (buka) Icons.Rounded.ExpandLess else Icons.Rounded.ExpandMore, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (buka) {
                Spacer(Modifier.height(10.dp))
                Text(a.content, style = MaterialTheme.typography.bodyMedium)
                Spacer(Modifier.height(6.dp))
                TextButton(onClick = onHapus) {
                    Icon(Icons.Rounded.DeleteOutline, null, tint = BizgrowColors.Danger, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Hapus", color = BizgrowColors.Danger)
                }
            } else {
                Spacer(Modifier.height(6.dp))
                Text(a.content, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}

@Composable
private fun ArtikelBaruSheet(kategoriAda: List<String>, onDismiss: () -> Unit, onSimpan: (judul: String, kategori: String, isi: String) -> Unit) {
    var judul by remember { mutableStateOf("") }
    var kategori by remember { mutableStateOf("Umum") }
    var isi by remember { mutableStateOf("") }
    FormSheet(
        judul = "Artikel baru", onDismiss = onDismiss, simpanAktif = judul.isNotBlank() && isi.isNotBlank(),
        onSimpan = { onSimpan(judul.trim(), kategori.trim().ifEmpty { "Umum" }, isi.trim()) }
    ) {
        BizTextField(judul, { judul = it }, "Judul *", placeholder = "mis. Cara melacak pesanan")
        if (kategoriAda.isNotEmpty()) PilihanField("Pilih kategori yang ada", kategoriAda.map { it to it }, null, { kategori = it }, placeholder = "Kategori sebelumnya")
        BizTextField(kategori, { kategori = it }, "Kategori")
        BizTextField(isi, { isi = it }, "Isi artikel *", singleLine = false, placeholder = "Tulis jawaban lengkap untuk pelanggan")
    }
}
