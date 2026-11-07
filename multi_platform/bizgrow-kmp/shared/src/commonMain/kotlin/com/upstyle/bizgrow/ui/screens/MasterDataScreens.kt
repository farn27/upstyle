package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.data.*
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors
import kotlinx.datetime.*

// Master data akuntansi (padanan web: master-data/{pajak,aset,budget,coa,tutup-buku}) — daftar + tambah/ubah/hapus.

private fun hariIniWib() = Clock.System.now().toLocalDateTime(TimeZone.of("Asia/Jakarta")).date

// ═══════════════════════════════════════════════════════════════════════════
//  Pajak
// ═══════════════════════════════════════════════════════════════════════════

private val tipePajak = listOf("PPN" to "PPN", "PPH" to "PPh", "LAINNYA" to "Lainnya")

@Composable
fun TaxRatesScreen(viewModel: AppViewModel) {
    val daftar by viewModel.taxRates.collectAsState()
    var edit by remember { mutableStateOf<TaxRate?>(null) }
    var tambah by remember { mutableStateOf(false) }
    var hapus by remember { mutableStateOf<TaxRate?>(null) }
    LaunchedEffect(Unit) { viewModel.loadTaxRates() }

    BizScreen(
        "Pengaturan Pajak", subtitle = "Tarif PPN, PPh, dan lainnya", onBack = { viewModel.navigateBack() },
        floatingActionButton = { FabTambah("Tarif baru") { tambah = true } }
    ) { padding ->
        if (daftar.isEmpty()) {
            EmptyView("Belum ada tarif pajak", "Tambahkan tarif seperti PPN 11% agar bisa dipakai di transaksi dan faktur.", Icons.Rounded.Percent, "Tambah tarif", { tambah = true }, Modifier.padding(padding))
        } else LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(16.dp, 8.dp, 16.dp, 96.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            itemsIndexed(daftar, key = { _, t -> t.id }) { i, t ->
                BizSurface(Modifier.fillMaxWidth().enterAnimation(i), onClick = { edit = t }, contentPadding = PaddingValues(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconBadge(Icons.Rounded.Percent, BizgrowColors.Violet)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(t.namaPajak, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 4.dp)) {
                                StatusChip(tipePajak.firstOrNull { it.first == t.tipe }?.second ?: t.tipe, BizgrowColors.Info)
                                if (t.isDefault == 1) StatusChip("Default", BizgrowColors.Success)
                                if (t.isActive != 1) StatusChip("Nonaktif", BizgrowColors.Warning)
                            }
                        }
                        Text("${t.persentase.toString().removeSuffix(".0")}%", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = BizgrowColors.Violet)
                    }
                }
            }
        }
    }

    if (tambah || edit != null) {
        val awal = edit
        var nama by remember(awal) { mutableStateOf(awal?.namaPajak ?: "") }
        var persen by remember(awal) { mutableStateOf(awal?.persentase?.toString()?.removeSuffix(".0") ?: "") }
        var tipe by remember(awal) { mutableStateOf(awal?.tipe ?: "PPN") }
        var default by remember(awal) { mutableStateOf((awal?.isDefault ?: 0) == 1) }
        var aktif by remember(awal) { mutableStateOf((awal?.isActive ?: 1) == 1) }
        val persenAngka = persen.toDoubleOrNull()
        FormSheet(
            if (awal == null) "Tarif pajak baru" else "Ubah tarif pajak", onDismiss = { tambah = false; edit = null },
            simpanAktif = nama.isNotBlank() && persenAngka != null && persenAngka in 0.0..100.0,
            onHapus = awal?.let { { hapus = it; edit = null } },
            onSimpan = {
                val t = TaxRate(awal?.id ?: 0, 0, nama.trim(), persenAngka ?: 0.0, tipe, if (default) 1 else 0, if (aktif) 1 else 0)
                if (awal == null) viewModel.createTaxRate(t) else viewModel.updateTaxRate(t)
                tambah = false; edit = null
            }
        ) {
            BizTextField(nama, { nama = it }, "Nama pajak", placeholder = "Misal: PPN 11%")
            AngkaField(persen, { persen = it }, "Persentase (%)", placeholder = "11", supporting = "0 – 100")
            PilihanPil("Jenis pajak", tipePajak, tipe) { tipe = it }
            SwitchBaris("Jadikan default", "Dipakai otomatis saat membuat transaksi/faktur", default) { default = it }
            if (awal != null) SwitchBaris("Aktif digunakan", null, aktif) { aktif = it }
        }
    }
    hapus?.let { t ->
        KonfirmasiHapus("Hapus tarif pajak?", "\"${t.namaPajak}\" akan dihapus.", { viewModel.deleteTaxRate(t.id); hapus = null }, { hapus = null })
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Aset tetap
// ═══════════════════════════════════════════════════════════════════════════

private val kategoriAset = listOf("KENDARAAN" to "Kendaraan", "BANGUNAN" to "Bangunan", "MESIN" to "Mesin & Alat", "INVENTARIS" to "Inventaris Kantor", "TANAH" to "Tanah", "LAINNYA" to "Lainnya")
private val metodeAset = listOf("GARIS_LURUS" to "Garis Lurus", "SALDO_MENURUN" to "Saldo Menurun")
private val statusAset = listOf("AKTIF" to "Aktif", "DIJUAL" to "Dijual / Dilepas", "DINONAKTIFKAN" to "Dinonaktifkan")

@Composable
fun FixedAssetsScreen(viewModel: AppViewModel) {
    val daftar by viewModel.fixedAssets.collectAsState()
    var edit by remember { mutableStateOf<FixedAsset?>(null) }
    var tambah by remember { mutableStateOf(false) }
    var hapus by remember { mutableStateOf<FixedAsset?>(null) }
    LaunchedEffect(Unit) { viewModel.loadFixedAssets() }

    BizScreen(
        "Aset Tetap", subtitle = "Pencatatan & penyusutan aset", onBack = { viewModel.navigateBack() },
        floatingActionButton = { FabTambah("Aset baru") { tambah = true } }
    ) { padding ->
        if (daftar.isEmpty()) {
            EmptyView("Belum ada aset tetap", "Catat kendaraan, mesin, atau peralatan usaha agar penyusutannya terhitung.", Icons.Rounded.Domain, "Tambah aset", { tambah = true }, Modifier.padding(padding))
        } else LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(16.dp, 4.dp, 16.dp, 96.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(bottom = 4.dp)) {
                    StatTile("Total perolehan", daftar.sumOf { it.nilaiPerolehan }.rupiahRingkas(), Icons.Rounded.Domain, BizgrowColors.Primary, Modifier.weight(1f))
                    StatTile("Nilai buku", daftar.sumOf { it.nilaiBuku }.rupiahRingkas(), Icons.Rounded.AccountBalance, BizgrowColors.Success, Modifier.weight(1f))
                }
            }
            itemsIndexed(daftar, key = { _, a -> a.id }) { i, a ->
                val persenSusut = if (a.nilaiPerolehan > 0) (a.akumulasiPenyusutan / a.nilaiPerolehan).toFloat().coerceIn(0f, 1f) else 0f
                BizSurface(Modifier.fillMaxWidth().enterAnimation(i), onClick = { edit = a }, contentPadding = PaddingValues(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(a.namaAset, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Text("${kategoriAset.firstOrNull { it.first == a.kategori }?.second ?: a.kategori} • ${a.umurEkonomis} thn • ${a.tanggalPerolehan.take(10)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        StatusChip(statusAset.firstOrNull { it.first == a.status }?.second ?: a.status, if (a.status == "AKTIF") BizgrowColors.Success else BizgrowColors.Warning)
                    }
                    Spacer(Modifier.height(10.dp))
                    Row {
                        Column(Modifier.weight(1f)) {
                            Text("Perolehan", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(a.nilaiPerolehan.rupiah(), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                        }
                        Column(Modifier.weight(1f)) {
                            Text("Nilai buku", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(a.nilaiBuku.rupiah(), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = BizgrowColors.Success)
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                    Box(Modifier.fillMaxWidth().height(6.dp).clip(CircleShape).background(MaterialTheme.colorScheme.outlineVariant)) {
                        Box(Modifier.fillMaxWidth(persenSusut).fillMaxHeight().clip(CircleShape).background(BizgrowColors.Warning))
                    }
                    Text("Penyusutan ${(persenSusut * 100).toInt()}% • akumulasi ${a.akumulasiPenyusutan.rupiahRingkas()}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
                }
            }
        }
    }

    if (tambah || edit != null) {
        val awal = edit
        var nama by remember(awal) { mutableStateOf(awal?.namaAset ?: "") }
        var kategori by remember(awal) { mutableStateOf(awal?.kategori ?: "INVENTARIS") }
        var nilai by remember(awal) { mutableStateOf(awal?.nilaiPerolehan?.toLong()?.toString() ?: "") }
        var tanggal by remember(awal) { mutableStateOf(awal?.tanggalPerolehan?.take(10) ?: hariIniWib().toString()) }
        var umur by remember(awal) { mutableStateOf(awal?.umurEkonomis?.toString() ?: "") }
        var metode by remember(awal) { mutableStateOf(awal?.metodePenyusutan ?: "GARIS_LURUS") }
        var sisa by remember(awal) { mutableStateOf(awal?.nilaiSisa?.toLong()?.toString() ?: "0") }
        var status by remember(awal) { mutableStateOf(awal?.status ?: "AKTIF") }
        var ket by remember(awal) { mutableStateOf(awal?.keterangan ?: "") }
        val nilaiAngka = nilai.toDoubleOrNull() ?: 0.0
        val sisaAngka = sisa.toDoubleOrNull() ?: 0.0
        val umurAngka = umur.toIntOrNull() ?: 0
        FormSheet(
            if (awal == null) "Aset tetap baru" else "Ubah aset tetap", onDismiss = { tambah = false; edit = null },
            simpanAktif = nama.isNotBlank() && nilaiAngka > 0 && umurAngka > 0 && sisaAngka <= nilaiAngka,
            onHapus = awal?.let { { hapus = it; edit = null } },
            onSimpan = {
                val a = FixedAsset(awal?.id ?: 0, 0, nama.trim(), kategori, nilaiAngka, tanggal, umurAngka, metode, sisaAngka, status = status, keterangan = ket.ifBlank { null })
                if (awal == null) viewModel.createFixedAsset(a) else viewModel.updateFixedAsset(a)
                tambah = false; edit = null
            }
        ) {
            BizTextField(nama, { nama = it }, "Nama aset", placeholder = "Misal: Motor operasional")
            PilihanField("Kategori", kategoriAset, kategori, { kategori = it })
            AngkaField(nilai, { nilai = it }, "Nilai perolehan (Rp)", desimal = false)
            TanggalField("Tanggal perolehan", tanggal) { tanggal = it }
            AngkaField(umur, { umur = it }, "Umur ekonomis (tahun)", desimal = false)
            PilihanPil("Metode penyusutan", metodeAset, metode) { metode = it }
            AngkaField(sisa, { sisa = it }, "Nilai sisa / residu (Rp)", desimal = false, supporting = if (sisaAngka > nilaiAngka) "Tidak boleh melebihi nilai perolehan" else null)
            if (awal != null) PilihanPil("Status", statusAset, status) { status = it }
            BizTextField(ket, { ket = it }, "Keterangan (opsional)", singleLine = false)
        }
    }
    hapus?.let { a ->
        KonfirmasiHapus("Hapus aset tetap?", "\"${a.namaAset}\" akan dihapus.", { viewModel.deleteFixedAsset(a.id); hapus = null }, { hapus = null })
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Anggaran (budget)
// ═══════════════════════════════════════════════════════════════════════════

private val namaBulanAng = listOf("Tahunan", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember")

@Composable
fun BudgetScreen(viewModel: AppViewModel) {
    val items by viewModel.budgetItems.collectAsState()
    val coa by viewModel.chartOfAccounts.collectAsState()
    var tahun by remember { mutableIntStateOf(hariIniWib().year) }
    var tambah by remember { mutableStateOf(false) }
    var hapus by remember { mutableStateOf<BudgetItem?>(null) }
    LaunchedEffect(tahun) { viewModel.loadBudgetItems(tahun); viewModel.loadCoa() }
    val namaAkun = remember(coa) { coa.associate { it.id to "${it.kodeAkun} · ${it.namaAkun}" } }

    BizScreen(
        "Anggaran", subtitle = "Batas pengeluaran per akun • $tahun", onBack = { viewModel.navigateBack() },
        floatingActionButton = { FabTambah("Anggaran baru") { tambah = true } }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            Row(Modifier.padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                (0..2).map { hariIniWib().year - 1 + it }.forEach { y -> FilterPill(y.toString(), tahun == y, { tahun = y }) }
            }
            if (items.isEmpty()) {
                EmptyView("Belum ada anggaran", "Tetapkan batas anggaran per akun agar pengeluaran terkontrol.", Icons.Rounded.Savings, "Tambah anggaran", { tambah = true })
            } else LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp, 4.dp, 16.dp, 96.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                item {
                    StatTile("Total anggaran $tahun", items.sumOf { it.nominal }.rupiah(), Icons.Rounded.Savings, BizgrowColors.Primary, Modifier.fillMaxWidth(), caption = "${items.size} pos anggaran")
                }
                itemsIndexed(items, key = { _, b -> b.id }) { i, b ->
                    BizSurface(Modifier.fillMaxWidth().enterAnimation(i), onClick = { hapus = b }, contentPadding = PaddingValues(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(namaAkun[b.coaId] ?: "Akun #${b.coaId}", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, maxLines = 2)
                                Text(namaBulanAng.getOrElse(b.bulan) { "Tahunan" } + (b.keterangan?.takeIf { it.isNotBlank() }?.let { " • $it" } ?: ""), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Text(b.nominal.rupiahRingkas(), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = BizgrowColors.Primary)
                        }
                    }
                }
            }
        }
    }

    if (tambah) {
        var coaId by remember { mutableStateOf<String?>(null) }
        var bulan by remember { mutableStateOf("0") }
        var nominal by remember { mutableStateOf("") }
        var ket by remember { mutableStateOf("") }
        FormSheet(
            "Anggaran baru", onDismiss = { tambah = false },
            simpanAktif = coaId != null && (nominal.toDoubleOrNull() ?: 0.0) > 0,
            onSimpan = {
                viewModel.createBudgetItem(BudgetItem(0, 0, coaId!!.toInt(), tahun, bulan.toInt(), nominal.toDouble(), ket.ifBlank { null }))
                tambah = false
            }
        ) {
            PilihanField("Akun (COA)", coa.filter { it.isActive == 1 }.map { it.id.toString() to "${it.kodeAkun} · ${it.namaAkun}" }, coaId, { coaId = it })
            PilihanField("Periode", namaBulanAng.mapIndexed { i, n -> i.toString() to n }, bulan, { bulan = it })
            AngkaField(nominal, { nominal = it }, "Nominal anggaran (Rp)", desimal = false)
            BizTextField(ket, { ket = it }, "Keterangan (opsional)", placeholder = "Misal: Limit iklan Meta bulanan")
        }
    }
    hapus?.let { b ->
        KonfirmasiHapus("Hapus anggaran?", "${namaAkun[b.coaId] ?: "Anggaran"} • ${b.nominal.rupiah()} akan dihapus.", { viewModel.deleteBudgetItem(b.id, b.tahun); hapus = null }, { hapus = null })
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Chart of Accounts
// ═══════════════════════════════════════════════════════════════════════════

private val tipeCoa = listOf(
    "ASET_LANCAR" to "Aset Lancar", "ASET_TETAP" to "Aset Tetap", "LIABILITAS_LANCAR" to "Liabilitas Lancar",
    "LIABILITAS_JANGKA_PANJANG" to "Liabilitas Jangka Panjang", "EKUITAS" to "Ekuitas", "PENDAPATAN" to "Pendapatan",
    "HPP" to "HPP", "BEBAN_OPERASIONAL" to "Beban Operasional", "BEBAN_LAINNYA" to "Beban Lainnya", "PENDAPATAN_LAINNYA" to "Pendapatan Lainnya"
)
private fun normalDari(tipe: String) = if (tipe in setOf("ASET_LANCAR", "ASET_TETAP", "HPP", "BEBAN_OPERASIONAL", "BEBAN_LAINNYA")) "DEBIT" else "KREDIT"
private val templateCoa = listOf(
    "LAINNYA" to "Umum / Lainnya", "MINIMARKET" to "Minimarket / Toko", "GROSIR" to "Grosir / Distributor",
    "RESTORAN" to "Restoran", "CAFE" to "Kafe / Kopi"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CoaScreen(viewModel: AppViewModel) {
    val daftar by viewModel.chartOfAccounts.collectAsState()
    var edit by remember { mutableStateOf<ChartOfAccount?>(null) }
    var tambah by remember { mutableStateOf(false) }
    var template by remember { mutableStateOf(false) }
    var hapus by remember { mutableStateOf<ChartOfAccount?>(null) }
    var cari by remember { mutableStateOf("") }
    LaunchedEffect(Unit) { viewModel.loadCoa() }
    val tampil = daftar.filter { cari.isBlank() || it.namaAkun.contains(cari, true) || it.kodeAkun.contains(cari, true) }
    val perTipe = tampil.groupBy { it.tipeAkun }

    BizScreen(
        "Chart of Accounts", subtitle = "${daftar.size} akun • double-entry", onBack = { viewModel.navigateBack() },
        actions = { if (daftar.isNotEmpty()) { BizIconButton(Icons.Rounded.AutoFixHigh, "Template") { template = true }; Spacer(Modifier.width(8.dp)) } },
        floatingActionButton = { FabTambah("Akun baru") { tambah = true } }
    ) { padding ->
        if (daftar.isEmpty()) {
            Column(Modifier.fillMaxSize().padding(padding).padding(24.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
                IconBadge(Icons.Rounded.AccountTree, BizgrowColors.Primary, size = 64.dp, iconSize = 32.dp)
                Spacer(Modifier.height(14.dp))
                Text("COA belum ada", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text("Chart of Accounts diperlukan untuk mencatat transaksi dengan jurnal otomatis. Pakai template sesuai jenis usahamu atau buat manual.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                Spacer(Modifier.height(18.dp))
                BizButton("Pakai template standar", onClick = { template = true }, modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.AutoFixHigh)
                Spacer(Modifier.height(10.dp))
                BizOutlineButton("Buat akun manual", onClick = { tambah = true }, modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.Add)
            }
        } else LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(16.dp, 0.dp, 16.dp, 96.dp)) {
            item { BizSearchField(cari, { cari = it }, "Cari kode atau nama akun", Modifier.padding(bottom = 8.dp)) }
            tipeCoa.forEach { (kode, label) ->
                val akun = perTipe[kode].orEmpty()
                if (akun.isNotEmpty()) {
                    item(key = "h-$kode") { Text(label.uppercase(), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Black, color = BizgrowColors.Primary, modifier = Modifier.padding(top = 14.dp, bottom = 4.dp)) }
                    itemsIndexed(akun, key = { _, a -> a.id }) { i, a ->
                        ListRow(
                            a.namaAkun, Modifier.enterAnimation(i), subtitle = "${a.kodeAkun} • normal ${if (a.normalBalance == "DEBIT") "debit" else "kredit"}",
                            trailing = { if (a.isActive != 1) StatusChip("Nonaktif", BizgrowColors.Warning) }, onClick = { edit = a }, showChevron = true
                        )
                    }
                }
            }
        }
    }

    if (tambah || edit != null) {
        val awal = edit
        var kode by remember(awal) { mutableStateOf(awal?.kodeAkun ?: "") }
        var nama by remember(awal) { mutableStateOf(awal?.namaAkun ?: "") }
        var tipe by remember(awal) { mutableStateOf(awal?.tipeAkun ?: "ASET_LANCAR") }
        var desk by remember(awal) { mutableStateOf(awal?.deskripsi ?: "") }
        var aktif by remember(awal) { mutableStateOf((awal?.isActive ?: 1) == 1) }
        FormSheet(
            if (awal == null) "Akun COA baru" else "Ubah akun COA",
            subjudul = if (awal != null) "Kode & jenis akun tidak bisa diubah agar jurnal lama tetap konsisten." else null,
            onDismiss = { tambah = false; edit = null },
            simpanAktif = nama.isNotBlank() && (awal != null || kode.isNotBlank()),
            onHapus = awal?.let { { hapus = it; edit = null } }, 
            onSimpan = {
                if (awal == null) viewModel.createCoa(kode.trim(), nama.trim(), tipe, normalDari(tipe), desk.ifBlank { null })
                else viewModel.updateCoa(awal.id, nama.trim(), desk.ifBlank { null }, aktif)
                tambah = false; edit = null
            }
        ) {
            BizTextField(kode, { kode = it }, "Kode akun", placeholder = "1-1001", enabled = awal == null)
            BizTextField(nama, { nama = it }, "Nama akun", placeholder = "Kas Kecil")
            PilihanField("Jenis akun", tipeCoa, tipe, { tipe = it }, enabled = awal == null)
            Text("Saldo normal: ${if (normalDari(tipe) == "DEBIT") "Debit" else "Kredit"}", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            BizTextField(desk, { desk = it }, "Deskripsi (opsional)", placeholder = "Tulis catatan…", singleLine = false)
            if (awal != null) SwitchBaris("Akun aktif", "Akun nonaktif tidak muncul di pilihan transaksi", aktif) { aktif = it }
        }
    }
    if (template) {
        var jenis by remember { mutableStateOf("LAINNYA") }
        FormSheet(
            "Template COA standar", subjudul = "Pilih jenis usaha. Template hanya bisa dipakai bila unit belum punya akun.",
            onDismiss = { template = false }, labelSimpan = "Buat akun standar",
            onSimpan = { viewModel.seedDefaultCoa(jenis); template = false }
        ) { PilihanPil("Jenis usaha", templateCoa, jenis) { jenis = it } }
    }
    hapus?.let { a ->
        KonfirmasiHapus("Nonaktifkan akun?", "\"${a.kodeAkun} · ${a.namaAkun}\" tidak akan muncul lagi di pilihan transaksi (riwayat jurnal tetap aman).", { viewModel.deleteCoa(a.id); hapus = null }, { hapus = null })
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Tutup buku
// ═══════════════════════════════════════════════════════════════════════════

@Composable
fun ClosingPeriodScreen(viewModel: AppViewModel) {
    val daftar by viewModel.closingPeriods.collectAsState()
    var kunci by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { viewModel.loadClosingPeriods() }

    BizScreen(
        "Tutup Buku", subtitle = "Kunci periode pembukuan", onBack = { viewModel.navigateBack() },
        floatingActionButton = { FabTambah("Kunci periode") { kunci = true } }
    ) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(16.dp, 4.dp, 16.dp, 96.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item {
                Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(BizgrowColors.Info.copy(alpha = 0.10f)).padding(12.dp)) {
                    Icon(Icons.Rounded.Lock, null, tint = BizgrowColors.Info, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(10.dp))
                    Text("Periode yang sudah dikunci tidak dapat lagi diubah transaksinya. Lakukan saat laporan bulan/tahun sudah final dan tidak ada koreksi.", style = MaterialTheme.typography.bodySmall)
                }
            }
            if (daftar.isEmpty()) item { EmptyView("Belum ada periode yang dikunci", "Kunci periode setelah laporan final.", Icons.Rounded.LockOpen) }
            itemsIndexed(daftar, key = { _, p -> p.id }) { i, p ->
                BizSurface(Modifier.fillMaxWidth().enterAnimation(i), contentPadding = PaddingValues(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconBadge(Icons.Rounded.Lock, BizgrowColors.Warning)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text("${p.periodStart.take(10)}  →  ${p.periodEnd.take(10)}", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                            if (!p.keterangan.isNullOrBlank()) Text(p.keterangan, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text(p.labaRugiPeriode.rupiahRingkas(), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = if (p.labaRugiPeriode >= 0) BizgrowColors.Success else BizgrowColors.Danger)
                            Text(if (p.labaRugiPeriode >= 0) "laba" else "rugi", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }

    if (kunci) {
        val hari = remember { hariIniWib() }
        var mulai by remember { mutableStateOf(LocalDate(hari.year, hari.monthNumber, 1).toString()) }
        var akhir by remember { mutableStateOf(hari.toString()) }
        var ket by remember { mutableStateOf("") }
        FormSheet(
            "Kunci periode", subjudul = "Setelah dikunci, transaksi pada rentang ini tidak bisa diubah.",
            onDismiss = { kunci = false }, labelSimpan = "Kunci sekarang", simpanAktif = mulai <= akhir,
            onSimpan = { viewModel.createClosingPeriod(mulai, akhir, ket.ifBlank { null }); kunci = false }
        ) {
            TanggalField("Mulai tanggal", mulai) { mulai = it }
            TanggalField("Sampai tanggal", akhir) { akhir = it }
            BizTextField(ket, { ket = it }, "Catatan (opsional)", placeholder = "Misal: Audit Semester I selesai")
            if (mulai > akhir) Text("Tanggal mulai tidak boleh setelah tanggal akhir", style = MaterialTheme.typography.labelMedium, color = BizgrowColors.Danger)
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Voucher & promo POS
// ═══════════════════════════════════════════════════════════════════════════

private val jenisDiskon = listOf("PERCENTAGE" to "Persentase (%)", "FIXED" to "Nominal (Rp)")

@Composable
fun PosVouchersScreen(viewModel: AppViewModel) {
    val daftar by viewModel.posVouchers.collectAsState()
    var edit by remember { mutableStateOf<PosVoucher?>(null) }
    var tambah by remember { mutableStateOf(false) }
    var hapus by remember { mutableStateOf<PosVoucher?>(null) }
    LaunchedEffect(Unit) { viewModel.loadPosVouchers() }

    BizScreen(
        "Voucher & Promo", subtitle = "Kode diskon untuk kasir", onBack = { viewModel.navigateBack() },
        floatingActionButton = { FabTambah("Voucher baru") { tambah = true } }
    ) { padding ->
        if (daftar.isEmpty()) {
            EmptyView("Belum ada voucher", "Buat kode promo seperti HEMAT10 agar bisa dipakai di kasir.", Icons.Rounded.ConfirmationNumber, "Buat voucher", { tambah = true }, Modifier.padding(padding))
        } else LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(16.dp, 8.dp, 16.dp, 96.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            itemsIndexed(daftar, key = { _, v -> v.id }) { i, v ->
                val nilai = if (v.discountType == "PERCENTAGE") "${v.discountValue.toString().removeSuffix(".0")}%" else v.discountValue.rupiahRingkas()
                BizSurface(Modifier.fillMaxWidth().enterAnimation(i), onClick = { edit = v }, contentPadding = PaddingValues(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconBadge(Icons.Rounded.ConfirmationNumber, if (v.isActive) BizgrowColors.Primary else BizgrowColors.Warning)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(v.code, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                            Text("Berlaku ${v.validFrom.take(10)} → ${v.validUntil.take(10)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(
                                "Dipakai ${v.currentUsage}${if (v.maxUsage > 0) " / ${v.maxUsage}" else " (tanpa batas)"}" + if (v.minPurchase > 0) " • min ${v.minPurchase.rupiahRingkas()}" else "",
                                style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text(nilai, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = BizgrowColors.Primary)
                            StatusChip(if (v.isActive) "Aktif" else "Nonaktif", if (v.isActive) BizgrowColors.Success else BizgrowColors.Warning)
                        }
                    }
                    if (v.maxUsage > 0) {
                        Spacer(Modifier.height(8.dp))
                        Box(Modifier.fillMaxWidth().height(5.dp).clip(CircleShape).background(MaterialTheme.colorScheme.outlineVariant)) {
                            Box(Modifier.fillMaxWidth((v.currentUsage.toFloat() / v.maxUsage).coerceIn(0f, 1f)).fillMaxHeight().clip(CircleShape).background(BizgrowColors.Primary))
                        }
                    }
                }
            }
        }
    }

    if (tambah || edit != null) {
        val awal = edit
        val hari = remember { hariIniWib() }
        var kode by remember(awal) { mutableStateOf(awal?.code ?: "") }
        var jenis by remember(awal) { mutableStateOf(awal?.discountType ?: "PERCENTAGE") }
        var nilai by remember(awal) { mutableStateOf(awal?.discountValue?.let { if (it % 1.0 == 0.0) it.toLong().toString() else it.toString() } ?: "") }
        var kuota by remember(awal) { mutableStateOf(awal?.maxUsage?.toString() ?: "0") }
        var minBeli by remember(awal) { mutableStateOf(awal?.minPurchase?.toLong()?.toString() ?: "0") }
        var dari by remember(awal) { mutableStateOf(awal?.validFrom?.take(10) ?: hari.toString()) }
        var sampai by remember(awal) { mutableStateOf(awal?.validUntil?.take(10) ?: hari.plus(30, DateTimeUnit.DAY).toString()) }
        var aktif by remember(awal) { mutableStateOf(awal?.isActive ?: true) }
        val nilaiAngka = nilai.toDoubleOrNull() ?: 0.0
        val sah = (awal != null || kode.trim().length >= 3) && nilaiAngka > 0 && (jenis != "PERCENTAGE" || nilaiAngka <= 100) && dari <= sampai
        FormSheet(
            if (awal == null) "Voucher baru" else "Ubah voucher",
            subjudul = if (awal != null) "Kode voucher tidak bisa diubah." else null,
            onDismiss = { tambah = false; edit = null }, simpanAktif = sah,
            onHapus = awal?.let { { hapus = it; edit = null } },
            onSimpan = {
                val v = PosVoucher(awal?.id ?: 0, 0, kode.trim().uppercase(), jenis, nilaiAngka, kuota.toIntOrNull() ?: 0, awal?.currentUsage ?: 0, minBeli.toDoubleOrNull() ?: 0.0, dari, sampai, aktif)
                if (awal == null) viewModel.createPosVoucher(v) else viewModel.updatePosVoucher(v)
                tambah = false; edit = null
            }
        ) {
            BizTextField(kode, { kode = it.uppercase() }, "Kode voucher", placeholder = "HEMAT10", enabled = awal == null)
            PilihanPil("Jenis diskon", jenisDiskon, jenis) { jenis = it }
            AngkaField(nilai, { nilai = it }, if (jenis == "PERCENTAGE") "Besar diskon (%)" else "Besar diskon (Rp)", supporting = if (jenis == "PERCENTAGE" && nilaiAngka > 100) "Maksimal 100%" else null)
            AngkaField(minBeli, { minBeli = it }, "Minimal pembelian (Rp)", desimal = false)
            AngkaField(kuota, { kuota = it }, "Kuota pemakaian", desimal = false, supporting = "0 = tanpa batas")
            TanggalField("Berlaku dari", dari) { dari = it }
            TanggalField("Berlaku sampai", sampai) { sampai = it }
            if (awal != null) SwitchBaris("Voucher aktif", null, aktif) { aktif = it }
        }
    }
    hapus?.let { v ->
        KonfirmasiHapus("Nonaktifkan voucher?", "Kode ${v.code} tidak bisa dipakai lagi di kasir.", { viewModel.deletePosVoucher(v.id); hapus = null }, { hapus = null })
    }
}
