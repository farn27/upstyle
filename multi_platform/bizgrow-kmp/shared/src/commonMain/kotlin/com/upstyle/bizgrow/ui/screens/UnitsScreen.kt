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
    var portal by remember { mutableStateOf<BusinessUnit?>(null) }

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
                        KartuUnit(induk, cabang.size, viewModel, { ubah = induk }, { hapus = induk }, { portal = induk })
                    }
                    cabang.forEach { c ->
                        item(key = "u-${c.id}") {
                            Box(Modifier.padding(start = 22.dp)) { KartuUnit(c, 0, viewModel, { ubah = c }, { hapus = c }, { portal = c }) }
                        }
                    }
                }
            }
        }
    }

    if (buat) BuatUnitSheet(units, { buat = false }) { req -> viewModel.createUnit(req); buat = false }
    ubah?.let { u -> UbahUnitSheet(u, { ubah = null }) { req -> viewModel.updateUnitSettings(u.id, req); ubah = null } }
    portal?.let { u ->
        // Ambil versi terbaru dari daftar agar loginSlug yang baru dibuat langsung tampil.
        val terbaru = units.firstOrNull { it.id == u.id } ?: u
        PortalStaffSheet(terbaru, viewModel.session.getServerUrl(), { portal = null }) { buatBaru ->
            viewModel.updatePortal(u.id, buatBaru)
        }
    }
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
private fun KartuUnit(unit: BusinessUnit, jumlahCabang: Int, viewModel: AppViewModel, onUbah: () -> Unit, onHapus: () -> Unit, onPortal: () -> Unit) {
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
                    DropdownMenuItem(text = { Text("Portal staff") }, leadingIcon = { Icon(Icons.Rounded.Link, null) }, onClick = { menu = false; onPortal() })
                    DropdownMenuItem(text = { Text("Hapus", color = BizgrowColors.Danger) }, leadingIcon = { Icon(Icons.Rounded.DeleteOutline, null, tint = BizgrowColors.Danger) }, onClick = { menu = false; onHapus() })
                }
            }
        }
    }
}

/** Link login khusus staff (`/portal/<loginSlug>`) — sama dengan "Portal Staff" di Pengaturan Bisnis web. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PortalStaffSheet(unit: BusinessUnit, serverUrl: String, onDismiss: () -> Unit, onBuat: (buatBaru: Boolean) -> Unit) {
    val clipboard = androidx.compose.ui.platform.LocalClipboardManager.current
    var konfirmasi by remember { mutableStateOf(false) }
    var tersalin by remember { mutableStateOf(false) }
    val ada = unit.loginSlug.isNotBlank()
    val link = serverUrl.trimEnd('/') + "/portal/" + unit.loginSlug

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 28.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Portal staff", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(
                "Bagikan link ini ke karyawan ${unit.name} agar mereka bisa masuk dengan akun staff (absen, kasir, dll sesuai peran) tanpa melihat data pemilik.",
                style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            if (ada) {
                BizSurface(Modifier.fillMaxWidth(), contentPadding = PaddingValues(14.dp)) {
                    Text(link, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                }
                Button(
                    onClick = { clipboard.setText(androidx.compose.ui.text.AnnotatedString(link)); tersalin = true },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(if (tersalin) Icons.Rounded.Check else Icons.Rounded.ContentCopy, null)
                    Spacer(Modifier.width(8.dp))
                    Text(if (tersalin) "Link tersalin" else "Salin link")
                }
                OutlinedButton(onClick = { konfirmasi = true }, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Rounded.Refresh, null); Spacer(Modifier.width(8.dp)); Text("Buat ulang link")
                }
            } else {
                Button(onClick = { onBuat(false) }, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Rounded.Link, null); Spacer(Modifier.width(8.dp)); Text("Buat link login staff")
                }
            }
        }
    }
    if (konfirmasi) {
        AlertDialog(
            onDismissRequest = { konfirmasi = false },
            title = { Text("Buat ulang link?") },
            text = { Text("Link lama langsung tidak berlaku. Staff harus memakai link baru untuk masuk.") },
            confirmButton = { TextButton(onClick = { konfirmasi = false; tersalin = false; onBuat(true) }) { Text("Buat ulang") } },
            dismissButton = { TextButton(onClick = { konfirmasi = false }) { Text("Batal") } }
        )
    }
}
