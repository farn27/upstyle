package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.data.*
import kotlinx.coroutines.launch
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

private val namaBulanKpi = listOf("", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des")

/** Profil karyawan lengkap (padanan hr/[employeeSlug] di web): data pribadi, kontrak, rekening, KPI, riwayat jabatan, dokumen. */
@Composable
fun EmployeeDetailScreen(viewModel: AppViewModel) {
    val detail by viewModel.hrDetail.collectAsState()
    val galat by viewModel.hrDetailGalat.collectAsState()
    var edit by remember { mutableStateOf(false) }
    var tambahKomponen by remember { mutableStateOf(false) }
    var hapusKomponen by remember { mutableStateOf<SalaryComponent?>(null) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) { viewModel.loadHrDetail() }

    BizScreen(detail?.employee?.fullName ?: "Karyawan", subtitle = detail?.employee?.position, onBack = { viewModel.navigateBack() },
        actions = { if (detail != null) { BizIconButton(Icons.Rounded.Edit, "Ubah") { edit = true }; Spacer(Modifier.width(8.dp)) } }
    ) { padding ->
        val d = detail
        if (d == null) {
            val g = galat
            if (g != null) Box(Modifier.fillMaxSize().padding(padding)) {
                EmptyView("Profil tidak bisa dimuat", g, Icons.Rounded.ErrorOutline, "Coba lagi", { viewModel.loadHrDetail() })
            } else SkeletonList(rows = 5, modifier = Modifier.padding(padding))
            return@BizScreen
        }
        val e = d.employee
        fun topeng(v: String) = if (v.length <= 4) v else "••••" + v.takeLast(4)
        LazyColumn(Modifier.fillMaxSize().padding(padding), contentPadding = PaddingValues(16.dp, 4.dp, 16.dp, 32.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item {
                GradientCard(Modifier.fillMaxWidth()) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(60.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.22f)), contentAlignment = Alignment.Center) {
                            Text(e.fullName.firstOrNull()?.uppercase() ?: "?", style = MaterialTheme.typography.headlineSmall, color = Color.White, fontWeight = FontWeight.Bold)
                        }
                        Spacer(Modifier.width(14.dp))
                        Column(Modifier.weight(1f)) {
                            Text(e.fullName, style = MaterialTheme.typography.titleLarge, color = Color.White, fontWeight = FontWeight.Bold)
                            Text(listOf(e.position, e.division).filter { it.isNotBlank() }.joinToString(" • "), style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = 0.85f))
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 6.dp)) {
                                StatusChip(if (e.status == "active") "Aktif" else "Nonaktif", Color.White)
                                if (e.employmentStatus.isNotBlank()) StatusChip(e.employmentStatus, Color.White)
                                if (e.jobGrade.isNotBlank()) StatusChip(e.jobGrade, Color.White)
                            }
                        }
                    }
                }
            }
            item { KartuInfo("Kontak & pekerjaan", listOf(
                "Email" to e.email, "Telepon" to e.phone, "Alamat" to e.address, "Penempatan" to e.placementLocation,
                "Bergabung" to e.joinDate.tanggalJam(), "Kontak darurat" to e.emergencyContact
            )) }
            item { KartuInfo("Kontrak", listOf("Status kerja" to e.employmentStatus, "Mulai" to e.contractStart.tanggalJam(), "Berakhir" to e.contractEnd.tanggalJam())) }
            item { KartuInfo("Kompensasi", listOf("Gaji pokok" to e.salary.rupiah(), "Bank" to e.bankName, "No. rekening" to topeng(e.bankAccountNumber))) }

            // Komponen gaji (dipakai saat proses payroll)
            val tunjangan = d.components.filter { it.type == "addition" }
            val potongan = d.components.filter { it.type == "deduction" }
            item {
                SectionTitle("Komponen gaji", subtitle = "Gaji bersih ${(e.salary + tunjangan.sumOf { it.amount } - potongan.sumOf { it.amount }).rupiah()}", actionLabel = "+ Tambah", onAction = { tambahKomponen = true })
            }
            if (d.components.isEmpty()) item { Text("Belum ada tunjangan/potongan. Payroll memakai gaji pokok saja.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            items(d.components.size) { n ->
                val c = d.components[n]
                val plus = c.type == "addition"
                ListRow(
                    c.name, subtitle = if (plus) "Tunjangan" else "Potongan", icon = if (plus) Icons.Rounded.AddCircleOutline else Icons.Rounded.RemoveCircleOutline,
                    tint = if (plus) BizgrowColors.Success else BizgrowColors.Danger,
                    trailing = { Text((if (plus) "+ " else "− ") + c.amount.rupiahRingkas(), style = MaterialTheme.typography.titleSmall, color = if (plus) BizgrowColors.Success else BizgrowColors.Danger) },
                    onClick = { hapusKomponen = c }
                )
            }

            item { SectionTitle("KPI", subtitle = "${d.kpis.size} penilaian") }
            if (d.kpis.isEmpty()) item { Text("Belum ada penilaian KPI.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            items(d.kpis.size) { n ->
                val k = d.kpis[n]
                val warna = if (k.score >= 80) BizgrowColors.Success else if (k.score >= 60) BizgrowColors.Warning else BizgrowColors.Danger
                BizSurface(Modifier.fillMaxWidth(), contentPadding = PaddingValues(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("${namaBulanKpi.getOrElse(k.periodMonth) { "" }} ${k.periodYear}", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                            if (k.notes.isNotBlank()) Text(k.notes, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Text("${k.score.toInt()}", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = warna)
                    }
                }
            }
            item { SectionTitle("Riwayat jabatan") }
            if (d.history.isEmpty()) item { Text("Belum ada perubahan jabatan.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            items(d.history.size) { n ->
                val h = d.history[n]
                ListRow("${h.oldPosition.ifBlank { "-" }}  →  ${h.newPosition.ifBlank { "-" }}", subtitle = listOf(h.changeDate.tanggalJam(), h.reason).filter { it.isNotBlank() }.joinToString(" • "), icon = Icons.Rounded.TrendingUp, tint = BizgrowColors.Info)
            }
            item { SectionTitle("Dokumen") }
            if (d.documents.isEmpty()) item { Text("Belum ada dokumen.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            items(d.documents.size) { n ->
                val doc = d.documents[n]
                ListRow(doc.documentType.ifBlank { "Dokumen" }, subtitle = listOf(doc.fileName, doc.uploadedAt.tanggalJam()).filter { it.isNotBlank() }.joinToString(" • "), icon = Icons.Rounded.Description, tint = BizgrowColors.Violet)
            }
        }

        if (tambahKomponen) {
            var nama by remember { mutableStateOf("") }
            var nominal by remember { mutableStateOf("") }
            var jenis by remember { mutableStateOf("addition") }
            var galat by remember { mutableStateOf<String?>(null) }
            FormSheet(
                "Komponen gaji", subjudul = "Tunjangan menambah, potongan mengurangi gaji bersih", onDismiss = { tambahKomponen = false },
                simpanAktif = nama.isNotBlank() && (nominal.toDoubleOrNull() ?: 0.0) > 0,
                onSimpan = { scope.launch { val err = viewModel.tambahKomponenGaji(nama.trim(), nominal.toDouble(), jenis == "deduction"); if (err == null) tambahKomponen = false else galat = err } }
            ) {
                PilihanPil("Jenis", listOf("addition" to "Tunjangan", "deduction" to "Potongan"), jenis) { jenis = it }
                BizTextField(nama, { nama = it }, "Nama komponen", placeholder = if (jenis == "addition") "mis. Tunjangan transport" else "mis. BPJS Kesehatan")
                AngkaField(nominal, { nominal = it }, "Nominal per bulan (Rp)", desimal = false)
                galat?.let { Text(it, color = BizgrowColors.Danger, style = MaterialTheme.typography.bodySmall) }
            }
        }
        hapusKomponen?.let { c ->
            KonfirmasiHapus("Hapus komponen?", "\"${c.name}\" (${c.amount.rupiah()}) tidak lagi dipakai pada payroll berikutnya.", { viewModel.hapusKomponenGaji(c.id); hapusKomponen = null }, { hapusKomponen = null })
        }

        if (edit) {
            var nama by remember(e) { mutableStateOf(e.fullName) }
            var jabatan by remember(e) { mutableStateOf(e.position) }
            var divisi by remember(e) { mutableStateOf(e.division) }
            var gaji by remember(e) { mutableStateOf(e.salary.toLong().toString()) }
            var email by remember(e) { mutableStateOf(e.email) }
            var telp by remember(e) { mutableStateOf(e.phone) }
            var statusKerja by remember(e) { mutableStateOf(e.employmentStatus.ifBlank { "Tetap" }) }
            var bank by remember(e) { mutableStateOf(e.bankName) }
            var rek by remember(e) { mutableStateOf(e.bankAccountNumber) }
            var alamat by remember(e) { mutableStateOf(e.address) }
            var mulai by remember(e) { mutableStateOf(e.contractStart.take(10)) }
            var selesai by remember(e) { mutableStateOf(e.contractEnd.take(10)) }
            var aktif by remember(e) { mutableStateOf(e.status == "active") }
            FormSheet(
                "Ubah data karyawan", onDismiss = { edit = false }, simpanAktif = nama.isNotBlank() && jabatan.isNotBlank(),
                onSimpan = {
                    viewModel.simpanKaryawan(buildJsonObject {
                        put("fullName", nama.trim()); put("position", jabatan.trim()); put("salary", gaji.toDoubleOrNull() ?: 0.0)
                        if (divisi.isNotBlank()) put("division", divisi.trim()); if (email.isNotBlank()) put("email", email.trim()); if (telp.isNotBlank()) put("phone", telp.trim())
                        put("employmentStatus", statusKerja); if (bank.isNotBlank()) put("bankName", bank.trim()); if (rek.isNotBlank()) put("bankAccountNumber", rek.trim())
                        if (alamat.isNotBlank()) put("address", alamat.trim()); if (mulai.isNotBlank()) put("contractStart", mulai); if (selesai.isNotBlank()) put("contractEnd", selesai)
                        put("status", if (aktif) "active" else "inactive")
                    })
                    edit = false
                }
            ) {
                BizTextField(nama, { nama = it }, "Nama lengkap")
                BizTextField(jabatan, { jabatan = it }, "Jabatan")
                BizTextField(divisi, { divisi = it }, "Divisi")
                AngkaField(gaji, { gaji = it }, "Gaji pokok (Rp)", desimal = false)
                BizTextField(email, { email = it }, "Email", keyboardType = KeyboardType.Email)
                BizTextField(telp, { telp = it }, "Telepon", keyboardType = KeyboardType.Phone)
                BizTextField(alamat, { alamat = it }, "Alamat", singleLine = false)
                PilihanPil("Status kerja", listOf("Tetap" to "Tetap", "Kontrak" to "Kontrak", "Magang" to "Magang", "Paruh Waktu" to "Paruh waktu"), statusKerja) { statusKerja = it }
                TanggalField("Kontrak mulai", mulai) { mulai = it }
                TanggalField("Kontrak berakhir", selesai) { selesai = it }
                BizTextField(bank, { bank = it }, "Nama bank")
                BizTextField(rek, { rek = it }, "Nomor rekening", keyboardType = KeyboardType.Number)
                SwitchBaris("Karyawan aktif", "Nonaktif tidak muncul di absensi & payroll", aktif) { aktif = it }
            }
        }
    }
}

@Composable
private fun KartuInfo(judul: String, baris: List<Pair<String, String>>) {
    BizSurface(Modifier.fillMaxWidth()) {
        Text(judul, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(6.dp))
        baris.forEach { (k, v) ->
            Row(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                Text(k, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(0.4f))
                Text(v.ifBlank { "-" }, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(0.6f))
            }
        }
    }
}
