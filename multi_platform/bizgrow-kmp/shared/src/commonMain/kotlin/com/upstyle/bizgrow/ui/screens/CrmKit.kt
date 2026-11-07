package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.data.*
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors

// ═══════════════════════════════════════════════════════════════════════════
//  Kit CRM bersama: tahap deal, tipe aktivitas, daftar & formulir.
//  Dipakai CrmScreen (tab), Pipeline, Kontak, Aktivitas, dan Tugas.
// ═══════════════════════════════════════════════════════════════════════════

/** Tahap deal: id server (huruf besar) → label. */
internal val TAHAP_DEAL = listOf(
    "PROSPEK" to "Prospek", "FOLLOW-UP" to "Follow up", "NEGOSIASI" to "Negosiasi", "WON" to "Menang", "LOST" to "Kalah"
)

internal fun warnaTahap(t: String): Color = when (t.uppercase()) {
    "WON" -> BizgrowColors.Success
    "LOST" -> BizgrowColors.Danger
    "NEGOSIASI" -> BizgrowColors.Warning
    "FOLLOW-UP" -> BizgrowColors.Info
    else -> BizgrowColors.Violet
}

internal fun labelTahap(t: String): String = TAHAP_DEAL.firstOrNull { it.first == t.uppercase() }?.second ?: t.replaceFirstChar { it.uppercase() }

/** Tahap kontak (sama dengan form kontak web). */
internal val TAHAP_KONTAK = listOf(
    "lead" to "Lead", "prospek" to "Prospek", "negotiation" to "Negosiasi", "customer" to "Pelanggan", "won" to "Menang", "lost" to "Kalah"
)

internal fun labelTahapKontak(t: String): String = TAHAP_KONTAK.firstOrNull { it.first == t.lowercase() }?.second ?: t.replaceFirstChar { it.uppercase() }

internal fun warnaTahapKontak(t: String): Color = when (t.lowercase()) {
    "won", "customer" -> BizgrowColors.Success
    "lost" -> BizgrowColors.Danger
    "negotiation" -> BizgrowColors.Warning
    "prospek", "prospect" -> BizgrowColors.Info
    else -> BizgrowColors.Violet
}

internal val TIPE_AKTIVITAS = listOf("Call" to "Telepon", "WA" to "WhatsApp", "Meeting" to "Meeting", "Email" to "Email", "Task" to "Tugas")

internal fun ikonAktivitas(t: String): ImageVector = when (t) {
    "Call" -> Icons.Rounded.Call
    "WA" -> Icons.Rounded.Chat
    "Meeting" -> Icons.Rounded.Groups
    "Email" -> Icons.Rounded.Email
    else -> Icons.Rounded.TaskAlt
}

internal fun namaDealTampil(d: CrmDeal): String =
    d.namaDeal.ifBlank { d.contactName.ifBlank { "Deal #${d.id}" } }

/** Huruf pertama aman (tidak crash bila nama kosong). */
internal fun inisial(s: String): String = s.trim().firstOrNull()?.uppercase() ?: "?"

