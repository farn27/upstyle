package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.upstyle.bizgrow.data.TicketMessage
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.design.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors

/** Detail tiket: info, ubah status/prioritas, percakapan, dan balasan. */
@Composable
fun TicketDetailScreen(viewModel: AppViewModel, ticketId: Int) {
    val messages by viewModel.ticketMessages.collectAsState(initial = viewModel.ticketMessages.value)
    val tickets by viewModel.tickets.collectAsState(initial = viewModel.tickets.value)
    val tiket = tickets.firstOrNull { it.id == ticketId }
    var balasan by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    LaunchedEffect(ticketId) { viewModel.loadTicketMessages(ticketId); if (tiket == null) viewModel.loadTickets() }
    LaunchedEffect(messages.size) { if (messages.isNotEmpty()) listState.animateScrollToItem(messages.size) }

    BizScreen(
        title = tiket?.subject ?: "Tiket #$ticketId",
        subtitle = tiket?.let { listOf(it.customerName, it.ticketNumber).filter { s -> s.isNotBlank() }.joinToString(" • ") },
        onBack = { viewModel.navigateBack() },
        actions = { BizIconButton(Icons.Rounded.Refresh, "Muat ulang") { viewModel.loadTicketMessages(ticketId); viewModel.loadTickets() } },
        bottomBar = {
            Surface(tonalElevation = 3.dp, shadowElevation = 6.dp) {
                Row(Modifier.fillMaxWidth().navigationBarsPadding().imePadding().padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    BizTextField(balasan, { balasan = it }, "Balas pelanggan…", Modifier.weight(1f), singleLine = false)
                    Spacer(Modifier.width(8.dp))
                    BizIconButton(Icons.Rounded.Send, "Kirim balasan") {
                        if (balasan.isNotBlank()) { viewModel.replyTicket(ticketId, balasan.trim()); balasan = "" }
                    }
                }
            }
        }
    ) { padding ->
        LazyColumn(
            Modifier.fillMaxSize().padding(padding), state = listState,
            contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            if (tiket != null) item(key = "info") {
                BizSurface(Modifier.fillMaxWidth(), contentPadding = PaddingValues(14.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        StatusChip(labelStatusTiket(tiket.status), warnaStatusTiket(tiket.status))
                        StatusChip("Prioritas ${labelPrioritas(tiket.priority).lowercase()}", warnaPrioritas(tiket.priority))
                    }
                    if (tiket.description.isNotBlank()) {
                        Spacer(Modifier.height(8.dp))
                        Text(tiket.description, style = MaterialTheme.typography.bodyMedium)
                    }
                    Spacer(Modifier.height(10.dp))
                    Text("Ubah status", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Row(Modifier.horizontalScroll(rememberScrollState()).padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        STATUS_TIKET.forEach { (id, label) ->
                            FilterPill(label, normStatusTiket(tiket.status) == id, { if (normStatusTiket(tiket.status) != id) viewModel.updateTicketStatus(ticketId, id) })
                        }
                    }
                    Spacer(Modifier.height(10.dp))
                    Text("Prioritas", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Row(Modifier.horizontalScroll(rememberScrollState()).padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        PRIORITAS_TIKET.forEach { (id, label) ->
                            FilterPill(label, tiket.priority.uppercase() == id, { if (tiket.priority.uppercase() != id) viewModel.updateTicketPriority(ticketId, id) })
                        }
                    }
                }
            }
            if (messages.isEmpty()) item(key = "kosong") {
                EmptyView("Belum ada pesan", "Balas pelanggan lewat kolom di bawah.", Icons.Rounded.ChatBubbleOutline)
            }
            items(messages, key = { it.id }) { MessageBubble(it) }
        }
    }
}

@Composable
fun MessageBubble(msg: TicketMessage) {
    val agen = msg.senderType == "agent"
    Row(Modifier.fillMaxWidth(), horizontalArrangement = if (agen) Arrangement.End else Arrangement.Start) {
        Column(horizontalAlignment = if (agen) Alignment.End else Alignment.Start, modifier = Modifier.widthIn(max = 300.dp)) {
            Text(
                msg.message,
                modifier = Modifier.clip(RoundedCornerShape(topStart = 18.dp, topEnd = 18.dp, bottomStart = if (agen) 18.dp else 4.dp, bottomEnd = if (agen) 4.dp else 18.dp))
                    .background(if (agen) BizgrowColors.Primary else MaterialTheme.colorScheme.surfaceVariant)
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                color = if (agen) androidx.compose.ui.graphics.Color.White else MaterialTheme.colorScheme.onSurface,
                style = MaterialTheme.typography.bodyMedium
            )
            Text(
                listOfNotNull(msg.senderName?.takeIf { it.isNotBlank() }, msg.createdAt.tanggalJam().takeIf { it.isNotBlank() }).joinToString(" • "),
                style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
            )
        }
    }
}
