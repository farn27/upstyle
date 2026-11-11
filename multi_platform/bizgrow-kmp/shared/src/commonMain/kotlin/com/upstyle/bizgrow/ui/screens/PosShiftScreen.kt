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
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.data.PosShift
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors

/** Shift kasir: buka/tutup, kas masuk/keluar, riwayat dengan selisih kas. */
@Composable
fun PosShiftScreen(viewModel: AppViewModel) {
    val shifts by viewModel.posShifts.collectAsState()
    val aktif by viewModel.activeShift.collectAsState()
    val kas by viewModel.kasShift.collectAsState()
    var buka by remember { mutableStateOf(false) }
    var tutup by remember { mutableStateOf(false) }
    var kasForm by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) { viewModel.loadPosShifts() }
    LaunchedEffect(aktif?.id) { aktif?.let { viewModel.loadKasShift(it.id) } }

    val kasMasuk = kas.filter { it.type == "CASH_IN" }.sumOf { it.amount }
    val kasKeluar = kas.filter { it.type == "CASH_OUT" }.sumOf { it.amount }

    BizScreen("Shift Kasir", subtitle = if (aktif != null) "Shift sedang berjalan" else "Belum ada shift aktif", onBack = { viewModel.navigateBack() },
        floatingActionButton = {
            if (aktif == null) FabTambah("Buka shift") { buka = true }
        }
    ) { padding ->
        LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(16.dp, 4.dp, 16.dp, 96.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item {
                val s = aktif
                if (s == null) {
                    EmptyView("Belum ada shift aktif", "Buka shift dengan modal awal untuk mulai kasir dan mencatat kas.", Icons.Rounded.Schedule, "Buka shift", { buka = true })
                } else {
                    GradientCard(Modifier.fillMaxWidth(), colors = BizgrowColors.GradSuccess) {
                        Column {
                            Text("Shift aktif • dibuka ${s.waktuBuka.tanggalJam()}", style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.85f))
                            Text((if (s.kasAkhir > 0) s.kasAkhir else s.modalAwal + kasMasuk - kasKeluar).rupiah(), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = Color.White)
                            Text("Perkiraan uang di laci: modal + penjualan tunai + setor − tarik", style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.8f))
                            Spacer(Modifier.height(12.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                Mini("Modal awal", s.modalAwal.rupiahRingkas(), Modifier.weight(1f))
                                // penjualan tunai = kas diharapkan server − modal − (setor − tarik)
                                val tunai = if (s.kasAkhir > 0) (s.kasAkhir - s.modalAwal - kasMasuk + kasKeluar).coerceAtLeast(0.0) else 0.0
                                Mini("Penjualan tunai", tunai.rupiahRingkas(), Modifier.weight(1f))
                                Mini("Setor − tarik", (kasMasuk - kasKeluar).rupiahRingkas(), Modifier.weight(1f))
                            }
                        }
                    }
                    Spacer(Modifier.height(10.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        BizOutlineButton("Setor kas", { kasForm = "CASH_IN" }, Modifier.weight(1f), icon = Icons.Rounded.AddCircleOutline, tint = BizgrowColors.Success, height = 46.dp)
                        BizOutlineButton("Tarik kas", { kasForm = "CASH_OUT" }, Modifier.weight(1f), icon = Icons.Rounded.RemoveCircleOutline, tint = BizgrowColors.Danger, height = 46.dp)
                    }
                    Spacer(Modifier.height(8.dp))
                    BizButton("Tutup shift", { tutup = true }, Modifier.fillMaxWidth(), icon = Icons.Rounded.Lock, colors = listOf(BizgrowColors.Danger, BizgrowColors.DangerDark))
                }
            }
            if (aktif != null && kas.isNotEmpty()) {
                item { SectionTitle("Kas masuk & keluar shift ini") }
                itemsIndexed(kas, key = { _, k -> k.id }) { _, k ->
                    val masuk = k.type == "CASH_IN"
                    ListRow(k.description.ifBlank { if (masuk) "Setor kas" else "Tarik kas" }, subtitle = k.createdAt.tanggalJam(), icon = if (masuk) Icons.Rounded.SouthWest else Icons.Rounded.NorthEast,
                        tint = if (masuk) BizgrowColors.Success else BizgrowColors.Danger,
                        trailing = { Text((if (masuk) "+" else "-") + k.amount.rupiahRingkas(), style = MaterialTheme.typography.titleSmall, color = if (masuk) BizgrowColors.Success else BizgrowColors.Danger) })
                }
            }
            val riwayat = shifts.filter { it.status != "OPEN" }
            if (riwayat.isNotEmpty()) {
                item { SectionTitle("Riwayat shift") }
                itemsIndexed(riwayat, key = { _, s -> s.id }) { i, s -> RiwayatShift(s, Modifier.enterAnimation(i)) }
            }
        }
    }

    if (buka) {
        var modal by remember { mutableStateOf("") }
        FormSheet("Buka shift kasir", subjudul = "Masukkan uang modal yang ada di laci kas.", onDismiss = { buka = false }, labelSimpan = "Buka shift",
            simpanAktif = modal.toDoubleOrNull() != null, onSimpan = { viewModel.openShift(modal.toDouble()); buka = false }) {
            AngkaField(modal, { modal = it }, "Modal awal (Rp)", desimal = false)
        }
    }
    if (tutup) {
        var hitung by remember { mutableStateOf("") }
        var cat by remember { mutableStateOf("") }
        FormSheet("Tutup shift", subjudul = "Hitung uang di laci lalu isi jumlah sebenarnya. Selisih dengan perkiraan sistem akan dicatat.", onDismiss = { tutup = false },
            labelSimpan = "Tutup shift", simpanAktif = hitung.toDoubleOrNull() != null,
            onSimpan = { aktif?.let { viewModel.closeShift(it.id, hitung.toDouble(), cat) }; tutup = false }) {
            AngkaField(hitung, { hitung = it }, "Uang di laci (Rp)", desimal = false)
            aktif?.takeIf { it.kasAkhir > 0 }?.let { a ->
                val aktual = hitung.toDoubleOrNull()
                val selisih = aktual?.let { it - a.kasAkhir }
                Text(
                    "Perkiraan sistem ${a.kasAkhir.rupiah()}" + when {
                        selisih == null -> ""
                        selisih == 0.0 -> " • pas, tidak ada selisih"
                        selisih > 0 -> " • lebih ${selisih.rupiah()}"
                        else -> " • kurang ${(-selisih).rupiah()}"
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = if (selisih != null && selisih < 0) BizgrowColors.Danger else MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            BizTextField(cat, { cat = it }, "Catatan (opsional)", singleLine = false)
        }
    }
    kasForm?.let { tipe ->
        var nominal by remember(tipe) { mutableStateOf("") }
        var ket by remember(tipe) { mutableStateOf("") }
        FormSheet(if (tipe == "CASH_IN") "Setor kas" else "Tarik kas", onDismiss = { kasForm = null },
            simpanAktif = (nominal.toDoubleOrNull() ?: 0.0) > 0,
            onSimpan = { aktif?.let { viewModel.catatKasShift(it.id, tipe, nominal.toDouble(), ket) }; kasForm = null }) {
            AngkaField(nominal, { nominal = it }, "Nominal (Rp)", desimal = false)
            BizTextField(ket, { ket = it }, "Keterangan", placeholder = "Contoh: tambah receh")
        }
    }
}

@Composable
private fun Mini(label: String, nilai: String, modifier: Modifier) {
    Column(modifier.clip(RoundedCornerShape(14.dp)).background(Color.White.copy(alpha = 0.16f)).padding(10.dp)) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.85f))
        Text(nilai, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = Color.White, maxLines = 1)
    }
}

