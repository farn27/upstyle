package com.upstyle.bizgrow.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.data.Transaction
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.ModuleCatalog
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors
import kotlinx.datetime.*

private fun isMasuk(t: Transaction) = t.kategoriTrx.uppercase() in setOf("MASUK", "PEMASUKAN")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FinanceScreen(viewModel: AppViewModel) {
    val financeData by viewModel.financeData.collectAsState(initial = viewModel.financeData.value)
    val dash by viewModel.dashboardState.collectAsState(initial = viewModel.dashboardState.value)
    var query by remember { mutableStateOf("") }
    var filter by remember { mutableStateOf("Semua") }
    var hapus by remember { mutableStateOf<Transaction?>(null) }

    LaunchedEffect(Unit) { viewModel.loadFinanceData() }

    val semua = financeData?.transactions.orEmpty()
    val tampil = remember(semua, query, filter) {
        semua.filter { t ->
            (query.isBlank() || t.keterangan.contains(query, true)) &&
                when (filter) { "Masuk" -> isMasuk(t); "Keluar" -> !isMasuk(t); else -> true }
        }
    }
    val masuk = semua.filter(::isMasuk).sumOf { it.nominal }
    val keluar = semua.filterNot(::isMasuk).sumOf { it.nominal }
    val hariIni = remember { Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).date }
    val perTanggal = remember(tampil) { tampil.groupBy { tanggalTransaksi(it.tanggal) } }
    val modulKeuangan = ModuleCatalog.first { it.title == "Keuangan" }.modules.filter { it.screen != Screen.Finance && it.screen != Screen.TransactionEntry }

    BizScreen(
        "Keuangan",
        subtitle = "Arus kas & pembukuan",
        onBack = { viewModel.navigateBack() },
        actions = {
            BizIconButton(Icons.Rounded.Assessment, "Laporan") { viewModel.navigate(Screen.Laporan) }
            Spacer(Modifier.width(8.dp))
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { viewModel.navigate(Screen.TransactionEntry) },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary,
                shape = RoundedCornerShape(18.dp),
                icon = { Icon(Icons.Rounded.EditNote, null) },
                text = { Text("Catat", fontWeight = FontWeight.Bold) }
            )
        }
    ) { padding ->
        PullToRefreshBox(dash.isLoading, { viewModel.loadFinanceData() }, Modifier.fillMaxSize().padding(padding)) {
            LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 96.dp)) {
                item {
                    GradientCard(Modifier.padding(horizontal = 16.dp).fillMaxWidth().enterAnimation(0)) {
                        Column {
                            Text("Selisih kas", style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.8f))
                            AnimatedAmount(masuk - keluar, MaterialTheme.typography.headlineLarge, Color.White)
                            Spacer(Modifier.height(14.dp))
                            Row {
                                Column(Modifier.weight(1f)) {
                                    Text("Pemasukan", style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.75f))
                                    Text(masuk.rupiahRingkas(), style = MaterialTheme.typography.titleMedium, color = Color.White)
                                }
                                Column(Modifier.weight(1f)) {
                                    Text("Pengeluaran", style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.75f))
                                    Text(keluar.rupiahRingkas(), style = MaterialTheme.typography.titleMedium, color = Color.White)
                                }
                                Column(Modifier.weight(1f)) {
                                    Text("Transaksi", style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.75f))
                                    Text("${semua.size}", style = MaterialTheme.typography.titleMedium, color = Color.White)
                                }
                            }
                        }
                    }
                }
                item {
                    SectionTitle("Pembukuan", Modifier.padding(start = 20.dp, top = 18.dp, bottom = 4.dp))
                    LazyRow(contentPadding = PaddingValues(horizontal = 12.dp)) {
                        items(modulKeuangan) { m ->
                            ModuleTile(m.label, m.icon, m.tint, Modifier.width(84.dp)) { viewModel.navigate(m.screen) }
                        }
                    }
                }
                item {
                    BizSearchField(query, { query = it }, "Cari keterangan transaksi", Modifier.padding(start = 16.dp, end = 16.dp, top = 10.dp))
                    Row(Modifier.padding(horizontal = 16.dp, vertical = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("Semua", "Masuk", "Keluar").forEach { f -> FilterPill(f, filter == f, { filter = f }) }
                    }
                }
                when {
                    dash.isLoading && financeData == null -> item { SkeletonList(rows = 6) }
                    tampil.isEmpty() -> item {
                        EmptyView(
                            if (semua.isEmpty()) "Belum ada transaksi" else "Tidak ada yang cocok",
                            if (semua.isEmpty()) "Catat pemasukan & pengeluaran pertamamu." else "Ubah kata kunci atau filter.",
                            Icons.Rounded.ReceiptLong
                        )
                    }
                    else -> perTanggal.entries.sortedByDescending { it.key }.forEach { (tgl, list) ->
                        item(key = "d-$tgl") {
                            val label = when (tgl) {
                                null -> "Tanpa tanggal"
                                hariIni -> "Hari ini"
                                hariIni.minus(1, DateTimeUnit.DAY) -> "Kemarin"
                                else -> "${tgl.dayOfMonth} ${namaBulanPendek(tgl.monthNumber)} ${tgl.year}"
                            }
                            val net = list.sumOf { if (isMasuk(it)) it.nominal else -it.nominal }
                            Row(Modifier.fillMaxWidth().padding(start = 20.dp, end = 20.dp, top = 12.dp, bottom = 2.dp)) {
                                Text(label, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
                                Text((if (net >= 0) "+" else "") + net.rupiahRingkas(), style = MaterialTheme.typography.labelLarge, color = if (net >= 0) BizgrowColors.Success else BizgrowColors.Danger)
                            }
                        }
                        itemsIndexed(list, key = { _, t -> t.id }) { i, t ->
                            val masukT = isMasuk(t)
                            val warna = if (masukT) BizgrowColors.Success else BizgrowColors.Danger
                            ListRow(
                                title = t.keterangan.ifBlank { if (masukT) "Pemasukan" else "Pengeluaran" },
                                subtitle = (t.metodeLabel ?: t.metodeBayar).takeIf { it.isNotBlank() && it.toIntOrNull() == null }?.let { "via $it" } ?: if (masukT) "Pemasukan" else "Pengeluaran",
                                icon = if (masukT) Icons.Rounded.SouthWest else Icons.Rounded.NorthEast,
                                tint = warna,
                                modifier = Modifier.padding(horizontal = 16.dp).animateItem().enterAnimation(i),
                                trailing = {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text((if (masukT) "+" else "-") + t.nominal.rupiahRingkas().removePrefix("-"), style = MaterialTheme.typography.titleSmall, color = warna)
                                        IconButton(onClick = { hapus = t }, modifier = Modifier.size(34.dp)) {
                                            Icon(Icons.Rounded.MoreVert, "Opsi", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
                                        }
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }
    }

    hapus?.let { t ->
        AlertDialog(
            onDismissRequest = { hapus = null },
            shape = RoundedCornerShape(24.dp),
            containerColor = MaterialTheme.colorScheme.surface,
            icon = { IconBadge(Icons.Rounded.DeleteOutline, BizgrowColors.Danger) },
            title = { Text("Hapus transaksi?") },
            text = { Text("\"${t.keterangan}\" (${t.nominal.rupiah()}) akan dihapus beserta jurnalnya.") },
            confirmButton = { TextButton(onClick = { viewModel.deleteTransaction(t.id); hapus = null }) { Text("Hapus", color = BizgrowColors.Danger, fontWeight = FontWeight.Bold) } },
            dismissButton = { TextButton(onClick = { hapus = null }) { Text("Batal") } }
        )
    }
}
