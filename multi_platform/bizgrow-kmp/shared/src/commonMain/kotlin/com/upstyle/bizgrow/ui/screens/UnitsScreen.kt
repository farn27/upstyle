package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.data.BusinessUnit
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors

/** Kelola unit bisnis: pusat + cabangnya (struktur bisnis web), tambah / ubah / hapus. */
@Composable
fun UnitsScreen(viewModel: AppViewModel) {
    val units by viewModel.units.collectAsState(initial = viewModel.units.value)
    var buat by remember { mutableStateOf(false) }
    var ubah by remember { mutableStateOf<BusinessUnit?>(null) }
    var hapus by remember { mutableStateOf<BusinessUnit?>(null) }

    LaunchedEffect(Unit) { viewModel.loadUnits() }

    val pusat = remember(units) { units.filter { it.cabangDari == null } }
    val jumlahCabang = units.count { it.cabangDari != null }

    BizScreen(
        title = "Unit bisnis",
        subtitle = "${pusat.size} pusat • $jumlahCabang cabang",
        onBack = { viewModel.navigateBack() },
        actions = { BizIconButton(Icons.Rounded.Map, "Business Planning") { viewModel.navigate(Screen.BusinessPlan) } },
        floatingActionButton = { FabTambah("Unit baru") { buat = true } }
    ) { padding ->
        if (units.isEmpty()) {
            EmptyView(
                "Belum ada bisnis", "Buat unit bisnis pertamamu untuk mulai mencatat penjualan, stok, dan keuangan.",
                Icons.Rounded.AddBusiness, "Buat bisnis", { buat = true }, Modifier.padding(padding)
            )
        } else {
            LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 96.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                pusat.forEach { induk ->
                    val cabang = units.filter { it.cabangDari == induk.id }
                    item(key = "u-${induk.id}") {
                        KartuUnit(induk, cabang.size, viewModel, { ubah = induk }, { hapus = induk })
                    }
                    cabang.forEach { c ->
                        item(key = "u-${c.id}") {
                            Box(Modifier.padding(start = 22.dp)) { KartuUnit(c, 0, viewModel, { ubah = c }, { hapus = c }) }
                        }
                    }
                }
            }
        }
    }

    if (buat) BuatUnitSheet(units, { buat = false }) { req -> viewModel.createUnit(req); buat = false }
    ubah?.let { u -> UbahUnitSheet(u, { ubah = null }) { req -> viewModel.updateUnitSettings(u.id, req); ubah = null } }
    hapus?.let { u ->
        val anak = units.count { it.cabangDari == u.id }
        KonfirmasiHapus(
            "Hapus \"${u.name}\"?",
            "Seluruh data unit ini (transaksi, produk, karyawan, jurnal) akan dihapus permanen dan tidak bisa dikembalikan." +
                if (anak > 0) " Cabangnya ($anak) tetap ada tetapi tidak lagi berinduk." else "",
            { viewModel.deleteUnit(u.id); hapus = null }, { hapus = null }
        )
    }
}

@Composable
private fun KartuUnit(unit: BusinessUnit, jumlahCabang: Int, viewModel: AppViewModel, onUbah: () -> Unit, onHapus: () -> Unit) {
    val kat = kategoriDari(unit.type)
    var menu by remember { mutableStateOf(false) }
    BizSurface(
        Modifier.fillMaxWidth(),
        onClick = { viewModel.selectUnit(unit.id); viewModel.navigate(Screen.Dashboard) },
        contentPadding = PaddingValues(14.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconBadge(kat.icon, kat.tint, size = 48.dp, iconSize = 24.dp)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(unit.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false))
                    if (unit.isCabang == 1) { Spacer(Modifier.width(6.dp)); StatusChip("Cabang", BizgrowColors.Info) }
                    else if (jumlahCabang > 0) { Spacer(Modifier.width(6.dp)); StatusChip("$jumlahCabang cabang", BizgrowColors.Violet) }
                }
                Text(labelKategori(unit.type), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                val alamat = unit.alamat?.takeIf { it.isNotBlank() && !it.startsWith("Alamat default") }
                if (alamat != null) Text(alamat, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                if (unit.modalAwal > 0) Text("Modal awal ${unit.modalAwal.rupiahRingkas()}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Box {
                BizIconButton(Icons.Rounded.MoreVert, "Menu") { menu = true }
                DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                    DropdownMenuItem(text = { Text("Ubah") }, leadingIcon = { Icon(Icons.Rounded.Edit, null) }, onClick = { menu = false; onUbah() })
                    DropdownMenuItem(text = { Text("Hapus", color = BizgrowColors.Danger) }, leadingIcon = { Icon(Icons.Rounded.DeleteOutline, null, tint = BizgrowColors.Danger) }, onClick = { menu = false; onHapus() })
                }
            }
        }
    }
}
