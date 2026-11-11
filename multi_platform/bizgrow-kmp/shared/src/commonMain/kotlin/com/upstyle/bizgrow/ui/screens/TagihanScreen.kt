package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors
import kotlinx.datetime.*

/** Satu bentuk tampilan untuk piutang (invoice) dan hutang (faktur). */
private data class Tagihan(
    val id: Int, val nomor: String, val kontak: String, val tanggal: String, val jatuhTempo: String,
    val nominal: Double, val dibayar: Double, val status: String, val keterangan: String?, val berjurnal: Boolean
) {
    val sisa get() = (nominal - dibayar).coerceAtLeast(0.0)
    val lunas get() = status == "LUNAS" || sisa <= 0.0
}

private fun hariIniTagihan() = Clock.System.now().toLocalDateTime(TimeZone.of("Asia/Jakarta")).date
private fun tglTagihan(raw: String): LocalDate? = runCatching { LocalDate.parse(raw.take(10)) }.getOrNull()
private fun fmtTgl(raw: String): String = tglTagihan(raw)?.let { "${it.dayOfMonth} ${namaBulanPendek(it.monthNumber)} ${it.year}" } ?: raw

/** Hari keterlambatan (>0) bila belum lunas dan lewat jatuh tempo. */
private fun terlambat(t: Tagihan, hari: LocalDate): Int {
    if (t.lunas) return 0
    val jt = tglTagihan(t.jatuhTempo) ?: return 0
    return if (jt < hari) jt.daysUntil(hari) else 0
}

@Composable fun PiutangScreen(viewModel: AppViewModel) = TagihanScreen(viewModel, hutang = false)
@Composable fun HutangScreen(viewModel: AppViewModel) = TagihanScreen(viewModel, hutang = true)