@Composable
internal fun Inisial(teks: String, tint: Color) {
    Box(Modifier.size(44.dp).clip(CircleShape).background(tint.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
        Text(inisial(teks), color = tint, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
    }
}

// ─── Daftar ───────────────────────────────────────────────────────────────

/** Daftar deal dengan filter tahap; ketuk untuk membuka detail. */
@Composable
internal fun DaftarDeal(deals: List<CrmDeal>, memuat: Boolean, onBuka: (CrmDeal) -> Unit, onTambah: () -> Unit, modifier: Modifier = Modifier) {
    var filter by remember { mutableStateOf("SEMUA") }
    var cari by remember { mutableStateOf("") }
    val tampil = remember(deals, filter, cari) {
        deals.filter { (filter == "SEMUA" || it.stage.uppercase() == filter) && (cari.isBlank() || namaDealTampil(it).contains(cari, true) || it.contactName.contains(cari, true) || it.companyName.contains(cari, true)) }
    }
    Column(modifier) {
        BizSearchField(cari, { cari = it }, "Cari deal / kontak…", Modifier.padding(horizontal = 16.dp, vertical = 8.dp))
        Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterPill("Semua (${deals.size})", filter == "SEMUA", { filter = "SEMUA" })
            TAHAP_DEAL.forEach { (id, label) ->
                FilterPill("$label (${deals.count { it.stage.uppercase() == id }})", filter == id, { filter = id })
            }
        }
        Spacer(Modifier.height(8.dp))
        when {
            memuat && deals.isEmpty() -> SkeletonList(5, Modifier.padding(16.dp))
            tampil.isEmpty() -> EmptyView(
                if (deals.isEmpty()) "Belum ada deal" else "Tidak ada deal yang cocok",
                if (deals.isEmpty()) "Catat peluang penjualan pertamamu dan pantau tahapnya sampai menang." else "Coba ubah filter atau kata kunci.",
                Icons.Rounded.Handshake, if (deals.isEmpty()) "Tambah deal" else null, if (deals.isEmpty()) onTambah else null
            )
            else -> LazyColumn(contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 96.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(tampil, key = { it.id }) { d -> KartuDeal(d) { onBuka(d) } }
            }
        }
    }
}

@Composable
internal fun KartuDeal(d: CrmDeal, onClick: () -> Unit) {
    val warna = warnaTahap(d.stage)
    BizSurface(Modifier.fillMaxWidth(), onClick = onClick, contentPadding = PaddingValues(14.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconBadge(Icons.Rounded.Handshake, warna, size = 46.dp, iconSize = 22.dp)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(namaDealTampil(d), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                val sub = listOf(d.contactName, d.companyName).filter { it.isNotBlank() }.joinToString(" • ")
                if (sub.isNotBlank()) Text(sub, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(d.dealValue.rupiah(), style = MaterialTheme.typography.labelLarge, color = BizgrowColors.Success, fontWeight = FontWeight.Bold)
            }
            StatusChip(labelTahap(d.stage), warna)
        }
    }
}

/** Daftar kontak dengan pencarian. */
@Composable
internal fun DaftarKontak(kontak: List<CrmContact>, memuat: Boolean, onBuka: (CrmContact) -> Unit, onTambah: () -> Unit, modifier: Modifier = Modifier) {
    var cari by remember { mutableStateOf("") }
    val tampil = remember(kontak, cari) {
        kontak.filter { cari.isBlank() || it.nama.contains(cari, true) || it.perusahaan.contains(cari, true) || it.telepon.contains(cari, true) || it.email.contains(cari, true) }
    }
    Column(modifier) {
        BizSearchField(cari, { cari = it }, "Cari nama, perusahaan, telepon…", Modifier.padding(horizontal = 16.dp, vertical = 8.dp))
        when {
            memuat && kontak.isEmpty() -> SkeletonList(5, Modifier.padding(16.dp))
            tampil.isEmpty() -> EmptyView(
                if (kontak.isEmpty()) "Belum ada kontak" else "Kontak tidak ditemukan",
                if (kontak.isEmpty()) "Simpan data calon pelanggan dan klien agar mudah di-follow up." else "Coba kata kunci lain.",
                Icons.Rounded.Contacts, if (kontak.isEmpty()) "Tambah kontak" else null, if (kontak.isEmpty()) onTambah else null
            )
            else -> LazyColumn(contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 96.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(tampil, key = { it.id }) { k ->
                    val warna = warnaTahapKontak(k.stage)
                    BizSurface(Modifier.fillMaxWidth(), onClick = { onBuka(k) }, contentPadding = PaddingValues(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Inisial(k.nama, warna)
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(k.nama, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                if (k.perusahaan.isNotBlank()) Text(k.perusahaan, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                val kontakInfo = listOf(k.telepon, k.email).filter { it.isNotBlank() }.joinToString(" • ")
                                if (kontakInfo.isNotBlank()) Text(kontakInfo, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            }
                            StatusChip(labelTahapKontak(k.stage), warna)
                        }
                    }
                }
            }
        }
    }
}

/** Daftar aktivitas dengan filter tipe. */
@Composable
internal fun DaftarAktivitas(aktivitas: List<CrmActivity>, onTambah: () -> Unit, modifier: Modifier = Modifier) {
    var filter by remember { mutableStateOf("SEMUA") }
    val tampil = remember(aktivitas, filter) { aktivitas.filter { filter == "SEMUA" || it.tipe == filter } }
    Column(modifier) {
        Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterPill("Semua", filter == "SEMUA", { filter = "SEMUA" })
            TIPE_AKTIVITAS.forEach { (id, label) -> FilterPill(label, filter == id, { filter = id }) }
        }
        if (tampil.isEmpty()) {
            EmptyView(
                if (aktivitas.isEmpty()) "Belum ada aktivitas" else "Tidak ada aktivitas $filter",
                "Catat telepon, chat, meeting, dan email dengan kontak agar riwayat follow-up tidak hilang.",
                Icons.Rounded.EventNote, if (aktivitas.isEmpty()) "Catat aktivitas" else null, if (aktivitas.isEmpty()) onTambah else null
            )
        } else {
            LazyColumn(contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 96.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(tampil, key = { it.id }) { a -> BarisAktivitas(a) }
            }
        }
    }
}

@Composable
internal fun BarisAktivitas(a: CrmActivity) {
    BizSurface(Modifier.fillMaxWidth(), contentPadding = PaddingValues(14.dp)) {
        Row(verticalAlignment = Alignment.Top) {
            IconBadge(ikonAktivitas(a.tipe), BizgrowColors.Primary, size = 40.dp, iconSize = 20.dp)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(TIPE_AKTIVITAS.firstOrNull { it.first == a.tipe }?.second ?: a.tipe, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                    Text(a.tanggal.take(10), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                a.contact?.let { Text(it.nama, style = MaterialTheme.typography.labelMedium, color = BizgrowColors.Primary) }
                if (!a.catatan.isNullOrBlank()) Text(a.catatan, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

/** Daftar tugas follow-up: centang untuk selesai, ketuk untuk menghapus lewat menu. */
@Composable
internal fun DaftarTugas(tugas: List<CrmTask>, memuat: Boolean, onToggle: (CrmTask) -> Unit, onHapus: (CrmTask) -> Unit, onTambah: () -> Unit, modifier: Modifier = Modifier) {
    var tampilSelesai by remember { mutableStateOf(false) }
    val terbuka = tugas.filter { it.status != "done" }
    val selesai = tugas.filter { it.status == "done" }
    val tampil = if (tampilSelesai) selesai else terbuka
    Column(modifier) {
        Row(Modifier.padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterPill("Terbuka (${terbuka.size})", !tampilSelesai, { tampilSelesai = false })
            FilterPill("Selesai (${selesai.size})", tampilSelesai, { tampilSelesai = true })
        }
        when {
            memuat && tugas.isEmpty() -> SkeletonList(4, Modifier.padding(16.dp))
            tampil.isEmpty() -> EmptyView(
                if (tampilSelesai) "Belum ada tugas selesai" else "Tidak ada tugas terbuka",
                if (tampilSelesai) "Tugas yang kamu centang akan muncul di sini." else "Buat tugas follow-up supaya tidak ada prospek yang terlewat.",
                Icons.Rounded.TaskAlt, if (!tampilSelesai) "Tambah tugas" else null, if (!tampilSelesai) onTambah else null
            )
            else -> LazyColumn(contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 96.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(tampil, key = { it.id }) { t ->
                    var hapus by remember { mutableStateOf(false) }
                    BizSurface(Modifier.fillMaxWidth(), contentPadding = PaddingValues(start = 6.dp, end = 6.dp, top = 8.dp, bottom = 8.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(checked = t.status == "done", onCheckedChange = { onToggle(t) })
                            Column(Modifier.weight(1f)) {
                                Text(t.deskripsi, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, maxLines = 3, overflow = TextOverflow.Ellipsis)
                                val info = listOfNotNull(t.contactName.takeIf { it.isNotBlank() }, t.deadline?.takeIf { it.isNotBlank() }?.let { "Tenggat ${it.take(10)}" }).joinToString(" • ")
                                if (info.isNotBlank()) Text(info, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            BizIconButton(Icons.Rounded.DeleteOutline, "Hapus tugas") { hapus = true }
                        }
                    }
                    if (hapus) KonfirmasiHapus("Hapus tugas?", "\"${t.deskripsi.take(60)}\" akan dihapus.", { hapus = false; onHapus(t) }, { hapus = false })
                }
            }
        }
    }
}

// ─── Formulir ─────────────────────────────────────────────────────────────

/** Tambah deal baru atau ubah nama/nilai deal yang ada (tahap diubah dari detail). */
@Composable
internal fun DealFormSheet(
    awal: CrmDeal?, kontak: List<CrmContact>, onDismiss: () -> Unit,
    onSimpan: (nama: String, nilai: Double, tahap: String, kontakId: Int?, namaKontak: String, perusahaan: String, telepon: String) -> Unit
) {
    var nama by remember { mutableStateOf(awal?.namaDeal.orEmpty()) }
    var nilai by remember { mutableStateOf(awal?.dealValue?.takeIf { it > 0 }?.toLong()?.toString().orEmpty()) }
    var tahap by remember { mutableStateOf(awal?.stage?.uppercase() ?: "PROSPEK") }
    var kontakId by remember { mutableStateOf(awal?.kontakId?.toString()) }
    var namaBaru by remember { mutableStateOf("") }
    var perusahaan by remember { mutableStateOf("") }
    var telepon by remember { mutableStateOf("") }
    val baru = awal == null
    val pakaiBaru = baru && kontakId == null
    val valid = nama.isNotBlank() && (!baru || kontakId != null || namaBaru.isNotBlank())

    FormSheet(
        judul = if (baru) "Deal baru" else "Ubah deal", onDismiss = onDismiss,
        subjudul = if (baru) "Catat peluang penjualan dan pantau tahapnya." else null,
        simpanAktif = valid,
        onSimpan = {
            val k = kontak.firstOrNull { it.id.toString() == kontakId }
            onSimpan(nama.trim(), nilai.toDoubleOrNull() ?: 0.0, tahap, k?.id, k?.nama ?: namaBaru.trim(), k?.perusahaan ?: perusahaan.trim(), k?.telepon ?: telepon.trim())
        }
    ) {
        BizTextField(nama, { nama = it }, "Nama deal *", placeholder = "mis. Pengadaan seragam PT Maju")
        AngkaField(nilai, { nilai = it }, "Nilai (Rp)", "0", desimal = false)
        if (baru) {
            PilihanField(
                "Kontak", listOf("" to "➕ Kontak baru") + kontak.map { it.id.toString() to (it.nama + if (it.perusahaan.isNotBlank()) " (${it.perusahaan})" else "") },
                kontakId ?: "", { kontakId = it.ifBlank { null } }, placeholder = "Pilih kontak"
            )
            if (pakaiBaru) {
                BizTextField(namaBaru, { namaBaru = it }, "Nama kontak baru *")
                BizTextField(perusahaan, { perusahaan = it }, "Perusahaan")
                BizTextField(telepon, { telepon = it }, "Telepon", keyboardType = androidx.compose.ui.text.input.KeyboardType.Phone)
            }
            PilihanPil("Tahap awal", TAHAP_DEAL.take(4), tahap) { tahap = it }
        }
    }
}

@Composable
internal fun KontakFormSheet(awal: CrmContact?, onDismiss: () -> Unit, onSimpan: (nama: String, telepon: String, email: String, perusahaan: String, stage: String) -> Unit) {
    var nama by remember { mutableStateOf(awal?.nama.orEmpty()) }
    var telepon by remember { mutableStateOf(awal?.telepon.orEmpty()) }
    var email by remember { mutableStateOf(awal?.email.orEmpty()) }
    var perusahaan by remember { mutableStateOf(awal?.perusahaan.orEmpty()) }
    var stage by remember { mutableStateOf(awal?.stage?.lowercase() ?: "lead") }
    val emailSalah = email.isNotBlank() && !(email.contains("@") && email.substringAfter("@").contains("."))
    FormSheet(
        judul = if (awal == null) "Kontak baru" else "Ubah kontak", onDismiss = onDismiss,
        simpanAktif = nama.isNotBlank() && !emailSalah,
        onSimpan = { onSimpan(nama.trim(), telepon.trim(), email.trim(), perusahaan.trim(), stage) }
    ) {
        BizTextField(nama, { nama = it }, "Nama *")
        BizTextField(telepon, { telepon = it }, "Telepon / WhatsApp", keyboardType = androidx.compose.ui.text.input.KeyboardType.Phone)
        BizTextField(email, { email = it }, "Email", keyboardType = androidx.compose.ui.text.input.KeyboardType.Email, isError = emailSalah, supportingText = if (emailSalah) "Format email belum benar" else null)
        BizTextField(perusahaan, { perusahaan = it }, "Perusahaan")
        PilihanPil("Tahap", TAHAP_KONTAK, stage) { stage = it }
    }
}

@Composable
internal fun AktivitasFormSheet(kontak: List<CrmContact>, kontakAwal: Int?, onDismiss: () -> Unit, onSimpan: (kontakId: Int, tipe: String, catatan: String) -> Unit) {
    var kontakId by remember { mutableStateOf(kontakAwal?.toString()) }
    var tipe by remember { mutableStateOf("Call") }
    var catatan by remember { mutableStateOf("") }
    FormSheet(
        judul = "Catat aktivitas", onDismiss = onDismiss, simpanAktif = kontakId != null,
        onSimpan = { kontakId?.toIntOrNull()?.let { onSimpan(it, tipe, catatan.trim()) } }
    ) {
        PilihanField("Kontak *", kontak.map { it.id.toString() to it.nama }, kontakId, { kontakId = it }, placeholder = if (kontak.isEmpty()) "Tambah kontak dulu" else "Pilih kontak", enabled = kontakAwal == null)
        PilihanPil("Jenis", TIPE_AKTIVITAS, tipe) { tipe = it }
        BizTextField(catatan, { catatan = it }, "Catatan", singleLine = false, placeholder = "Apa yang dibahas / hasilnya?")
    }
}

@Composable
internal fun TugasFormSheet(kontak: List<CrmContact>, deals: List<CrmDeal>, onDismiss: () -> Unit, onSimpan: (deskripsi: String, kontakId: Int?, dealId: Int?, deadline: String?) -> Unit) {
    var deskripsi by remember { mutableStateOf("") }
    var kontakId by remember { mutableStateOf<String?>(null) }
    var dealId by remember { mutableStateOf<String?>(null) }
    var deadline by remember { mutableStateOf("") }
    FormSheet(
        judul = "Tugas follow-up", onDismiss = onDismiss, simpanAktif = deskripsi.isNotBlank(),
        onSimpan = { onSimpan(deskripsi.trim(), kontakId?.toIntOrNull(), dealId?.toIntOrNull(), deadline.ifBlank { null }) }
    ) {
        BizTextField(deskripsi, { deskripsi = it }, "Apa yang harus dilakukan? *", singleLine = false)
        PilihanField("Kontak (opsional)", listOf("" to "— Tanpa kontak —") + kontak.map { it.id.toString() to it.nama }, kontakId ?: "", { kontakId = it.ifBlank { null } }, placeholder = "Pilih kontak")
        PilihanField("Deal (opsional)", listOf("" to "— Tanpa deal —") + deals.map { it.id.toString() to namaDealTampil(it) }, dealId ?: "", { dealId = it.ifBlank { null } }, placeholder = "Pilih deal")
        TanggalField("Tenggat (opsional)", deadline, { deadline = it })
    }
}

// ─── Detail ───────────────────────────────────────────────────────────────

/** Detail deal: pindah tahap, ubah, hapus, dan jadwalkan tugas. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun DealDetailSheet(
    deal: CrmDeal, onDismiss: () -> Unit, onPindah: (String) -> Unit, onUbah: () -> Unit, onHapus: () -> Unit
) {
    var konfirmasi by remember { mutableStateOf(false) }
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = MaterialTheme.colorScheme.surface) {
        Column(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 20.dp).padding(bottom = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconBadge(Icons.Rounded.Handshake, warnaTahap(deal.stage), size = 48.dp, iconSize = 24.dp)
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(namaDealTampil(deal), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text(deal.dealValue.rupiah(), style = MaterialTheme.typography.titleMedium, color = BizgrowColors.Success, fontWeight = FontWeight.Bold)
                }
                StatusChip(labelTahap(deal.stage), warnaTahap(deal.stage))
            }
            val sub = listOf(deal.contactName, deal.companyName, deal.phone).filter { it.isNotBlank() }
            if (sub.isNotEmpty()) Text(sub.joinToString(" • "), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            if (deal.createdAt.isNotBlank()) Text("Dibuat ${deal.createdAt.take(10)}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)

            Text("Pindahkan ke tahap", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TAHAP_DEAL.forEach { (id, label) ->
                    FilterPill(label, deal.stage.uppercase() == id, { if (deal.stage.uppercase() != id) onPindah(id) })
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                BizOutlineButton("Hapus", onClick = { konfirmasi = true }, icon = Icons.Rounded.DeleteOutline, tint = BizgrowColors.Danger)
                BizButton("Ubah deal", onClick = onUbah, modifier = Modifier.weight(1f), icon = Icons.Rounded.Edit)
            }
        }
    }
    if (konfirmasi) KonfirmasiHapus("Hapus deal?", "\"${namaDealTampil(deal)}\" akan dihapus permanen.", { konfirmasi = false; onHapus() }, { konfirmasi = false })
}

/** Detail kontak: info, deal terkait, riwayat aktivitas, aksi cepat. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun KontakDetailSheet(
    kontak: CrmContact, deals: List<CrmDeal>, aktivitas: List<CrmActivity>,
    onDismiss: () -> Unit, onUbah: () -> Unit, onHapus: () -> Unit, onCatat: () -> Unit
) {
    var konfirmasi by remember { mutableStateOf(false) }
    val deal = deals.filter { it.kontakId == kontak.id }
    val riwayat = aktivitas.filter { it.kontakId == kontak.id }.take(8)
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = MaterialTheme.colorScheme.surface) {
        LazyColumn(Modifier.fillMaxWidth().navigationBarsPadding(), contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Inisial(kontak.nama, warnaTahapKontak(kontak.stage))
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(kontak.nama, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                        if (kontak.perusahaan.isNotBlank()) Text(kontak.perusahaan, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    StatusChip(labelTahapKontak(kontak.stage), warnaTahapKontak(kontak.stage))
                }
            }
            if (kontak.telepon.isNotBlank()) item { InfoBaris(Icons.Rounded.Call, kontak.telepon) }
            if (kontak.email.isNotBlank()) item { InfoBaris(Icons.Rounded.Email, kontak.email) }
            item { InfoBaris(Icons.Rounded.Source, "Sumber: ${kontak.sumber}") }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    BizOutlineButton("Catat aktivitas", onClick = onCatat, icon = Icons.Rounded.EventNote, modifier = Modifier.weight(1f))
                    BizOutlineButton("Ubah", onClick = onUbah, icon = Icons.Rounded.Edit)
                }
            }
            item { SectionTitle("Deal (${deal.size})") }
            if (deal.isEmpty()) item { Text("Belum ada deal untuk kontak ini.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            items(deal, key = { "d${it.id}" }) { d -> KartuDeal(d) {} }
            item { SectionTitle("Aktivitas terbaru") }
            if (riwayat.isEmpty()) item { Text("Belum ada aktivitas.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            items(riwayat, key = { "a${it.id}" }) { a -> BarisAktivitas(a) }
            item {
                BizOutlineButton("Hapus kontak", onClick = { konfirmasi = true }, icon = Icons.Rounded.DeleteOutline, tint = BizgrowColors.Danger, modifier = Modifier.fillMaxWidth())
            }
        }
    }
    if (konfirmasi) KonfirmasiHapus(
        "Hapus kontak?",
        "\"${kontak.nama}\" dan seluruh riwayat aktivitasnya akan dihapus. Deal yang terkait tetap ada tanpa kontak.",
        { konfirmasi = false; onHapus() }, { konfirmasi = false }
    )
}

@Composable
private fun InfoBaris(ikon: ImageVector, teks: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(ikon, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(10.dp))
        Text(teks, style = MaterialTheme.typography.bodyMedium)
    }
}

// ─── Pengikat state → UI agar tiap layar tidak mengulang kode ──────────────

/** Satu tempat untuk semua dialog/lembar CRM. Panggil [buka*] dari layar mana pun. */
@Stable
internal class CrmDialogs {
    var deal by mutableStateOf<CrmDeal?>(null)
    var ubahDeal by mutableStateOf<CrmDeal?>(null)
    var dealBaru by mutableStateOf(false)
    var kontak by mutableStateOf<CrmContact?>(null)
    var ubahKontak by mutableStateOf<CrmContact?>(null)
    var kontakBaru by mutableStateOf(false)
    var aktivitasBaru by mutableStateOf(false)
    var aktivitasUntuk by mutableStateOf<Int?>(null)
    var tugasBaru by mutableStateOf(false)
}

@Composable
internal fun CrmDialogHost(vm: AppViewModel, d: CrmDialogs) {
    val deals by vm.crmDeals.collectAsState(initial = vm.crmDeals.value)
    val kontak by vm.crmContacts.collectAsState(initial = vm.crmContacts.value)
    val aktivitas by vm.crmActivities.collectAsState(initial = vm.crmActivities.value)

    if (d.dealBaru) DealFormSheet(null, kontak, { d.dealBaru = false }) { nama, nilai, tahap, kontakId, namaKontak, perusahaan, telepon ->
        vm.createDeal(namaKontak.ifBlank { nama }, perusahaan, nilai, tahap, telepon, nama, kontakId)
        d.dealBaru = false
    }
    d.ubahDeal?.let { deal ->
        DealFormSheet(deal, kontak, { d.ubahDeal = null }) { nama, nilai, _, _, _, _, _ ->
            vm.ubahDeal(deal.id, nama, nilai); d.ubahDeal = null
        }
    }
    d.deal?.let { dipilih ->
        // Ambil versi terbaru agar tahap yang baru dipindah langsung tampil.
        val terbaru = deals.firstOrNull { it.id == dipilih.id } ?: dipilih
        DealDetailSheet(
            terbaru, { d.deal = null },
            onPindah = { vm.updateDealStage(dipilih.id, it) },
            onUbah = { d.ubahDeal = terbaru; d.deal = null },
            onHapus = { vm.deleteDeal(dipilih.id); d.deal = null }
        )
    }

    if (d.kontakBaru) KontakFormSheet(null, { d.kontakBaru = false }) { nama, telepon, email, perusahaan, stage ->
        vm.createContact(nama, telepon, email, perusahaan, stage); d.kontakBaru = false
    }
    d.ubahKontak?.let { k ->
        KontakFormSheet(k, { d.ubahKontak = null }) { nama, telepon, email, perusahaan, stage ->
            vm.ubahKontak(k.id, nama, telepon, email, perusahaan, stage); d.ubahKontak = null
        }
    }
    d.kontak?.let { dipilih ->
        val terbaru = kontak.firstOrNull { it.id == dipilih.id } ?: dipilih
        KontakDetailSheet(
            terbaru, deals, aktivitas, { d.kontak = null },
            onUbah = { d.ubahKontak = terbaru; d.kontak = null },
            onHapus = { vm.hapusKontak(dipilih.id); d.kontak = null },
            onCatat = { d.aktivitasUntuk = dipilih.id; d.aktivitasBaru = true }
        )
    }

    if (d.aktivitasBaru) AktivitasFormSheet(kontak, d.aktivitasUntuk, { d.aktivitasBaru = false; d.aktivitasUntuk = null }) { kontakId, tipe, catatan ->
        vm.catatAktivitas(kontakId, tipe, catatan); d.aktivitasBaru = false; d.aktivitasUntuk = null
    }
    if (d.tugasBaru) TugasFormSheet(kontak, deals, { d.tugasBaru = false }) { deskripsi, kontakId, dealId, deadline ->
        vm.buatTugasCrm(deskripsi, kontakId, dealId, deadline); d.tugasBaru = false
    }
}
