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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.data.*
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors

/** Status & prioritas tiket memakai nilai server (OPEN, IN_PROGRESS, RESOLVED, CLOSED / LOW..URGENT). */
internal val STATUS_TIKET = listOf("OPEN" to "Terbuka", "IN_PROGRESS" to "Diproses", "RESOLVED" to "Selesai", "CLOSED" to "Ditutup")
internal val PRIORITAS_TIKET = listOf("LOW" to "Rendah", "MEDIUM" to "Sedang", "HIGH" to "Tinggi", "URGENT" to "Mendesak")

internal fun normStatusTiket(s: String): String = s.trim().uppercase().replace(' ', '_').replace('-', '_')
internal fun labelStatusTiket(s: String): String = STATUS_TIKET.firstOrNull { it.first == normStatusTiket(s) }?.second ?: s
internal fun labelPrioritas(s: String): String = PRIORITAS_TIKET.firstOrNull { it.first == s.trim().uppercase() }?.second ?: s

internal fun warnaStatusTiket(s: String): Color = when (normStatusTiket(s)) {
    "OPEN" -> BizgrowColors.Info
    "IN_PROGRESS" -> BizgrowColors.Warning
    "RESOLVED" -> BizgrowColors.Success
    else -> Color(0xFF64748B)
}

internal fun warnaPrioritas(s: String): Color = when (s.trim().uppercase()) {
    "URGENT" -> BizgrowColors.Danger
    "HIGH" -> BizgrowColors.Warning
    "LOW" -> Color(0xFF64748B)
    else -> BizgrowColors.Info
}

@Composable
fun CsInboxScreen(viewModel: AppViewModel) {
    val tickets by viewModel.tickets.collectAsState(initial = viewModel.tickets.value)
    val csState by viewModel.csState.collectAsState(initial = viewModel.csState.value)
    val kontak by viewModel.crmContacts.collectAsState(initial = viewModel.crmContacts.value)
    var filter by remember { mutableStateOf("AKTIF") }
    var cari by remember { mutableStateOf("") }
    var baru by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { viewModel.loadTickets(); viewModel.loadCrmData() }

    val terbuka = tickets.count { normStatusTiket(it.status) == "OPEN" }
    val diproses = tickets.count { normStatusTiket(it.status) == "IN_PROGRESS" }
    val mendesak = tickets.count { it.priority.uppercase() in listOf("HIGH", "URGENT") && normStatusTiket(it.status) in listOf("OPEN", "IN_PROGRESS") }

    val tampil = tickets.filter {
        val st = normStatusTiket(it.status)
        val cocok = when (filter) { "SEMUA" -> true; "AKTIF" -> st == "OPEN" || st == "IN_PROGRESS"; else -> st == filter }
        cocok && (cari.isBlank() || it.subject.contains(cari, true) || it.customerName.contains(cari, true) || it.ticketNumber.contains(cari, true))
    }

    BizScreen(
        title = "Inbox CS", subtitle = "${tickets.size} tiket", onBack = { viewModel.navigateBack() },
        actions = {
            BizIconButton(Icons.Rounded.MenuBook, "Knowledge base") { viewModel.navigate(Screen.KnowledgeBase) }
            BizIconButton(Icons.Rounded.Refresh, "Muat ulang") { viewModel.loadTickets() }
        },
        floatingActionButton = { FabTambah("Tiket") { baru = true } }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatTile("Terbuka", "$terbuka", Icons.Rounded.MarkEmailUnread, BizgrowColors.Info, Modifier.weight(1f))
                StatTile("Diproses", "$diproses", Icons.Rounded.SupportAgent, BizgrowColors.Warning, Modifier.weight(1f))
                StatTile("Mendesak", "$mendesak", Icons.Rounded.PriorityHigh, BizgrowColors.Danger, Modifier.weight(1f))
            }
            BizSearchField(cari, { cari = it }, "Cari subjek, pelanggan, nomor…", Modifier.padding(horizontal = 16.dp, vertical = 4.dp))
            Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterPill("Aktif", filter == "AKTIF", { filter = "AKTIF" })
                STATUS_TIKET.drop(2).forEach { (id, label) -> FilterPill(label, filter == id, { filter = id }) }
                FilterPill("Semua", filter == "SEMUA", { filter = "SEMUA" })
            }
            when {
                csState.isLoading && tickets.isEmpty() -> SkeletonList(5, Modifier.padding(16.dp))
                tampil.isEmpty() -> EmptyView(
                    if (tickets.isEmpty()) "Belum ada tiket" else "Tidak ada tiket di filter ini",
                    "Catat keluhan atau pertanyaan pelanggan sebagai tiket agar tidak ada yang terlewat.",
                    Icons.Rounded.SupportAgent, if (tickets.isEmpty()) "Buat tiket" else null, if (tickets.isEmpty()) ({ baru = true }) else null
                )
                else -> LazyColumn(contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 96.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(tampil, key = { it.id }) { t -> KartuTiket(t) { viewModel.navigate(Screen.TicketDetail(t.id)) } }
                }
            }
        }
    }

    if (baru) TiketBaruSheet(kontak, { baru = false }) { subjek, pelanggan, prioritas, pesan ->
        viewModel.createTicket(subjek, pelanggan, prioritas, pesan); baru = false
    }
}

@Composable
internal fun KartuTiket(t: SupportTicket, onClick: () -> Unit) {
    val warna = warnaPrioritas(t.priority)
    BizSurface(Modifier.fillMaxWidth(), onClick = onClick, contentPadding = PaddingValues(14.dp)) {
        Row(verticalAlignment = Alignment.Top) {
            IconBadge(Icons.Rounded.SupportAgent, warnaStatusTiket(t.status), size = 44.dp, iconSize = 22.dp)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(t.subject, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Text(listOf(t.customerName, t.ticketNumber).filter { it.isNotBlank() }.joinToString(" • "), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                val terakhir = t.lastMessage?.takeIf { it.isNotBlank() }
                if (terakhir != null) Text(terakhir, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Spacer(Modifier.height(6.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    StatusChip(labelStatusTiket(t.status), warnaStatusTiket(t.status))
                    StatusChip(labelPrioritas(t.priority), warna)
                }
            }
            Text(t.updatedAt.take(10), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
internal fun TiketBaruSheet(kontak: List<CrmContact>, onDismiss: () -> Unit, onSimpan: (subjek: String, pelanggan: String, prioritas: String, pesan: String) -> Unit) {
    var subjek by remember { mutableStateOf("") }
    var pelanggan by remember { mutableStateOf("") }
    var prioritas by remember { mutableStateOf("MEDIUM") }
    var pesan by remember { mutableStateOf("") }
    FormSheet(
        judul = "Tiket baru", onDismiss = onDismiss, simpanAktif = subjek.isNotBlank() && pelanggan.isNotBlank(),
        onSimpan = { onSimpan(subjek.trim(), pelanggan.trim(), prioritas, pesan.trim()) }
    ) {
        BizTextField(subjek, { subjek = it }, "Subjek *", placeholder = "mis. Pesanan belum sampai")
        if (kontak.isNotEmpty()) PilihanField("Pilih dari kontak", kontak.map { it.nama to it.nama }, null, { pelanggan = it }, placeholder = "Pilih pelanggan yang sudah ada")
        BizTextField(pelanggan, { pelanggan = it }, "Nama pelanggan *")
        PilihanPil("Prioritas", PRIORITAS_TIKET, prioritas) { prioritas = it }
        BizTextField(pesan, { pesan = it }, "Pesan awal", singleLine = false, placeholder = "Ceritakan masalah pelanggan")
    }
}