@Composable
fun RiwayatShift(shift: PosShift, modifier: Modifier = Modifier) {
    BizSurface(modifier.fillMaxWidth(), contentPadding = PaddingValues(12.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconBadge(Icons.Rounded.Schedule, BizgrowColors.Info, size = 38.dp, iconSize = 19.dp)
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text("Shift #${shift.id}", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                Text("${shift.waktuBuka.tanggalJam()} → ${shift.waktuTutup?.tanggalJam() ?: "-"}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            StatusChip(if (shift.status == "OPEN") "Berjalan" else "Selesai", if (shift.status == "OPEN") BizgrowColors.Success else BizgrowColors.Info)
        }
        Spacer(Modifier.height(8.dp))
        Row {
            Column(Modifier.weight(1f)) { Text("Modal", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant); Text(shift.modalAwal.rupiah(), style = MaterialTheme.typography.bodyMedium) }
            Column(Modifier.weight(1f)) { Text(if (shift.status == "OPEN") "Kas laci (perkiraan)" else "Kas akhir (aktual)", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant); Text((if (shift.status == "OPEN") shift.kasAkhir else shift.kasAkhirAktual).rupiah(), style = MaterialTheme.typography.bodyMedium) }
            Column(horizontalAlignment = Alignment.End) {
                Text("Selisih", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                // shift yang masih berjalan belum punya selisih — jangan tampilkan "Rp 0" hijau seolah sudah cocok
                if (shift.status == "OPEN") Text("-", style = MaterialTheme.typography.bodyMedium) else
                Text((if (shift.selisih > 0) "+" else "") + shift.selisih.rupiah(), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold,
                    color = if (shift.selisih == 0.0) BizgrowColors.Success else if (shift.selisih > 0) BizgrowColors.Info else BizgrowColors.Danger)
            }
        }
        if (!shift.catatan.isNullOrBlank()) Text(shift.catatan, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
    }
}