/** Piutang usaha (tagihan ke pelanggan) dan hutang usaha (tagihan dari pemasok): daftar, jatuh tempo, bayar, buat baru. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TagihanScreen(viewModel: AppViewModel, hutang: Boolean) {
    val piutang by viewModel.receivables.collectAsState(initial = viewModel.receivables.value)
    val daftarHutang by viewModel.payables.collectAsState(initial = viewModel.payables.value)
    val kontak by viewModel.accountingContacts.collectAsState(initial = viewModel.accountingContacts.value)
    val kasAkun by viewModel.kasAccounts.collectAsState()
    val state by viewModel.financeArApState.collectAsState()
    val hari = remember { hariIniTagihan() }

    val semua = remember(piutang, daftarHutang, hutang) {
        if (hutang) daftarHutang.map { Tagihan(it.id, it.nomorFaktur, it.contact?.namaKontak ?: "Pemasok", it.tanggal, it.jatuhTempo, it.nominal, it.sudahDibayar, it.status, it.keterangan, it.journalId != null) }
        else piutang.map { Tagihan(it.id, it.nomorInvoice, it.contact?.namaKontak ?: "Pelanggan", it.tanggal, it.jatuhTempo, it.nominal, it.sudahDibayar, it.status, it.keterangan, it.journalId != null) }
    }
    val judul = if (hutang) "Hutang usaha" else "Piutang usaha"
    val warna = if (hutang) BizgrowColors.Danger else BizgrowColors.Success

    var cari by remember { mutableStateOf("") }
    var filter by remember { mutableStateOf("Semua") }
    var dibuka by remember { mutableStateOf<Tagihan?>(null) }
    var buat by remember { mutableStateOf(false) }

    fun muat() { if (hutang) viewModel.loadPayables() else viewModel.loadReceivables() }
    LaunchedEffect(hutang) { viewModel.loadCoa(); muat(); viewModel.loadAccountingContacts() }

    val belumLunas = semua.filter { !it.lunas }
    val totalSisa = belumLunas.sumOf { it.sisa }
    val jumlahTerlambat = belumLunas.count { terlambat(it, hari) > 0 }
    val nilaiTerlambat = belumLunas.filter { terlambat(it, hari) > 0 }.sumOf { it.sisa }

    val tampil = remember(semua, cari, filter) {
        semua.filter { t ->
            (cari.isBlank() || t.nomor.contains(cari, true) || t.kontak.contains(cari, true)) &&
                when (filter) {
                    "Belum bayar" -> t.status == "BELUM_BAYAR"
                    "Sebagian" -> t.status == "SEBAGIAN"
                    "Lunas" -> t.lunas
                    "Jatuh tempo" -> terlambat(t, hari) > 0
                    else -> true
                }
        }.sortedWith(compareBy<Tagihan> { it.lunas }.thenBy { it.jatuhTempo })
    }

    BizScreen(
        title = judul,
        subtitle = if (hutang) "Tagihan dari pemasok (Account Payables)" else "Tagihan ke pelanggan (Account Receivables)",
        onBack = { viewModel.navigateBack() },
        floatingActionButton = { FabTambah(if (hutang) "Hutang baru" else "Piutang baru") { buat = true } }
    ) { padding ->
        PullToRefreshBox(state.isLoading, { muat() }, Modifier.fillMaxSize().padding(padding)) {
            LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 96.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                item {
                    GradientCard(Modifier.fillMaxWidth(), colors = if (hutang) BizgrowColors.GradDanger else BizgrowColors.GradSuccess) {
                        Column {
                            Text(if (hutang) "Total hutang belum dibayar" else "Total piutang belum diterima", style = MaterialTheme.typography.bodyMedium, color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.85f))
                            AnimatedAmount(totalSisa, MaterialTheme.typography.headlineLarge, androidx.compose.ui.graphics.Color.White)
                            Spacer(Modifier.height(8.dp))
                            Text(
                                "${belumLunas.size} tagihan aktif" + if (jumlahTerlambat > 0) " • $jumlahTerlambat jatuh tempo (${nilaiTerlambat.rupiahRingkas()})" else "",
                                style = MaterialTheme.typography.labelMedium, color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.9f)
                            )
                        }
                    }
                }
                item {
                    BizSearchField(cari, { cari = it }, if (hutang) "Cari nomor faktur / pemasok" else "Cari nomor invoice / pelanggan")
                    Spacer(Modifier.height(8.dp))
                    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("Semua", "Belum bayar", "Sebagian", "Jatuh tempo", "Lunas").forEach { FilterPill(it, filter == it, { filter = it }) }
                    }
                }
                if (tampil.isEmpty()) {
                    item {
                        EmptyView(
                            if (semua.isEmpty()) (if (hutang) "Belum ada hutang" else "Belum ada piutang") else "Tidak ada yang cocok",
                            if (semua.isEmpty()) "Catat tagihan ${if (hutang) "dari pemasok" else "ke pelanggan"} agar jatuh tempo dan pembayarannya terpantau." else "Ubah filter atau kata kunci.",
                            Icons.Rounded.RequestQuote,
                            actionLabel = if (semua.isEmpty()) "Buat tagihan" else null, onAction = { buat = true }
                        )
                    }
                }
                itemsIndexed(tampil, key = { _, t -> t.id }) { i, t -> BarisTagihan(t, hari, warna, Modifier.enterAnimation(i)) { dibuka = t } }
            }
        }
    }

    dibuka?.let { t ->
        BayarTagihanSheet(t, hutang, kasAkun, hari, { dibuka = null }) { nominal, kas ->
            if (hutang) viewModel.payPayable(t.id, nominal, kas) else viewModel.payReceivable(t.id, nominal, kas)
            dibuka = null
        }
    }

    if (buat) {
        BuatTagihanSheet(hutang, kontak.filter { it.isActive == 1 && (if (hutang) it.tipeKontak != "customer" else it.tipeKontak != "supplier") }, hari, { buat = false }, { viewModel.navigate(Screen.AccountingContacts) }) { kontakId, nomor, tgl, jt, nominal, ket ->
            if (hutang) viewModel.createPayable(kontakId, nomor, tgl, jt, nominal, ket) else viewModel.createReceivable(kontakId, tgl, jt, nominal, ket)
            buat = false
        }
    }
}

@Composable
private fun BarisTagihan(t: Tagihan, hari: LocalDate, warnaDasar: androidx.compose.ui.graphics.Color, modifier: Modifier, onClick: () -> Unit) {
    val telat = terlambat(t, hari)
    val warnaStatus = when { t.lunas -> BizgrowColors.Success; telat > 0 -> BizgrowColors.Danger; t.status == "SEBAGIAN" -> BizgrowColors.Info; else -> BizgrowColors.Warning }
    val labelStatus = when { t.lunas -> "Lunas"; telat > 0 -> "Terlambat $telat hr"; t.status == "SEBAGIAN" -> "Sebagian"; else -> "Belum bayar" }
    BizSurface(modifier.fillMaxWidth(), onClick = onClick, contentPadding = PaddingValues(14.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(t.nomor, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                Text(t.kontak, style = MaterialTheme.typography.bodyMedium)
                Text("Jatuh tempo ${fmtTgl(t.jatuhTempo)}", style = MaterialTheme.typography.labelSmall, color = if (telat > 0) BizgrowColors.Danger else MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(if (t.lunas) t.nominal.rupiahRingkas() else t.sisa.rupiahRingkas(), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = if (t.lunas) MaterialTheme.colorScheme.onSurface else warnaDasar)
                if (!t.lunas && t.dibayar > 0) Text("dari ${t.nominal.rupiahRingkas()}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(4.dp))
                StatusChip(labelStatus, warnaStatus)
            }
        }
        if (!t.lunas && t.dibayar > 0) {
            Spacer(Modifier.height(8.dp))
            LinearProgressIndicator(progress = { (t.dibayar / t.nominal).toFloat().coerceIn(0f, 1f) }, modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(50)), color = warnaStatus, trackColor = warnaStatus.copy(alpha = 0.15f))
        }
    }
}

@Composable
private fun BayarTagihanSheet(t: Tagihan, hutang: Boolean, kasAkun: List<com.upstyle.bizgrow.data.ChartOfAccount>, hari: LocalDate, onDismiss: () -> Unit, onBayar: (Double, Int?) -> Unit) {
    var nominal by remember { mutableStateOf(t.sisa.toLong().toString()) }
    var kas by remember { mutableStateOf<String?>(null) }
    val angka = nominal.toDoubleOrNull() ?: 0.0
    val telat = terlambat(t, hari)
    FormSheet(
        judul = t.nomor,
        subjudul = t.kontak,
        onDismiss = onDismiss,
        labelSimpan = if (hutang) "Bayar hutang" else "Terima pembayaran",
        simpanAktif = !t.lunas && angka > 0 && angka <= t.sisa + 0.5,
        onSimpan = { onBayar(angka, kas?.toIntOrNull()) }
    ) {
        BizSurface(Modifier.fillMaxWidth(), contentPadding = PaddingValues(12.dp)) {
            BarisInfo("Tanggal tagihan", fmtTgl(t.tanggal))
            BarisInfo("Jatuh tempo", fmtTgl(t.jatuhTempo) + if (telat > 0) "  ($telat hari lewat)" else "")
            BarisInfo("Total tagihan", t.nominal.rupiah())
            BarisInfo("Sudah dibayar", t.dibayar.rupiah())
            BarisInfo("Sisa", t.sisa.rupiah(), tebal = true)
            if (!t.keterangan.isNullOrBlank()) BarisInfo("Keterangan", t.keterangan)
            if (!t.berjurnal) Text("Tagihan ini belum berjurnal — pembayaran dicatat sebagai kas tanpa jurnal piutang/hutang.", style = MaterialTheme.typography.labelSmall, color = BizgrowColors.Warning, modifier = Modifier.padding(top = 6.dp))
        }
        if (t.lunas) {
            Text("✓ Tagihan sudah lunas", color = BizgrowColors.Success, fontWeight = FontWeight.Bold)
        } else {
            AngkaField(nominal, { nominal = it }, "Nominal pembayaran (Rp)", supporting = if (angka > t.sisa + 0.5) "Melebihi sisa tagihan" else null, desimal = false)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterPill("Lunasi", angka == t.sisa, { nominal = t.sisa.toLong().toString() })
                FilterPill("Setengah", false, { nominal = (t.sisa / 2).toLong().toString() })
            }
            PilihanField(if (hutang) "Dibayar dari akun kas/bank" else "Diterima ke akun kas/bank", kasAkun.map { it.id.toString() to "${it.kodeAkun} • ${it.namaAkun}" }, kas, { kas = it }, placeholder = "Otomatis (kas utama)")
        }
    }
}

@Composable
private fun BarisInfo(label: String, nilai: String, tebal: Boolean = false) {
    Row(Modifier.fillMaxWidth().padding(vertical = 3.dp)) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(0.45f))
        Text(nilai, style = MaterialTheme.typography.bodyMedium, fontWeight = if (tebal) FontWeight.Bold else FontWeight.SemiBold, modifier = Modifier.weight(0.55f))
    }
}

@Composable
private fun BuatTagihanSheet(
    hutang: Boolean, kontak: List<com.upstyle.bizgrow.data.AccountingContact>, hari: LocalDate, onDismiss: () -> Unit, onKelolaKontak: () -> Unit,
    onSimpan: (kontakId: Int, nomor: String?, tanggal: String, jatuhTempo: String, nominal: Double, keterangan: String?) -> Unit
) {
    var kontakId by remember { mutableStateOf<Int?>(null) }
    var nomor by remember { mutableStateOf("") }
    var tanggal by remember { mutableStateOf(hari.toString()) }
    var jatuhTempo by remember { mutableStateOf(hari.plus(30, DateTimeUnit.DAY).toString()) }
    var nominal by remember { mutableStateOf("") }
    var ket by remember { mutableStateOf("") }
    val angka = nominal.toDoubleOrNull() ?: 0.0

    FormSheet(
        judul = if (hutang) "Hutang baru" else "Piutang baru",
        subjudul = if (hutang) "Faktur dari pemasok yang belum dibayar" else "Tagihan ke pelanggan yang belum dibayar",
        onDismiss = onDismiss,
        simpanAktif = kontakId != null && angka > 0 && jatuhTempo >= tanggal,
        onSimpan = { onSimpan(kontakId!!, nomor.trim().ifBlank { null }, tanggal, jatuhTempo, angka, ket.trim().ifBlank { null }) }
    ) {
        if (kontak.isEmpty()) {
            BizSurface(Modifier.fillMaxWidth(), onClick = { onDismiss(); onKelolaKontak() }, contentPadding = PaddingValues(12.dp)) {
                Text(if (hutang) "Belum ada kontak pemasok" else "Belum ada kontak pelanggan", fontWeight = FontWeight.Bold)
                Text("Ketuk untuk menambah kontak akuntansi terlebih dahulu.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        PilihanField(if (hutang) "Pemasok *" else "Pelanggan *", kontak.map { it.id.toString() to it.namaKontak }, kontakId?.toString(), {
            kontakId = it.toIntOrNull()
            // jatuh tempo mengikuti termin kontak
            kontak.firstOrNull { k -> k.id == kontakId }?.let { k -> jatuhTempo = tanggalDari(tanggal).plus(k.termPembayaran.coerceAtLeast(0), DateTimeUnit.DAY).toString() }
        }, placeholder = "Pilih kontak…")
        if (hutang) BizTextField(nomor, { nomor = it }, "Nomor faktur (opsional)", leadingIcon = Icons.Rounded.Tag)
        TanggalField("Tanggal *", tanggal) { tanggal = it; if (jatuhTempo < it) jatuhTempo = it }
        TanggalField("Jatuh tempo *", jatuhTempo) { jatuhTempo = it }
        AngkaField(nominal, { nominal = it }, "Nominal (Rp) *", desimal = false)
        BizTextField(ket, { ket = it }, "Keterangan (opsional)", leadingIcon = Icons.Rounded.Notes)
    }
}

private fun tanggalDari(s: String): LocalDate = runCatching { LocalDate.parse(s) }.getOrDefault(hariIniTagihan())
