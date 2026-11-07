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
import kotlinx.coroutines.launch
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
    val rekap by viewModel.rekapPajak.collectAsState()
    var tahun by remember { mutableIntStateOf(hariIniWib().year) }
    var edit by remember { mutableStateOf<TaxRate?>(null) }
    var tambah by remember { mutableStateOf(false) }
    var hapus by remember { mutableStateOf<TaxRate?>(null) }
    LaunchedEffect(tahun) { viewModel.loadTaxRates(); viewModel.loadRekapPajak(tahun) }

    BizScreen(
        "Pajak", subtitle = "Tarif & rekap PPN", onBack = { viewModel.navigateBack() },
        floatingActionButton = { FabTambah("Tarif baru") { tambah = true } }
    ) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(16.dp, 4.dp, 16.dp, 96.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    (0..2).map { hariIniWib().year - it }.reversed().forEach { y -> FilterPill(y.toString(), tahun == y, { tahun = y }) }
                }
            }
            item {
                val r = rekap
                if (r == null) SkeletonBlock(Modifier.fillMaxWidth().height(150.dp)) else {
                    GradientCard(Modifier.fillMaxWidth(), colors = if (r.totalKurangBayar > 0) BizgrowColors.GradWarning else BizgrowColors.GradSuccess) {
                        Column {
                            Text("PPN ${r.tahun} — ${if (r.totalKurangBayar >= 0) "kurang bayar" else "lebih bayar"}", style = MaterialTheme.typography.bodyMedium, color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.85f))
                            Text(kotlin.math.abs(r.totalKurangBayar).rupiah(), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = androidx.compose.ui.graphics.Color.White)
                            Spacer(Modifier.height(10.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                Column(Modifier.weight(1f).clip(RoundedCornerShape(14.dp)).background(androidx.compose.ui.graphics.Color.White.copy(alpha = 0.16f)).padding(10.dp)) {
                                    Text("PPN Keluaran (penjualan)", style = MaterialTheme.typography.labelSmall, color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.85f))
                                    Text(r.totalKeluaran.rupiahRingkas(), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = androidx.compose.ui.graphics.Color.White)
                                }
                                Column(Modifier.weight(1f).clip(RoundedCornerShape(14.dp)).background(androidx.compose.ui.graphics.Color.White.copy(alpha = 0.16f)).padding(10.dp)) {
                                    Text("PPN Masukan (pembelian)", style = MaterialTheme.typography.labelSmall, color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.85f))
                                    Text(r.totalMasukan.rupiahRingkas(), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = androidx.compose.ui.graphics.Color.White)
                                }
                            }
                        }
                    }
                }
            }
            val r = rekap
            if (r != null) {
                if (r.tarifPpn == null) item {
                    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(BizgrowColors.Warning.copy(alpha = 0.12f)).padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Rounded.Info, null, tint = BizgrowColors.WarningDark)
                        Spacer(Modifier.width(10.dp))
                        Text("Belum ada tarif PPN aktif. Tambahkan \"PPN 11%\" di bawah supaya kasir bisa mengenakan PPN pada penjualan.", style = MaterialTheme.typography.bodySmall)
                    }
                }
                val aktifBulan = r.bulan.filter { it.keluaran != 0.0 || it.masukan != 0.0 }
                item { SectionTitle("Rekap per bulan", subtitle = "Setor PPN sebelum lapor SPT Masa (akhir bulan berikutnya)") }
                if (aktifBulan.isEmpty()) item { Text("Belum ada transaksi ber-PPN di tahun ini. Aktifkan \"Kenakan PPN\" saat bayar di kasir.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                itemsIndexed(aktifBulan, key = { _, b -> b.bulan }) { i, b ->
                    BizSurface(Modifier.fillMaxWidth().enterAnimation(i), contentPadding = PaddingValues(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(namaBulanAng.getOrElse(b.bulan) { "" }, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                Text("Keluaran ${b.keluaran.rupiahRingkas()} • Masukan ${b.masukan.rupiahRingkas()}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(kotlin.math.abs(b.kurangBayar).rupiah(), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = if (b.kurangBayar > 0) BizgrowColors.Warning else BizgrowColors.Success)
                                Text(if (b.kurangBayar > 0) "kurang bayar" else if (b.kurangBayar < 0) "lebih bayar" else "nihil", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }
            item { SectionTitle("Tarif pajak", subtitle = "Tarif PPN default dipakai kasir") }
            if (daftar.isEmpty()) item { EmptyView("Belum ada tarif pajak", "Tambahkan tarif seperti PPN 11%.", Icons.Rounded.Percent, "Tambah tarif", { tambah = true }) }
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
    val akunCoa by viewModel.chartOfAccounts.collectAsState()
    var edit by remember { mutableStateOf<FixedAsset?>(null) }
    var tambah by remember { mutableStateOf(false) }
    var hapus by remember { mutableStateOf<FixedAsset?>(null) }
    LaunchedEffect(Unit) { viewModel.loadFixedAssets(); viewModel.loadCoa() }

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
                    Text("Penyusutan ${(persenSusut * 100).toInt()}% • akumulasi ${a.akumulasiPenyusutan.rupiahRingkas()}" + if (a.penyusutanBulanan > 0 && a.status == "AKTIF") " • ${a.penyusutanBulanan.rupiahRingkas()}/bln" else "", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
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
        var coaAset by remember(awal) { mutableStateOf(awal?.coaId?.toString()) }
        val nilaiAngka = nilai.toDoubleOrNull() ?: 0.0
        val sisaAngka = sisa.toDoubleOrNull() ?: 0.0
        val umurAngka = umur.toIntOrNull() ?: 0
        FormSheet(
            if (awal == null) "Aset tetap baru" else "Ubah aset tetap", onDismiss = { tambah = false; edit = null },
            simpanAktif = nama.isNotBlank() && nilaiAngka > 0 && umurAngka > 0 && sisaAngka <= nilaiAngka,
            onHapus = awal?.let { { hapus = it; edit = null } },
            onSimpan = {
                val a = FixedAsset(awal?.id ?: 0, 0, nama.trim(), kategori, nilaiAngka, tanggal, umurAngka, metode, sisaAngka, status = status, keterangan = ket.ifBlank { null }, coaId = coaAset?.toIntOrNull())
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
            PilihanField("Akun aset tetap (COA, opsional)", akunCoa.filter { it.isActive == 1 && it.tipeAkun == "ASET_TETAP" }.map { it.id.toString() to "${it.kodeAkun} • ${it.namaAkun}" }, coaAset, { coaAset = it }, placeholder = "Tidak dihubungkan")
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
    var ubah by remember { mutableStateOf<BudgetItem?>(null) }
    var hapus by remember { mutableStateOf<BudgetItem?>(null) }
    LaunchedEffect(tahun) { viewModel.loadBudgetItems(tahun); viewModel.loadCoa() }
    val namaAkun = remember(coa) { coa.associate { it.id to "${it.kodeAkun} · ${it.namaAkun}" } }
    val totalBelanja = items.filter { !it.pendapatan }.sumOf { it.nominal }
    val realisasiBelanja = items.filter { !it.pendapatan }.sumOf { it.realisasi }
    val melebihi = items.count { it.melebihi }

    BizScreen(
        "Anggaran", subtitle = "Batas & target per akun • $tahun", onBack = { viewModel.navigateBack() },
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
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        StatTile("Anggaran belanja", totalBelanja.rupiahRingkas(), Icons.Rounded.Savings, BizgrowColors.Primary, Modifier.weight(1f), caption = "${items.size} pos")
                        StatTile("Terpakai", realisasiBelanja.rupiahRingkas(), Icons.Rounded.Payments, if (melebihi > 0) BizgrowColors.Danger else BizgrowColors.Success, Modifier.weight(1f), caption = if (melebihi > 0) "$melebihi pos melebihi" else "aman")
                    }
                }
                itemsIndexed(items, key = { _, b -> b.id }) { i, b ->
                    val warna = when { b.pendapatan -> if (b.progress >= 100) BizgrowColors.Success else BizgrowColors.Info; b.melebihi -> BizgrowColors.Danger; b.progress >= 80 -> BizgrowColors.Warning; else -> BizgrowColors.Success }
                    BizSurface(Modifier.fillMaxWidth().enterAnimation(i), onClick = { ubah = b }, contentPadding = PaddingValues(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(namaAkun[b.coaId] ?: b.namaAkun.ifBlank { "Akun #${b.coaId}" }, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, maxLines = 2)
                                Text(namaBulanAng.getOrElse(b.bulan) { "Tahunan" } + (b.keterangan?.takeIf { it.isNotBlank() }?.let { " • $it" } ?: "") + if (b.pendapatan) " • Target pendapatan" else "", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(b.nominal.rupiahRingkas(), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = BizgrowColors.Primary)
                                Text("${b.progress}%", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = warna)
                            }
                        }
                        Spacer(Modifier.height(8.dp))
                        LinearProgressIndicator(progress = { (b.progress / 100f).coerceIn(0f, 1f) }, modifier = Modifier.fillMaxWidth().height(7.dp).clip(RoundedCornerShape(50)), color = warna, trackColor = warna.copy(alpha = 0.15f))
                        Spacer(Modifier.height(6.dp))
                        Text(
                            (if (b.pendapatan) "Tercapai " else "Terpakai ") + b.realisasi.rupiahRingkas() + " • " +
                                if (b.melebihi) "melebihi ${(-b.selisih).rupiahRingkas()}" else if (b.pendapatan) "kurang ${b.selisih.coerceAtLeast(0.0).rupiahRingkas()}" else "sisa ${b.selisih.rupiahRingkas()}",
                            style = MaterialTheme.typography.labelSmall, color = if (b.melebihi) BizgrowColors.Danger else MaterialTheme.colorScheme.onSurfaceVariant
                        )
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
        val sudahAda = coaId != null && items.any { it.coaId == coaId!!.toInt() && it.bulan == bulan.toInt() }
        FormSheet(
            "Anggaran baru", onDismiss = { tambah = false },
            simpanAktif = coaId != null && !sudahAda && (nominal.toDoubleOrNull() ?: 0.0) > 0,
            onSimpan = {
                viewModel.createBudgetItem(BudgetItem(0, 0, coaId!!.toInt(), tahun, bulan.toInt(), nominal.toDouble(), ket.ifBlank { null }))
                tambah = false
            }
        ) {
            PilihanField("Akun (COA)", coa.filter { it.isActive == 1 }.map { it.id.toString() to "${it.kodeAkun} · ${it.namaAkun}" }, coaId, { coaId = it })
            PilihanField("Periode", namaBulanAng.mapIndexed { i, n -> i.toString() to n }, bulan, { bulan = it })
            if (sudahAda) Text("Anggaran akun & periode ini sudah ada — ketuk kartunya untuk mengubah.", style = MaterialTheme.typography.bodySmall, color = BizgrowColors.Danger)
            AngkaField(nominal, { nominal = it }, "Nominal anggaran (Rp)", desimal = false)
            BizTextField(ket, { ket = it }, "Keterangan (opsional)", placeholder = "Misal: Limit iklan Meta bulanan")
        }
    }
    ubah?.let { b ->
        var nominal by remember(b.id) { mutableStateOf(b.nominal.toLong().toString()) }
        var ket by remember(b.id) { mutableStateOf(b.keterangan ?: "") }
        FormSheet(
            "Ubah anggaran", subjudul = "${namaAkun[b.coaId] ?: b.namaAkun} • ${namaBulanAng.getOrElse(b.bulan) { "Tahunan" }}",
            onDismiss = { ubah = null },
            simpanAktif = (nominal.toDoubleOrNull() ?: 0.0) > 0,
            onSimpan = { viewModel.updateBudgetItem(b.id, b.tahun, nominal.toDouble(), ket.ifBlank { null }); ubah = null },
            onHapus = { hapus = b; ubah = null }
        ) {
            Text("Terpakai ${b.realisasi.rupiah()} (${b.progress}%)", style = MaterialTheme.typography.bodyMedium, color = if (b.melebihi) BizgrowColors.Danger else MaterialTheme.colorScheme.onSurfaceVariant)
            AngkaField(nominal, { nominal = it }, "Nominal anggaran (Rp)", desimal = false)
            BizTextField(ket, { ket = it }, "Keterangan (opsional)")
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

private val awalanKode = mapOf(
    "ASET_LANCAR" to "1", "ASET_TETAP" to "1", "LIABILITAS_LANCAR" to "2", "LIABILITAS_JANGKA_PANJANG" to "2", "EKUITAS" to "3",
    "PENDAPATAN" to "4", "HPP" to "5", "BEBAN_OPERASIONAL" to "6", "BEBAN_LAINNYA" to "7", "PENDAPATAN_LAINNYA" to "8"
)

/** Saran kode akun berikutnya untuk sebuah jenis, mis. 1-1003 bila 1-1002 sudah ada. */
private fun sarankanKode(tipe: String, ada: List<ChartOfAccount>): String {
    val awalan = awalanKode[tipe] ?: "1"
    val terbesar = ada.mapNotNull { Regex("^$awalan-(\\d+)$").find(it.kodeAkun)?.groupValues?.get(1)?.toIntOrNull() }.maxOrNull() ?: 1000
    return "$awalan-${terbesar + 1}"
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CoaScreen(viewModel: AppViewModel) {
    val daftar by viewModel.chartOfAccounts.collectAsState()
    val scope = rememberCoroutineScope()
    var edit by remember { mutableStateOf<ChartOfAccount?>(null) }
    var tambah by remember { mutableStateOf(false) }
    var otomatis by remember { mutableStateOf(false) }
    var hapus by remember { mutableStateOf<ChartOfAccount?>(null) }
    var cari by remember { mutableStateOf("") }
    LaunchedEffect(Unit) { viewModel.loadCoa() }
    val tampil = daftar.filter { cari.isBlank() || it.namaAkun.contains(cari, true) || it.kodeAkun.contains(cari, true) }
    val perTipe = tampil.groupBy { it.tipeAkun }

    BizScreen(
        "Chart of Accounts", subtitle = "${daftar.size} akun • double-entry", onBack = { viewModel.navigateBack() },
        actions = { BizIconButton(Icons.Rounded.AutoAwesome, "Buat otomatis") { otomatis = true }; Spacer(Modifier.width(8.dp)) },
        floatingActionButton = { FabTambah("Akun baru") { tambah = true } }
    ) { padding ->
        if (daftar.isEmpty()) {
            Column(Modifier.fillMaxSize().padding(padding).padding(24.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
                AiAvatar(64.dp)
                Spacer(Modifier.height(14.dp))
                Text("COA belum ada", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text("Chart of Accounts dibutuhkan untuk mencatat transaksi dengan jurnal otomatis. Biarkan AI membuatnya sesuai bisnismu, pakai template, atau buat manual.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                Spacer(Modifier.height(18.dp))
                BizButton("Buat otomatis (AI / template)", onClick = { otomatis = true }, modifier = Modifier.fillMaxWidth(), icon = Icons.Rounded.AutoAwesome)
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
        var tipe by remember(awal) { mutableStateOf(awal?.tipeAkun ?: "ASET_LANCAR") }
        var kode by remember(awal) { mutableStateOf(awal?.kodeAkun ?: sarankanKode("ASET_LANCAR", daftar)) }
        var kodeDiubahManual by remember(awal) { mutableStateOf(false) }
        var nama by remember(awal) { mutableStateOf(awal?.namaAkun ?: "") }
        var desk by remember(awal) { mutableStateOf(awal?.deskripsi ?: "") }
        var aktif by remember(awal) { mutableStateOf((awal?.isActive ?: 1) == 1) }
        var galat by remember(awal) { mutableStateOf<String?>(null) }
        var menyimpan by remember(awal) { mutableStateOf(false) }
        val kodeBentrok = awal == null && daftar.any { it.kodeAkun.equals(kode.trim(), true) }
        FormSheet(
            if (awal == null) "Akun COA baru" else "Ubah akun COA",
            subjudul = if (awal != null) "Kode & jenis akun tidak bisa diubah agar jurnal lama tetap konsisten." else "Kode terisi otomatis sesuai jenis akun; boleh kamu ubah.",
            onDismiss = { if (!menyimpan) { tambah = false; edit = null } },
            simpanAktif = nama.isNotBlank() && (awal != null || (kode.isNotBlank() && !kodeBentrok)) && !menyimpan,
            onHapus = awal?.let { { hapus = it; edit = null } },
            onSimpan = {
                galat = null
                if (awal == null) {
                    menyimpan = true
                    scope.launch {
                        val err = viewModel.simpanCoaBaru(kode.trim(), nama.trim(), tipe, normalDari(tipe), desk.ifBlank { null })
                        menyimpan = false
                        if (err == null) { tambah = false } else galat = err
                    }
                } else { viewModel.updateCoa(awal.id, nama.trim(), desk.ifBlank { null }, aktif); edit = null }
            }
        ) {
            PilihanField("Jenis akun", tipeCoa, tipe, { t -> tipe = t; if (awal == null && !kodeDiubahManual) kode = sarankanKode(t, daftar) }, enabled = awal == null)
            BizTextField(kode, { kode = it; kodeDiubahManual = true }, "Kode akun", placeholder = "1-1001", enabled = awal == null, isError = kodeBentrok,
                supportingText = if (kodeBentrok) "Kode ini sudah dipakai akun lain" else null)
            BizTextField(nama, { nama = it }, "Nama akun", placeholder = "Kas Kecil")
            Text("Saldo normal: ${if (normalDari(tipe) == "DEBIT") "Debit" else "Kredit"}", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            BizTextField(desk, { desk = it }, "Deskripsi (opsional)", placeholder = "Tulis catatan…", singleLine = false)
            if (awal != null) SwitchBaris("Akun aktif", "Akun nonaktif tidak muncul di pilihan transaksi", aktif) { aktif = it }
            galat?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = BizgrowColors.Danger, fontWeight = FontWeight.SemiBold) }
        }
    }

    if (otomatis) {
        var mode by remember { mutableStateOf("AI") }
        var uraian by remember { mutableStateOf("") }
        var lengkapi by remember { mutableStateOf(daftar.isNotEmpty()) }
        var jenis by remember { mutableStateOf("LAINNYA") }
        var sibuk by remember { mutableStateOf(false) }
        var galat by remember { mutableStateOf<String?>(null) }
        FormSheet(
            "Buat COA otomatis", subjudul = "AI menyusun akun sesuai bisnismu, atau pakai template standar.",
            onDismiss = { if (!sibuk) otomatis = false },
            labelSimpan = if (sibuk) "Memproses…" else if (mode == "AI") "Buat dengan AI" else "Pakai template",
            simpanAktif = !sibuk && (mode != "AI" || uraian.trim().length >= 3) && (mode == "AI" || daftar.isEmpty()),
            onSimpan = {
                galat = null; sibuk = true
                scope.launch {
                    val err = if (mode == "AI") viewModel.buatCoaAi(uraian.trim(), lengkapi && daftar.isNotEmpty()) else viewModel.buatCoaTemplate(jenis)
                    sibuk = false
                    if (err == null) otomatis = false else galat = err
                }
            }
        ) {
            PilihanPil("Cara", listOf("AI" to "✨ AI sesuai bisnis", "TEMPLATE" to "Template standar"), mode) { mode = it; galat = null }
            if (mode == "AI") {
                BizTextField(uraian, { uraian = it }, "Ceritakan bisnismu", placeholder = "Contoh: toko roti dengan 2 kasir, jual online dan offline", singleLine = false)
                if (daftar.isNotEmpty()) SwitchBaris("Lengkapi COA yang ada", "Hanya menambah akun yang belum ada; akun lama tidak diubah", lengkapi) { lengkapi = it }
                Text("AI membuat sekitar 14–22 akun. Kamu bisa mengubah atau menonaktifkannya setelah itu.", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                if (daftar.isNotEmpty()) Text("Template hanya bisa dipakai bila unit belum punya akun. Gunakan mode AI dengan \"Lengkapi COA yang ada\" untuk menambah akun.", style = MaterialTheme.typography.bodySmall, color = BizgrowColors.WarningDark)
                PilihanPil("Jenis usaha", templateCoa, jenis) { jenis = it }
            }
            if (sibuk) LinearProgressIndicator(Modifier.fillMaxWidth())
            galat?.let { Text(it, style = MaterialTheme.typography.bodyMedium, color = BizgrowColors.Danger, fontWeight = FontWeight.SemiBold) }
        }
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
    var bukaLagi by remember { mutableStateOf<ClosingPeriod?>(null) }
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
                    Text("Transaksi dan jurnal pada periode yang dikunci tidak dapat dihapus atau ditambah mundur. Lakukan saat laporan sudah final; ketuk periode untuk membukanya kembali bila perlu koreksi.", style = MaterialTheme.typography.bodySmall)
                }
            }
            if (daftar.isEmpty()) item { EmptyView("Belum ada periode yang dikunci", "Kunci periode setelah laporan final.", Icons.Rounded.LockOpen) }
            itemsIndexed(daftar, key = { _, p -> p.id }) { i, p ->
                BizSurface(Modifier.fillMaxWidth().enterAnimation(i), onClick = { bukaLagi = p }, contentPadding = PaddingValues(14.dp)) {
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

    bukaLagi?.let { p ->
        AlertDialog(
            onDismissRequest = { bukaLagi = null },
            shape = RoundedCornerShape(24.dp),
            containerColor = MaterialTheme.colorScheme.surface,
            icon = { IconBadge(Icons.Rounded.LockOpen, BizgrowColors.Warning) },
            title = { Text("Buka kembali periode?") },
            text = { Text("${p.periodStart.take(10)} → ${p.periodEnd.take(10)} akan dibuka. Transaksi dan jurnal pada rentang ini bisa diubah lagi sampai Anda mengunci ulang.") },
            confirmButton = { TextButton(onClick = { viewModel.bukaKembaliPeriode(p.id); bukaLagi = null }) { Text("Buka kembali", fontWeight = FontWeight.Bold) } },
            dismissButton = { TextButton(onClick = { bukaLagi = null }) { Text("Batal") } }
        )
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

// ═══════════════════════════════════════════════════════════════════════════
//  Antrean & dapur (padanan pos/antrean di web)
// ═══════════════════════════════════════════════════════════════════════════

private val alurAntrean = listOf("PENDING" to "Menunggu", "PREPARING" to "Diproses", "READY" to "Siap diambil")

@Composable
fun PosQueueScreen(viewModel: AppViewModel) {
    val antrean by viewModel.posQueue.collectAsState()
    var filter by remember { mutableStateOf("SEMUA") }
    // Segarkan otomatis tiap 15 detik selama layar terbuka
    LaunchedEffect(Unit) {
        while (true) { viewModel.loadPosQueue(); kotlinx.coroutines.delay(15_000) }
    }
    val tampil = antrean.filter { filter == "SEMUA" || it.fulfillmentStatus == filter }

    BizScreen("Antrean & Dapur", subtitle = "${antrean.size} pesanan aktif", onBack = { viewModel.navigateBack() },
        actions = { BizIconButton(Icons.Rounded.Refresh, "Muat ulang") { viewModel.loadPosQueue() }; Spacer(Modifier.width(8.dp)) }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            Row(Modifier.padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterPill("Semua (${antrean.size})", filter == "SEMUA", { filter = "SEMUA" })
                alurAntrean.forEach { (k, l) -> FilterPill("$l (${antrean.count { it.fulfillmentStatus == k }})", filter == k, { filter = k }) }
            }
            if (tampil.isEmpty()) {
                EmptyView("Tidak ada antrean", "Pesanan dengan nomor antrean dari kasir akan muncul di sini.", Icons.Rounded.SoupKitchen)
            } else LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp, 4.dp, 16.dp, 32.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                itemsIndexed(tampil, key = { _, q -> q.id }) { i, q ->
                    val (warna, langkah, labelLangkah) = when (q.fulfillmentStatus) {
                        "PREPARING" -> Triple(BizgrowColors.Info, "READY", "Siap diambil")
                        "READY" -> Triple(BizgrowColors.Success, "COMPLETED", "Selesaikan pesanan")
                        else -> Triple(BizgrowColors.Warning, "PREPARING", "Mulai proses")
                    }
                    BizSurface(Modifier.fillMaxWidth().enterAnimation(i), contentPadding = PaddingValues(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(54.dp).clip(RoundedCornerShape(16.dp)).background(warna.copy(alpha = 0.14f)), contentAlignment = Alignment.Center) {
                                Text(q.queueNumber, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Black, color = warna, maxLines = 1)
                            }
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(q.orderNumber, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text(
                                    listOfNotNull(
                                        when (q.orderType) { "DINE_IN" -> "Dine in"; "DELIVERY" -> "Delivery"; else -> "Takeaway" },
                                        q.tableNumber?.takeIf { it.isNotBlank() }?.let { "Meja $it" }
                                    ).joinToString(" • "),
                                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            Text(q.total.rupiahRingkas(), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                        }
                        Spacer(Modifier.height(10.dp))
                        BizButton(labelLangkah, onClick = { viewModel.ubahStatusAntrean(q.id, langkah) }, modifier = Modifier.fillMaxWidth(), height = 46.dp, colors = listOf(warna, warna.copy(alpha = 0.85f)))
                    }
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Laporan kasir (padanan pos/reports di web)
// ═══════════════════════════════════════════════════════════════════════════

@Composable
fun PosReportScreen(viewModel: AppViewModel) {
    val laporan by viewModel.posReport.collectAsState()
    val shifts by viewModel.posShifts.collectAsState()
    LaunchedEffect(Unit) { viewModel.loadPosReport(); viewModel.loadPosShifts() }

    BizScreen("Laporan Kasir", subtitle = "Ringkasan penjualan POS", onBack = { viewModel.navigateBack() },
        actions = { BizIconButton(Icons.Rounded.Refresh, "Muat ulang") { viewModel.loadPosReport() }; Spacer(Modifier.width(8.dp)) }
    ) { padding ->
        val l = laporan
        if (l == null) { SkeletonList(rows = 5, modifier = Modifier.padding(padding)); return@BizScreen }
        LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(16.dp, 4.dp, 16.dp, 32.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    StatTile("Total penjualan", l.summary.totalRevenue.rupiahRingkas(), Icons.Rounded.PointOfSale, BizgrowColors.Success, Modifier.weight(1f))
                    StatTile("Jumlah order", "${l.summary.totalOrders}", Icons.Rounded.ReceiptLong, BizgrowColors.Primary, Modifier.weight(1f), caption = "${l.summary.paidOrders} lunas")
                }
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    StatTile("Rata-rata order", l.summary.averageOrder.rupiahRingkas(), Icons.Rounded.Calculate, BizgrowColors.Info, Modifier.weight(1f))
                    StatTile("Dibatalkan", "${l.summary.cancelledOrders}", Icons.Rounded.Cancel, BizgrowColors.Danger, Modifier.weight(1f))
                }
            }
            item {
                BizSurface(Modifier.fillMaxWidth()) {
                    Text("Metode pembayaran", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                    val total = l.paymentBreakdown.values.sum().takeIf { it > 0 } ?: 1.0
                    if (l.paymentBreakdown.isEmpty()) Text("Belum ada data", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    l.paymentBreakdown.entries.sortedByDescending { it.value }.forEachIndexed { i, (metode, nilai) ->
                        val p = (nilai / total).toFloat()
                        Column(Modifier.padding(vertical = 5.dp)) {
                            Row { Text(metode, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f)); Text("${nilai.rupiahRingkas()} • ${(p * 100).toInt()}%", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                            Spacer(Modifier.height(4.dp))
                            Box(Modifier.fillMaxWidth().height(7.dp).clip(CircleShape).background(MaterialTheme.colorScheme.outlineVariant)) { Box(Modifier.fillMaxWidth(p).fillMaxHeight().clip(CircleShape).background(BizgrowColors.ModuleColors[i % BizgrowColors.ModuleColors.size])) }
                        }
                    }
                }
            }
            item {
                BizSurface(Modifier.fillMaxWidth()) {
                    Text("Produk terlaris", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    if (l.topProducts.isEmpty()) Text("Belum ada penjualan.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    l.topProducts.forEachIndexed { i, p ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                            Box(Modifier.size(26.dp).clip(CircleShape).background(BizgrowColors.Primary.copy(alpha = 0.12f)), contentAlignment = Alignment.Center) { Text("${i + 1}", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = BizgrowColors.Primary) }
                            Spacer(Modifier.width(10.dp))
                            Column(Modifier.weight(1f)) { Text(p.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis); Text("${p.qty} terjual", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                            Text(p.revenue.rupiahRingkas(), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = BizgrowColors.Success)
                        }
                    }
                }
            }
            val riwayat = shifts.take(5)
            if (riwayat.isNotEmpty()) {
                item { SectionTitle("Shift terakhir") }
                itemsIndexed(riwayat, key = { _, s -> s.id }) { i, s -> RiwayatShift(s, Modifier.enterAnimation(i)) }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Kontak akuntansi (pelanggan & supplier untuk piutang/hutang) — master-data/kontak
// ═══════════════════════════════════════════════════════════════════════════

private val tipeKontak = listOf("CUSTOMER" to "Customer (Pembeli)", "SUPPLIER" to "Supplier (Pemasok)", "BOTH" to "Keduanya")
private val termin = listOf("0" to "Tunai", "15" to "15 hari (Net 15)", "30" to "30 hari (Net 30)", "45" to "45 hari (Net 45)", "60" to "60 hari (Net 60)")

@Composable
fun AccountingContactsScreen(viewModel: AppViewModel) {
    val daftar by viewModel.accountingContacts.collectAsState()
    var edit by remember { mutableStateOf<AccountingContact?>(null) }
    var tambah by remember { mutableStateOf(false) }
    var hapus by remember { mutableStateOf<AccountingContact?>(null) }
    var cari by remember { mutableStateOf("") }
    var filter by remember { mutableStateOf("SEMUA") }
    LaunchedEffect(Unit) { viewModel.loadAccountingContacts() }
    val tampil = daftar.filter { (cari.isBlank() || it.namaKontak.contains(cari, true)) && (filter == "SEMUA" || it.tipeKontak.uppercase() == filter || it.tipeKontak.uppercase() == "BOTH") }

    BizScreen("Kontak Akuntansi", subtitle = "${daftar.size} kontak", onBack = { viewModel.navigateBack() },
        floatingActionButton = { FabTambah("Kontak baru") { tambah = true } }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            BizSearchField(cari, { cari = it }, "Cari nama kontak", Modifier.padding(horizontal = 16.dp))
            Row(Modifier.padding(horizontal = 16.dp, vertical = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterPill("Semua", filter == "SEMUA", { filter = "SEMUA" }); FilterPill("Customer", filter == "CUSTOMER", { filter = "CUSTOMER" }); FilterPill("Supplier", filter == "SUPPLIER", { filter = "SUPPLIER" })
            }
            if (tampil.isEmpty()) {
                EmptyView("Belum ada kontak", "Tambahkan pelanggan atau supplier agar bisa dipilih saat membuat piutang/hutang.", Icons.Rounded.Contacts, "Tambah kontak", { tambah = true })
            } else LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp, 0.dp, 16.dp, 96.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                itemsIndexed(tampil, key = { _, c -> c.id }) { i, c ->
                    BizSurface(Modifier.fillMaxWidth().enterAnimation(i), onClick = { edit = c }, contentPadding = PaddingValues(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            IconBadge(if (c.tipeKontak.uppercase() == "SUPPLIER") Icons.Rounded.LocalShipping else Icons.Rounded.Person, BizgrowColors.Info)
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(c.namaKontak, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text(listOfNotNull(c.telepon?.takeIf { it.isNotBlank() }, c.email?.takeIf { it.isNotBlank() }).joinToString(" • ").ifBlank { "Tanpa kontak" }, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                StatusChip(tipeKontak.firstOrNull { it.first == c.tipeKontak.uppercase() }?.second?.substringBefore(" (") ?: c.tipeKontak, BizgrowColors.Primary)
                                Text("Net ${c.termPembayaran}" + if (c.limitKredit > 0) " • limit ${c.limitKredit.rupiahRingkas()}" else "", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }
        }
    }

    if (tambah || edit != null) {
        val awal = edit
        var nama by remember(awal) { mutableStateOf(awal?.namaKontak ?: "") }
        var tipe by remember(awal) { mutableStateOf(awal?.tipeKontak?.uppercase() ?: "CUSTOMER") }
        var email by remember(awal) { mutableStateOf(awal?.email ?: "") }
        var telp by remember(awal) { mutableStateOf(awal?.telepon ?: "") }
        var alamat by remember(awal) { mutableStateOf(awal?.alamat ?: "") }
        var npwp by remember(awal) { mutableStateOf(awal?.npwp ?: "") }
        var limit by remember(awal) { mutableStateOf(awal?.limitKredit?.toLong()?.toString() ?: "0") }
        var term by remember(awal) { mutableStateOf((awal?.termPembayaran ?: 30).toString()) }
        val emailOk = email.isBlank() || ('@' in email && '.' in email.substringAfter('@'))
        FormSheet(
            if (awal == null) "Kontak baru" else "Ubah kontak", onDismiss = { tambah = false; edit = null },
            simpanAktif = nama.isNotBlank() && emailOk,
            onHapus = awal?.let { { hapus = it; edit = null } },
            onSimpan = {
                viewModel.simpanKontakAkuntansi(AccountingContact(awal?.id ?: 0, 0, nama.trim(), tipe, email.trim(), telp.trim(), alamat.trim(), npwp.trim(), limit.toDoubleOrNull() ?: 0.0, term.toIntOrNull() ?: 30))
                tambah = false; edit = null
            }
        ) {
            BizTextField(nama, { nama = it }, "Nama lengkap / perusahaan", placeholder = "PT. Global Niaga")
            PilihanPil("Jenis kontak", tipeKontak, tipe) { tipe = it }
            BizTextField(email, { email = it }, "Email", isError = !emailOk, supportingText = if (!emailOk) "Format email belum benar" else null)
            BizTextField(telp, { telp = it }, "Telepon")
            BizTextField(alamat, { alamat = it }, "Alamat lengkap", singleLine = false)
            BizTextField(npwp, { npwp = it }, "NPWP (opsional)")
            PilihanField("Jatuh tempo default", termin, term, { term = it })
            AngkaField(limit, { limit = it }, "Limit kredit piutang (Rp)", desimal = false, supporting = "0 = tanpa batas")
        }
    }
    hapus?.let { c -> KonfirmasiHapus("Hapus kontak?", "\"${c.namaKontak}\" akan dihapus (bila belum punya piutang/hutang).", { viewModel.hapusKontakAkuntansi(c.id); hapus = null }, { hapus = null }) }
}
