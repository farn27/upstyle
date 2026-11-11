package com.upstyle.bizgrow.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.runtime.snapshots.SnapshotStateList
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.data.ChartOfAccount
import com.upstyle.bizgrow.data.CreateJournalLineBody
import com.upstyle.bizgrow.data.JournalEntry
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors
import kotlinx.coroutines.launch
import kotlinx.datetime.*

private fun hariIniJurnal() = Clock.System.now().toLocalDateTime(TimeZone.of("Asia/Jakarta")).date

private val namaBulanPanjang = listOf("Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember")

private fun tglJurnal(raw: String): String {
    val d = runCatching { LocalDate.parse(raw.take(10)) }.getOrNull() ?: return raw
    return "${d.dayOfMonth} ${namaBulanPendek(d.monthNumber)} ${d.year}"
}

/** Jurnal Umum (double-entry): filter bulan/tahun, rincian akun, jurnal manual — setara halaman web. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JurnalUmumScreen(viewModel: AppViewModel) {
    val entri by viewModel.journalEntries.collectAsState(initial = viewModel.journalEntries.value)
    val hari = remember { hariIniJurnal() }
    var tahun by remember { mutableStateOf(hari.year) }
    var bulan by remember { mutableStateOf<Int?>(hari.monthNumber) } // null = semua bulan
    var buat by remember { mutableStateOf(false) }
    var memuat by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun muat() { scope.launch { memuat = true; viewModel.loadJournalEntries(tahun, bulan?.toString()).join(); memuat = false } }
    LaunchedEffect(tahun, bulan) { muat() }
    LaunchedEffect(Unit) { viewModel.loadChartOfAccounts() }

    val totalDebit = entri.sumOf { it.totalDebit }
    val totalKredit = entri.sumOf { it.totalKredit }

    BizScreen(
        title = "Jurnal umum",
        subtitle = "Pencatatan ganda (double-entry)",
        onBack = { viewModel.navigateBack() },
        floatingActionButton = { FabTambah("Jurnal manual") { buat = true } }
    ) { padding ->
        PullToRefreshBox(memuat, { muat() }, Modifier.fillMaxSize().padding(padding)) {
            LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 96.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                item {
                    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterPill("Semua bulan", bulan == null, { bulan = null })
                        namaBulanPanjang.forEachIndexed { i, n -> FilterPill(n, bulan == i + 1, { bulan = i + 1 }) }
                    }
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        (0..2).map { hari.year - it }.forEach { th -> FilterPill("$th", tahun == th, { tahun = th }) }
                    }
                }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        StatTile("Jurnal", "${entri.size}", Icons.Rounded.MenuBook, BizgrowColors.Primary, Modifier.weight(1f))
                        StatTile("Total debit", totalDebit.rupiahRingkas(), Icons.Rounded.ArrowDownward, BizgrowColors.Success, Modifier.weight(1f))
                        StatTile("Total kredit", totalKredit.rupiahRingkas(), Icons.Rounded.ArrowUpward, BizgrowColors.Danger, Modifier.weight(1f))
                    }
                }
                if (entri.isEmpty()) {
                    item {
                        if (memuat) SkeletonList(rows = 4)
                        else EmptyView("Belum ada jurnal", "Transaksi penjualan, pengeluaran, atau jurnal manual akan tercatat otomatis di sini.", Icons.Rounded.MenuBook)
                    }
                }
                itemsIndexed(entri, key = { _, e -> e.id }) { i, e -> KartuJurnal(e, Modifier.enterAnimation(i)) }
            }
        }
    }

    if (buat) {
        JurnalManualSheet(viewModel, { buat = false })
    }
}

@Composable
private fun KartuJurnal(e: JournalEntry, modifier: Modifier = Modifier) {
    var buka by remember { mutableStateOf(false) }
    val seimbang = kotlin.math.abs(e.totalDebit - e.totalKredit) < 0.01
    BizSurface(modifier.fillMaxWidth(), onClick = { buka = !buka }, contentPadding = PaddingValues(14.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(e.nomorJurnal, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.width(8.dp))
                    StatusChip(e.sourceType.replace("_", " "), if (e.sourceType == "MANUAL") BizgrowColors.Violet else BizgrowColors.Info)
                }
                Text(tglJurnal(e.tanggal) + (e.referensi?.takeIf { it.isNotBlank() }?.let { " • Ref $it" } ?: ""), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (!e.memo.isNullOrBlank()) Text(e.memo, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 2.dp))
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(e.totalDebit.rupiahRingkas(), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                if (!seimbang) StatusChip("Tidak seimbang", BizgrowColors.Danger)
            }
        }
        AnimatedVisibility(buka) {
            Column(Modifier.padding(top = 10.dp)) {
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                Spacer(Modifier.height(6.dp))
                e.lines.forEach { l ->
                    val debit = l.debit > 0
                    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.Top) {
                        Column(Modifier.weight(1f).padding(start = if (debit) 0.dp else 16.dp)) {
                            Text(l.account?.let { "${it.kodeAkun} • ${it.namaAkun}" } ?: "Akun #${l.coaId}", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                            l.keterangan?.takeIf { it.isNotBlank() && it != e.memo }?.let { Text(it, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                        }
                        Text(
                            (if (debit) "Db " else "Kr ") + (if (debit) l.debit else l.kredit).rupiah(),
                            style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold,
                            color = if (debit) BizgrowColors.Success else BizgrowColors.Danger
                        )
                    }
                }
            }
        }
    }
}

private class BarisJurnal(coaId: Int? = null, debit: String = "", kredit: String = "", ket: String = "") {
    var coaId by mutableStateOf(coaId)
    var debit by mutableStateOf(debit)
    var kredit by mutableStateOf(kredit)
    var ket by mutableStateOf(ket)
}

/** Form jurnal manual: minimal 2 baris, total debit harus sama dengan total kredit. */
@Composable
private fun JurnalManualSheet(viewModel: AppViewModel, onDismiss: () -> Unit) {
    val akun by viewModel.chartOfAccounts.collectAsState(initial = viewModel.chartOfAccounts.value)
    var tanggal by remember { mutableStateOf(hariIniJurnal().toString()) }
    var referensi by remember { mutableStateOf("") }
    var memo by remember { mutableStateOf("") }
    val baris: SnapshotStateList<BarisJurnal> = remember { mutableStateListOf(BarisJurnal(), BarisJurnal()) }
    var galat by remember { mutableStateOf<String?>(null) }
    var proses by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val totalDebit = baris.sumOf { it.debit.toDoubleOrNull() ?: 0.0 }
    val totalKredit = baris.sumOf { it.kredit.toDoubleOrNull() ?: 0.0 }
    val seimbang = totalDebit > 0 && kotlin.math.abs(totalDebit - totalKredit) < 0.01
    val lengkap = baris.count { it.coaId != null && ((it.debit.toDoubleOrNull() ?: 0.0) > 0 || (it.kredit.toDoubleOrNull() ?: 0.0) > 0) } >= 2
    val aktif = akun.filter { it.isActive == 1 }

    FormSheet(
        judul = "Buat jurnal manual",
        subjudul = "Setiap baris isi debit ATAU kredit; total keduanya harus seimbang",
        onDismiss = onDismiss,
        simpanAktif = memo.isNotBlank() && seimbang && lengkap && !proses,
        labelSimpan = if (proses) "Menyimpan…" else "Simpan jurnal",
        onSimpan = {
            proses = true; galat = null
            scope.launch {
                val lines = baris.filter { it.coaId != null }.map {
                    CreateJournalLineBody(it.coaId!!, it.ket.ifBlank { null }, it.debit.toDoubleOrNull() ?: 0.0, it.kredit.toDoubleOrNull() ?: 0.0)
                }.filter { it.debit > 0 || it.kredit > 0 }
                val err = viewModel.simpanJurnalManual(tanggal, memo.trim(), referensi.trim().ifBlank { null }, lines)
                proses = false
                if (err == null) onDismiss() else galat = err
            }
        }
    ) {
        TanggalField("Tanggal transaksi *", tanggal) { tanggal = it }
        BizTextField(referensi, { referensi = it }, "No. referensi (opsional)", leadingIcon = Icons.Rounded.Tag, placeholder = "mis. INV-2025-001")
        BizTextField(memo, { memo = it }, "Deskripsi / memo *", leadingIcon = Icons.Rounded.Notes, placeholder = "Keterangan transaksi…")
        Text("Rincian akun", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
        baris.forEachIndexed { i, b ->
            BizSurface(Modifier.fillMaxWidth(), contentPadding = PaddingValues(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Baris ${i + 1}", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
                    if (baris.size > 2) BizIconButton(Icons.Rounded.Close, "Hapus baris") { baris.removeAt(i) }
                }
                PilihanField("Akun", aktif.map { it.id.toString() to "${it.kodeAkun} • ${it.namaAkun}" }, b.coaId?.toString(), { b.coaId = it.toIntOrNull() }, placeholder = "Pilih akun…")
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Box(Modifier.weight(1f)) { AngkaField(b.debit, { b.debit = it; if (it.isNotBlank()) b.kredit = "" }, "Debit (Rp)", placeholder = "0") }
                    Box(Modifier.weight(1f)) { AngkaField(b.kredit, { b.kredit = it; if (it.isNotBlank()) b.debit = "" }, "Kredit (Rp)", placeholder = "0") }
                }
            }
        }
        TextButton(onClick = { baris.add(BarisJurnal()) }) {
            Icon(Icons.Rounded.Add, null); Spacer(Modifier.width(6.dp)); Text("Tambah baris")
        }
        val selisih = totalDebit - totalKredit
        BizSurface(Modifier.fillMaxWidth(), contentPadding = PaddingValues(12.dp)) {
            Row {
                Column(Modifier.weight(1f)) {
                    Text("Total debit", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(totalDebit.rupiah(), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                }
                Column(Modifier.weight(1f)) {
                    Text("Total kredit", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(totalKredit.rupiah(), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                }
            }
            Spacer(Modifier.height(6.dp))
            Text(
                if (seimbang) "✓ Seimbang" else if (totalDebit == 0.0 && totalKredit == 0.0) "Isi nominal debit & kredit" else "Selisih ${kotlin.math.abs(selisih).rupiah()} — belum seimbang",
                style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold,
                color = if (seimbang) BizgrowColors.Success else BizgrowColors.Warning
            )
        }
        galat?.let { Text(it, color = BizgrowColors.Danger, style = MaterialTheme.typography.bodySmall) }
    }
}
