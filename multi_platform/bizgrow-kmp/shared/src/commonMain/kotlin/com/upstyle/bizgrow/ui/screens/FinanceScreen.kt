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
import com.upstyle.bizgrow.data.RiwayatFilter
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.ModuleCatalog
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors
import kotlinx.datetime.*

private fun isMasuk(t: Transaction) = t.kategoriTrx.uppercase() in setOf("MASUK", "PEMASUKAN")

private fun tglWib() = Clock.System.now().toLocalDateTime(TimeZone.of("Asia/Jakarta")).date

/** Rentang tanggal (WIB) untuk pilihan periode riwayat; null,null = semua. */
private fun rentangRiwayat(periode: String, bulan: Pair<Int, Int>?, kustom: Pair<String, String>?): Pair<String?, String?> {
    val hari = tglWib()
    return when (periode) {
        "Hari ini" -> hari.toString() to hari.toString()
        "Kemarin" -> hari.minus(1, DateTimeUnit.DAY).let { it.toString() to it.toString() }
        "7 hari" -> hari.minus(6, DateTimeUnit.DAY).toString() to hari.toString()
        "Bulan ini" -> LocalDate(hari.year, hari.monthNumber, 1).toString() to hari.toString()
        "Bulan" -> bulan?.let { (y, m) ->
            val awal = LocalDate(y, m, 1)
            awal.toString() to awal.plus(1, DateTimeUnit.MONTH).minus(1, DateTimeUnit.DAY).toString()
        } ?: (null to null)
        "Rentang" -> kustom?.let { it.first to it.second } ?: (null to null)
        else -> null to null
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FinanceScreen(viewModel: AppViewModel) {
    val uriHandler = androidx.compose.ui.platform.LocalUriHandler.current
    val financeData by viewModel.riwayat.collectAsState(initial = viewModel.riwayat.value)
    val memuat by viewModel.riwayatMemuat.collectAsState()
    var query by remember { mutableStateOf("") }
    var filter by remember { mutableStateOf("Semua") }
    var hapus by remember { mutableStateOf<Transaction?>(null) }
    var periode by remember { mutableStateOf("Semua") }
    var bulanDipilih by remember { mutableStateOf<Pair<Int, Int>?>(null) }
    var kustom by remember { mutableStateOf<Pair<String, String>?>(null) }
    var dialogRentang by remember { mutableStateOf(false) }
    var abcId by remember { mutableStateOf(0) }
    var urutan by remember { mutableStateOf("Terbaru") }
    var detail by remember { mutableStateOf<Transaction?>(null) }
    var menuBulan by remember { mutableStateOf(false) }
    var menuUrut by remember { mutableStateOf(false) }

    val hariIni = remember { tglWib() }
    val rentang = rentangRiwayat(periode, bulanDipilih, kustom)
    val filterServer = RiwayatFilter(
        start = rentang.first, end = rentang.second,
        jenis = when (filter) { "Masuk" -> "masuk"; "Keluar" -> "keluar"; else -> "" },
        q = query.trim(), abcId = abcId,
        urut = when (urutan) { "Terlama" -> "terlama"; "Nominal ↓" -> "nominal_desc"; "Nominal ↑" -> "nominal_asc"; else -> "terbaru" }
    )
    // Filter diproses server (data lengkap, bukan hanya 100 terbaru); kata kunci diberi jeda ketik
    LaunchedEffect(filterServer) {
        if (filterServer.q.isNotEmpty()) kotlinx.coroutines.delay(350)
        viewModel.loadFinanceData(filterServer)
    }

    val tampil = financeData?.transactions.orEmpty()
    val semuaMentah = tampil
    val ringkas = financeData?.summary
    val masuk = ringkas?.totalMasuk ?: 0.0
    val keluar = ringkas?.totalKeluar ?: 0.0
    val perTanggal = remember(tampil) { tampil.groupBy { tanggalTransaksi(it.tanggal) } }
    val semuaFilterAktif = periode != "Semua" || filter != "Semua" || query.isNotBlank() || abcId != 0
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
        PullToRefreshBox(memuat, { viewModel.loadFinanceData(filterServer) }, Modifier.fillMaxSize().padding(padding)) {
            LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 96.dp)) {
                item {
                    GradientCard(Modifier.padding(horizontal = 16.dp).fillMaxWidth().enterAnimation(0)) {
                        Column {
                            Text(if (!semuaFilterAktif) "Selisih kas" else "Selisih kas (terfilter)", style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.8f))
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
                                    Text("${tampil.size}" + if (financeData?.adaLagi == true) "+" else "", style = MaterialTheme.typography.titleMedium, color = Color.White)
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
                        FilterPill(kustom?.let { "${it.first.takeLast(5)} → ${it.second.takeLast(5)}" } ?: "Rentang tanggal", periode == "Rentang", { dialogRentang = true })
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
                    val abcOpsi = financeData?.abcOptions.orEmpty()
                    if (abcOpsi.isNotEmpty()) {
                        Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp).padding(bottom = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            FilterPill("Semua kategori", abcId == 0, { abcId = 0 })
                            abcOpsi.forEach { a -> FilterPill("[${a.level}] ${a.nama}", abcId == a.id, { abcId = if (abcId == a.id) 0 else a.id }) }
                        }
                    }
                    if (semuaFilterAktif) {
                        Text(
                            "Reset filter", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 16.dp).clip(RoundedCornerShape(8.dp)).pressClick { periode = "Semua"; filter = "Semua"; query = ""; bulanDipilih = null; kustom = null; abcId = 0 }.padding(4.dp)
                        )
                    }
                }
                when {
                    memuat && financeData == null -> item { SkeletonList(rows = 6) }
                    tampil.isEmpty() -> item {
                        EmptyView(
                            if (semuaMentah.isEmpty()) "Belum ada transaksi" else "Tidak ada transaksi ditemukan",
                            if (semuaMentah.isEmpty()) "Catat pemasukan & pengeluaran pertamamu." else "Coba ubah filter, periode, atau kata kunci pencarian.",
                            Icons.Rounded.ReceiptLong
                        )
                    }
                    else -> (if (urutan == "Terlama") perTanggal.entries.sortedBy { it.key } else if (urutan.startsWith("Nominal")) perTanggal.entries.toList() else perTanggal.entries.sortedByDescending { it.key }).forEach { (tgl, list) ->
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
                                subtitle = listOfNotNull(
                                    ((t.metodeLabel ?: t.metodeBayar).takeIf { it.isNotBlank() && it.toIntOrNull() == null }?.let { "via ${labelMetodeBayar(it)}" } ?: if (masukT) "Pemasukan" else "Pengeluaran"),
                                    t.abcNama?.let { "[${t.abcLevel ?: "C"}] $it" }
                                ).joinToString(" • "),
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
                if (financeData?.adaLagi == true) {
                    item(key = "muat-lagi") {
                        LaunchedEffect(tampil.size) { viewModel.muatRiwayatLagi() }
                        Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                            if (memuat) CircularProgressIndicator(Modifier.size(24.dp), strokeWidth = 2.dp)
                            else TextButton(onClick = { viewModel.muatRiwayatLagi() }) { Text("Muat transaksi lebih lama") }
                        }
                    }
                }
            }
        }
    }

    if (dialogRentang) {
        var dari by remember { mutableStateOf(kustom?.first ?: hariIni.minus(6, DateTimeUnit.DAY).toString()) }
        var sampai by remember { mutableStateOf(kustom?.second ?: hariIni.toString()) }
        AlertDialog(
            onDismissRequest = { dialogRentang = false },
            shape = RoundedCornerShape(24.dp),
            containerColor = MaterialTheme.colorScheme.surface,
            title = { Text("Rentang tanggal") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    TanggalField("Dari", dari) { dari = it }
                    TanggalField("Sampai", sampai) { sampai = it }
                    if (dari > sampai) Text("Tanggal awal harus sebelum tanggal akhir", style = MaterialTheme.typography.bodySmall, color = BizgrowColors.Danger)
                }
            },
            confirmButton = {
                TextButton(enabled = dari <= sampai, onClick = { kustom = dari to sampai; periode = "Rentang"; dialogRentang = false }) { Text("Terapkan", fontWeight = FontWeight.Bold) }
            },
            dismissButton = { TextButton(onClick = { dialogRentang = false }) { Text("Batal") } }
        )
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
                t.abcNama?.let { BarisDetail("Kategori ABC", "[${t.abcLevel ?: "C"}] $it") }
                if (!t.productId.isNullOrBlank()) BarisDetail("Produk", "${t.productId} × ${t.qty}")
                if (t.hppTotal > 0) BarisDetail("HPP", t.hppTotal.rupiah())
                t.saldoSetelah?.let { BarisDetail("Saldo setelah transaksi", it.rupiah()) }
                BarisDetail("ID transaksi", "#${t.id}")
                Spacer(Modifier.height(14.dp))
                BizOutlineButton("Invoice (cetak / simpan PDF)", onClick = { viewModel.bukaDokumen("invoice", t.id.toString(), type = "manual") { uriHandler.openUri(it) } }, modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.Receipt)
                Spacer(Modifier.height(8.dp))
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


/** "TUNAI"/"QRIS"/"TRANSFER" dari kasir → teks rapi; nama akun ("Kas Tunai") dibiarkan apa adanya. */
internal fun labelMetodeBayar(m: String): String = when (m.trim().uppercase()) {
    "TUNAI", "CASH", "KAS" -> "Tunai"
    "QRIS" -> "QRIS"
    "TRANSFER", "BANK", "BANK_TRANSFER" -> "Transfer bank"
    "DEBIT", "KARTU", "CARD", "EDC" -> "Kartu debit"
    "EWALLET", "E-WALLET", "EMONEY" -> "E-wallet"
    else -> m
}
