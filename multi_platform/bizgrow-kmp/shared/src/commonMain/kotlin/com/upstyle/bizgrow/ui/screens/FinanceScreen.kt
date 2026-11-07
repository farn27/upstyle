package com.upstyle.bizgrow.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.draw.clip
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
    val financeData by viewModel.riwayat.collectAsState(initial = viewModel.riwayat.value)
    val dash by viewModel.dashboardState.collectAsState(initial = viewModel.dashboardState.value)
    var query by remember { mutableStateOf("") }
    var filter by remember { mutableStateOf("Semua") }
    var hapus by remember { mutableStateOf<Transaction?>(null) }
    var periode by remember { mutableStateOf("Semua") }
    var bulanDipilih by remember { mutableStateOf<Pair<Int, Int>?>(null) }
    var urutan by remember { mutableStateOf("Terbaru") }
    var detail by remember { mutableStateOf<Transaction?>(null) }
    var menuBulan by remember { mutableStateOf(false) }
    var menuUrut by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { viewModel.loadFinanceData() }

    val semuaMentah = financeData?.transactions.orEmpty()
    val hariIni = remember { Clock.System.now().toLocalDateTime(TimeZone.currentSystemDefault()).date }
    val kemarin = hariIni.minus(1, DateTimeUnit.DAY)
    // Saldo setelah tiap transaksi: mundur dari saldo kas sepanjang waktu (daftar urut terbaru → terlama)
    val saldoSetelah = remember(semuaMentah, financeData) {
        var saldo = financeData?.summary?.saldoKas
        val peta = mutableMapOf<Int, Double>()
        if (saldo != null) semuaMentah.forEach { t -> peta[t.id] = saldo!!; saldo = saldo!! - (if (isMasuk(t)) t.nominal else -t.nominal) }
        peta
    }
    val tampil = remember(semuaMentah, query, filter, periode, bulanDipilih, urutan) {
        semuaMentah.filter { t ->
            val tgl = tanggalTransaksi(t.tanggal)
            (query.isBlank() || t.keterangan.contains(query, true)) &&
                when (filter) { "Masuk" -> isMasuk(t); "Keluar" -> !isMasuk(t); else -> true } &&
                when (periode) {
                    "Hari ini" -> tgl == hariIni
                    "Kemarin" -> tgl == kemarin
                    "7 hari" -> tgl != null && tgl >= hariIni.minus(6, DateTimeUnit.DAY) && tgl <= hariIni
                    "Bulan ini" -> tgl != null && tgl.year == hariIni.year && tgl.monthNumber == hariIni.monthNumber
                    "Bulan" -> bulanDipilih?.let { (y, m) -> tgl != null && tgl.year == y && tgl.monthNumber == m } ?: true
                    else -> true
                }
        }.let { daftar ->
            when (urutan) {
                "Terlama" -> daftar.sortedBy { it.id }
                "Nominal ↓" -> daftar.sortedByDescending { it.nominal }
                "Nominal ↑" -> daftar.sortedBy { it.nominal }
                else -> daftar
            }
        }
    }
    val semua = tampil
    val masuk = semua.filter(::isMasuk).sumOf { it.nominal }
    val keluar = semua.filterNot(::isMasuk).sumOf { it.nominal }
    val perTanggal = remember(tampil) { tampil.groupBy { tanggalTransaksi(it.tanggal) } }
    val modulKeuangan = ModuleCatalog.first { it.title == "Keuangan" }.modules.filter { it.screen != Screen.Finance && it.screen != Screen.TransactionEntry }

    BizScreen(
        "Keuangan",
        subtitle = "Arus kas & pembukuan",
        onBack = { viewModel.navigateBack() },
        actions = {
            BizIconButton(Icons.Rounded.FileDownload, "Ekspor") { viewModel.navigate(Screen.ExportImport) }
            Spacer(Modifier.width(8.dp))
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
                            Text(if (periode == "Semua" && filter == "Semua" && query.isBlank()) "Selisih kas" else "Selisih kas (terfilter)", style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.8f))
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
                    Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp).padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("Semua", "Hari ini", "Kemarin", "7 hari", "Bulan ini").forEach { p -> FilterPill(p, periode == p, { periode = p }) }
                        Box {
                            FilterPill(
                                bulanDipilih?.let { (y, m) -> "${namaBulanPendek(m)} $y" } ?: "Pilih bulan",
                                periode == "Bulan", { menuBulan = true }
                            )
                            DropdownMenu(expanded = menuBulan, onDismissRequest = { menuBulan = false }) {
                                (0..11).map { hariIni.minus(it, DateTimeUnit.MONTH) }.forEach { d ->
                                    DropdownMenuItem(
                                        text = { Text("${namaBulanPendek(d.monthNumber)} ${d.year}") },
                                        onClick = { bulanDipilih = d.year to d.monthNumber; periode = "Bulan"; menuBulan = false }
                                    )
                                }
                            }
                        }
                    }
                    Row(Modifier.padding(horizontal = 16.dp, vertical = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        listOf("Semua", "Masuk", "Keluar").forEach { f -> FilterPill(f, filter == f, { filter = f }) }
                        Spacer(Modifier.weight(1f))
                        Box {
                            Row(
                                Modifier.clip(RoundedCornerShape(50)).pressClick { menuUrut = true }.padding(horizontal = 10.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Rounded.SwapVert, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(4.dp))
                                Text(urutan, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            DropdownMenu(expanded = menuUrut, onDismissRequest = { menuUrut = false }) {
                                listOf("Terbaru", "Terlama", "Nominal ↓", "Nominal ↑").forEach { u ->
                                    DropdownMenuItem(text = { Text(u) }, onClick = { urutan = u; menuUrut = false })
                                }
                            }
                        }
                    }
                    if (periode != "Semua" || filter != "Semua" || query.isNotBlank()) {
                        Text(
                            "Reset filter", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 16.dp).clip(RoundedCornerShape(8.dp)).pressClick { periode = "Semua"; filter = "Semua"; query = ""; bulanDipilih = null }.padding(4.dp)
                        )
                    }
                }
                when {
                    dash.isLoading && financeData == null -> item { SkeletonList(rows = 6) }
                    tampil.isEmpty() -> item {
                        EmptyView(
                            if (semuaMentah.isEmpty()) "Belum ada transaksi" else "Tidak ada transaksi ditemukan",
                            if (semuaMentah.isEmpty()) "Catat pemasukan & pengeluaran pertamamu." else "Coba ubah filter, periode, atau kata kunci pencarian.",
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
                                onClick = { detail = t },
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

    detail?.let { t ->
        val masukT = isMasuk(t)
        val warna = if (masukT) BizgrowColors.Success else BizgrowColors.Danger
        ModalBottomSheet(onDismissRequest = { detail = null }, containerColor = MaterialTheme.colorScheme.surface) {
            Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 28.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconBadge(if (masukT) Icons.Rounded.SouthWest else Icons.Rounded.NorthEast, warna)
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(if (masukT) "Pemasukan" else "Pengeluaran", style = MaterialTheme.typography.labelMedium, color = warna, fontWeight = FontWeight.Bold)
                        Text((if (masukT) "+" else "-") + t.nominal.rupiah(), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = warna)
                    }
                }
                Spacer(Modifier.height(14.dp))
                val tgl = tanggalTransaksi(t.tanggal)
                BarisDetail("Keterangan lengkap", t.keterangan.ifBlank { "-" })
                BarisDetail("Tanggal", tgl?.let { "${it.dayOfMonth} ${namaBulanPendek(it.monthNumber)} ${it.year}" } ?: "-")
                BarisDetail("Metode bayar", (t.metodeLabel ?: t.metodeBayar).takeIf { it.isNotBlank() && it.toIntOrNull() == null } ?: "Kas")
                t.abcCategoryId?.let { BarisDetail("Kategori ABC", "#$it") }
                if (!t.productId.isNullOrBlank()) BarisDetail("Produk", "${t.productId} × ${t.qty}")
                if (t.hppTotal > 0) BarisDetail("HPP", t.hppTotal.rupiah())
                saldoSetelah[t.id]?.let { BarisDetail("Saldo setelah transaksi", it.rupiah()) }
                BarisDetail("ID transaksi", "#${t.id}")
                Spacer(Modifier.height(14.dp))
                BizOutlineButton("Hapus transaksi", onClick = { hapus = t; detail = null }, modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.DeleteOutline, tint = BizgrowColors.Danger)
            }
        }
    }
}

@Composable
private fun BarisDetail(label: String, nilai: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.Top) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(0.45f))
        Text(nilai, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(0.55f))
    }
    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
}
