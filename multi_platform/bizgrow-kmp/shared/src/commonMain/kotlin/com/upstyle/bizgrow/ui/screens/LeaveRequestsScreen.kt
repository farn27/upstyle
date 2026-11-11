package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors

private val TIPE_CUTI = listOf("leave" to "Cuti / izin", "overtime" to "Lembur")
private fun labelCuti(t: String) = TIPE_CUTI.firstOrNull { it.first == t.lowercase() }?.second ?: t

/** Pengajuan cuti & lembur: setujui / tolak, dan catat pengajuan atas nama karyawan. */
@Composable
fun LeaveRequestsScreen(viewModel: AppViewModel) {
    val daftar by viewModel.leaveRequests.collectAsState(initial = viewModel.leaveRequests.value)
    val hr by viewModel.hrData.collectAsState(initial = viewModel.hrData.value)
    var filter by remember { mutableStateOf("pending") }
    var baru by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { viewModel.loadLeaveRequests(); if (viewModel.hrData.value == null) viewModel.loadHrData() }

    val menunggu = daftar.count { it.status.equals("pending", true) }
    val tampil = daftar.filter { filter == "all" || it.status.equals(filter, true) }

    BizScreen(
        title = "Cuti & lembur", subtitle = "$menunggu menunggu persetujuan", onBack = { viewModel.navigateBack() },
        actions = { BizIconButton(Icons.Rounded.Refresh, "Muat ulang") { viewModel.loadLeaveRequests() } },
        floatingActionButton = { FabTambah("Pengajuan") { baru = true } }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("pending" to "Menunggu", "approved" to "Disetujui", "rejected" to "Ditolak", "all" to "Semua").forEach { (id, label) ->
                    FilterPill("$label (${if (id == "all") daftar.size else daftar.count { it.status.equals(id, true) }})", filter == id, { filter = id })
                }
            }
            if (tampil.isEmpty()) {
                EmptyView(
                    if (daftar.isEmpty()) "Belum ada pengajuan" else "Tidak ada pengajuan di filter ini",
                    "Karyawan yang mengajukan cuti atau lembur akan tampil di sini untuk kamu setujui.", Icons.Rounded.EventAvailable
                )
            } else LazyColumn(contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 96.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(tampil, key = { it.id }) { r ->
                    val st = r.status.lowercase()
                    val warna = when (st) { "approved" -> BizgrowColors.Success; "rejected" -> BizgrowColors.Danger; else -> BizgrowColors.Warning }
                    BizSurface(Modifier.fillMaxWidth(), contentPadding = PaddingValues(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            IconBadge(if (r.type.equals("overtime", true)) Icons.Rounded.MoreTime else Icons.Rounded.EventBusy, warna, size = 44.dp, iconSize = 22.dp)
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(r.employeeName.ifBlank { "Karyawan #${r.employeeId}" }, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                Text("${labelCuti(r.type)} • ${r.startDate}" + if (r.endDate != r.startDate) " s/d ${r.endDate}" else "", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            StatusChip(when (st) { "approved" -> "Disetujui"; "rejected" -> "Ditolak"; else -> "Menunggu" }, warna)
                        }
                        if (!r.reason.isNullOrBlank()) {
                            Spacer(Modifier.height(6.dp))
                            Text(r.reason, style = MaterialTheme.typography.bodyMedium)
                        }
                        if (st == "pending") {
                            Spacer(Modifier.height(10.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                BizOutlineButton("Tolak", onClick = { viewModel.putusCuti(r.id, false) }, tint = BizgrowColors.Danger, modifier = Modifier.weight(1f))
                                BizButton("Setujui", onClick = { viewModel.putusCuti(r.id, true) }, modifier = Modifier.weight(1f), icon = Icons.Rounded.Check)
                            }
                        }
                    }
                }
            }
        }
    }

    if (baru) FormCuti(hr?.employees?.map { it.id.toString() to it.fullName } ?: emptyList(), { baru = false }) { emp, tipe, mulai, selesai, alasan ->
        viewModel.ajukanCuti(emp, tipe, mulai, selesai, alasan); baru = false
    }
}

@Composable
private fun FormCuti(karyawan: List<Pair<String, String>>, onDismiss: () -> Unit, onSimpan: (Int, String, String, String, String) -> Unit) {
    var emp by remember { mutableStateOf<String?>(null) }
    var tipe by remember { mutableStateOf("leave") }
    var mulai by remember { mutableStateOf("") }
    var selesai by remember { mutableStateOf("") }
    var alasan by remember { mutableStateOf("") }
    val tanggalOk = mulai.isNotBlank() && selesai.isNotBlank() && selesai >= mulai
    FormSheet(
        judul = "Catat pengajuan", subjudul = "Atas nama karyawan", onDismiss = onDismiss,
        simpanAktif = emp != null && tanggalOk,
        onSimpan = { emp?.toIntOrNull()?.let { onSimpan(it, tipe, mulai, selesai, alasan.trim()) } }
    ) {
        PilihanField("Karyawan *", karyawan, emp, { emp = it }, placeholder = if (karyawan.isEmpty()) "Belum ada karyawan aktif" else "Pilih karyawan")
        PilihanPil("Jenis", TIPE_CUTI, tipe) { tipe = it }
        TanggalField("Mulai *", mulai, { mulai = it; if (selesai.isBlank() || selesai < it) selesai = it })
        TanggalField("Selesai *", selesai, { selesai = it })
        if (mulai.isNotBlank() && selesai.isNotBlank() && selesai < mulai) Text("Tanggal selesai tidak boleh sebelum mulai", color = BizgrowColors.Danger, style = MaterialTheme.typography.labelMedium)
        BizTextField(alasan, { alasan = it }, "Alasan", singleLine = false)
    }
}
