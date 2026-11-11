package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.snapshots.SnapshotStateMap
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.data.Product
import com.upstyle.bizgrow.data.StockOpnameSession
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors

/** Stok opname: riwayat + hitung fisik baru (stok & jurnal selisih disesuaikan server). */
@Composable
fun StockOpnameScreen(viewModel: AppViewModel) {
    val sesi by viewModel.stockOpnameSessions.collectAsState(initial = viewModel.stockOpnameSessions.value)
    val produk by viewModel.products.collectAsState(initial = viewModel.products.value)
    var baru by remember { mutableStateOf(false) }
    var detail by remember { mutableStateOf<StockOpnameSession?>(null) }

    LaunchedEffect(Unit) { viewModel.loadStockOpnameList(); viewModel.loadProducts() }

    if (baru) {
        FormOpname(viewModel, produk.filter { it.status != "archived" && it.bisaDijual || it.status != "archived" }, onTutup = { baru = false })
        return
    }

    BizScreen(
        title = "Stok opname", subtitle = "${sesi.size} riwayat", onBack = { viewModel.navigateBack() },
        floatingActionButton = { FabTambah("Opname baru") { baru = true } }
    ) { padding ->
        if (sesi.isEmpty()) {
            EmptyView(
                "Belum ada stok opname", "Hitung stok fisik di gudang/rak, lalu cocokkan dengan stok sistem. Selisih langsung disesuaikan dan dijurnal.",
                Icons.Rounded.FactCheck, "Mulai opname", { baru = true }, Modifier.padding(padding)
            )
        } else LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 96.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(sesi, key = { it.id }) { s ->
                val selisih = s.items.count { it.difference != 0 }
                BizSurface(Modifier.fillMaxWidth(), onClick = { detail = s }, contentPadding = PaddingValues(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconBadge(Icons.Rounded.FactCheck, if (selisih == 0) BizgrowColors.Success else BizgrowColors.Warning, size = 44.dp, iconSize = 22.dp)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text("Opname #${s.id}", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                            Text("${s.items.size} produk dihitung • ${if (selisih == 0) "tidak ada selisih" else "$selisih selisih"}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            if (!s.notes.isNullOrBlank()) Text(s.notes, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            StatusChip(if (s.status == "COMPLETED") "Selesai" else s.status, if (s.status == "COMPLETED") BizgrowColors.Success else BizgrowColors.Warning)
                            Text(s.createdAt.take(10), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }
    detail?.let { DetailOpname(it) { detail = null } }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DetailOpname(s: StockOpnameSession, onDismiss: () -> Unit) {
    com.upstyle.bizgrow.ui.design.LembarForm(onDismiss = onDismiss) {
        LazyColumn(Modifier.fillMaxWidth().navigationBarsPadding(), contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            item {
                Text("Opname #${s.id}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text(s.createdAt.take(16).replace('T', ' '), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (!s.notes.isNullOrBlank()) Text(s.notes, style = MaterialTheme.typography.bodyMedium)
            }
            items(s.items, key = { it.id }) { i ->
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(i.productName.ifBlank { i.productId }, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                        Text("Sistem ${i.systemStock} → Fisik ${i.actualStock}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    val warna = when { i.difference < 0 -> BizgrowColors.Danger; i.difference > 0 -> BizgrowColors.Success; else -> MaterialTheme.colorScheme.onSurfaceVariant }
                    Text(if (i.difference > 0) "+${i.difference}" else "${i.difference}", color = warna, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun FormOpname(viewModel: AppViewModel, produk: List<Product>, onTutup: () -> Unit) {
    val hitung: SnapshotStateMap<String, String> = remember { mutableStateMapOf() }
    var cari by remember { mutableStateOf("") }
    var catatan by remember { mutableStateOf("") }
    var konfirmasi by remember { mutableStateOf(false) }
    var proses by remember { mutableStateOf(false) }
    val tampil = remember(produk, cari) { produk.filter { cari.isBlank() || it.nama.contains(cari, true) || it.sku.contains(cari, true) } }
    val terisi = hitung.filterValues { it.isNotBlank() }
    val selisih = terisi.count { (id, v) -> produk.firstOrNull { it.id == id }?.let { (v.toIntOrNull() ?: it.stok) != it.stok } == true }

    BizScreen(
        title = "Opname baru", subtitle = "${terisi.size} dihitung • $selisih selisih", onBack = onTutup,
        bottomBar = {
            Surface(tonalElevation = 3.dp, shadowElevation = 6.dp) {
                Column(Modifier.fillMaxWidth().navigationBarsPadding().imePadding().padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    BizTextField(catatan, { catatan = it }, "Catatan (opsional)")
                    BizButton(if (proses) "Menyimpan…" else "Selesaikan opname", onClick = { konfirmasi = true }, modifier = Modifier.fillMaxWidth(), enabled = terisi.isNotEmpty() && !proses, icon = Icons.Rounded.Check)
                }
            }
        }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            BizSearchField(cari, { cari = it }, "Cari produk / SKU…", Modifier.padding(horizontal = 16.dp, vertical = 8.dp))
            if (tampil.isEmpty()) EmptyView("Produk tidak ditemukan", null, Icons.Rounded.Inventory2)
            else LazyColumn(contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(tampil, key = { it.id }) { p ->
                    val isi = hitung[p.id].orEmpty()
                    val fisik = isi.toIntOrNull()
                    val beda = fisik != null && fisik != p.stok
                    BizSurface(Modifier.fillMaxWidth(), contentPadding = PaddingValues(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(p.nama, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text("Stok sistem ${p.stok}" + if (p.sku.isNotBlank()) " • ${p.sku}" else "", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                if (beda) {
                                    val d = fisik!! - p.stok
                                    Text("Selisih ${if (d > 0) "+$d" else "$d"}", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = if (d < 0) BizgrowColors.Danger else BizgrowColors.Success)
                                }
                            }
                            Box(Modifier.width(110.dp)) { AngkaField(isi, { hitung[p.id] = it }, "Fisik", desimal = false) }
                        }
                    }
                }
            }
        }
    }
    if (konfirmasi) AlertDialog(
        onDismissRequest = { konfirmasi = false },
        title = { Text("Selesaikan opname?") },
        text = { Text("${terisi.size} produk dihitung, $selisih selisih. Stok sistem akan diganti dengan hitungan fisik dan selisihnya dijurnal. Tidak bisa dibatalkan.") },
        confirmButton = {
            TextButton(onClick = {
                konfirmasi = false; proses = true
                viewModel.simpanStokOpname(catatan.takeIf { it.isNotBlank() }, terisi.mapNotNull { (id, v) -> v.toIntOrNull()?.let { id to it } }, onGagal = { proses = false }) { proses = false; onTutup() }
            }) { Text("Selesaikan") }
        },
        dismissButton = { TextButton(onClick = { konfirmasi = false }) { Text("Periksa lagi") } }
    )
}
