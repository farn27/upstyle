package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.collectAsState
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.data.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CsInboxScreen(viewModel: AppViewModel) {
    val tickets by viewModel.tickets.collectAsState(initial = viewModel.tickets.value)
    val uiState by viewModel.uiState.collectAsState(initial = viewModel.uiState.value)
    var selectedTab by remember { mutableStateOf(0) }
    val tabs = listOf("Open", "In Progress", "Resolved", "Closed")
    var showAddTicketSheet by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { viewModel.loadTickets() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("CS Inbox") },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadTickets() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddTicketSheet = true },
                containerColor = MaterialTheme.colorScheme.background,
            ) {
                Icon(Icons.Default.Add, contentDescription = "Buat Tiket", tint = Color.White)
            }
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {

            // Stats banner
            val openCount = tickets.count { it.status == "Open" }
            val inProgressCount = tickets.count { it.status == "In Progress" }
            val highPrioCount = tickets.count { it.priority.equals("high", ignoreCase = true) }

            Surface(color = MaterialTheme.colorScheme.surfaceVariant) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceAround
                ) {
                    StatBadge("Open", openCount.toString(), Color(0xFF1565C0))
                    StatBadge("Aktif", inProgressCount.toString(), Color(0xFFEF6C00))
                    StatBadge("Prioritas Tinggi", highPrioCount.toString(), Color(0xFFC62828))
                    StatBadge("Total", tickets.size.toString(), MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            TabRow(selectedTabIndex = selectedTab) {
                tabs.forEachIndexed { index, title ->
                    val count = tickets.count { it.status == title }
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text(title, fontSize = 13.sp)
                                if (count > 0) {
                                    Badge { Text(count.toString()) }
                                }
                            }
                        }
                    )
                }
            }

            if (uiState.isLoading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            } else {
                val statusFilter = tabs[selectedTab]
                val filteredTickets = tickets.filter { it.status == statusFilter }

                if (filteredTickets.isEmpty()) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.Inbox, null, Modifier.size(64.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.3f))
                            Spacer(Modifier.height(8.dp))
                            Text("Tidak ada tiket $statusFilter", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp).padding(top = 12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(filteredTickets, key = { it.id }) { ticket ->
                            TicketCard(ticket = ticket, onClick = { viewModel.navigate(Screen.TicketDetail(ticket.id)) })
                        }
                        item { Spacer(Modifier.height(80.dp)) }
                    }
                }
            }
        }
    }

    if (showAddTicketSheet) {
        AddTicketSheet(
            onDismiss = { showAddTicketSheet = false },
            onSave = { subject, customerName, priority, message ->
                viewModel.createTicket(subject, customerName, priority, message)
                showAddTicketSheet = false
            }
        )
    }
}

@Composable
fun StatBadge(label: String, value: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = color)
        Text(label, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
fun TicketCard(ticket: SupportTicket, onClick: () -> Unit) {
    val priorityColor = when (ticket.priority.lowercase()) {
        "high" -> Color(0xFFC62828)
        "medium" -> Color(0xFFEF6C00)
        else -> Color(0xFF2E7D32)
    }
    val statusColor = when (ticket.status) {
        "Open" -> Color(0xFF1565C0)
        "In Progress" -> Color(0xFFEF6C00)
        "Resolved" -> Color(0xFF2E7D32)
        else -> Color.Gray
    }

    Card(
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                // Priority indicator
                Box(
                    modifier = Modifier.size(10.dp).clip(CircleShape).background(priorityColor)
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    "#${ticket.id} · ${ticket.subject}",
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f),
                    maxLines = 1
                )
                Surface(color = statusColor.copy(alpha = 0.1f), shape = RoundedCornerShape(12.dp)) {
                    Text(ticket.status, color = statusColor, fontSize = 11.sp, modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp), fontWeight = FontWeight.Bold)
                }
            }

            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Person, null, Modifier.size(14.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.width(4.dp))
                Text(ticket.customerName, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.weight(1f))
                Surface(
                    color = priorityColor.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text(
                        ticket.priority.uppercase(),
                        fontSize = 10.sp,
                        color = priorityColor,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            ticket.lastMessage?.let {
                Spacer(Modifier.height(6.dp))
                Text(it, style = MaterialTheme.typography.bodySmall, maxLines = 2, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }

            Spacer(Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.AccessTime, null, Modifier.size(12.dp), tint = Color.Gray)
                    Spacer(Modifier.width(4.dp))
                    Text(ticket.createdAt, fontSize = 11.sp, color = Color.Gray)
                }
                Icon(Icons.Default.ChevronRight, null, tint = MaterialTheme.colorScheme.primary)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddTicketSheet(
    onDismiss: () -> Unit,
    onSave: (subject: String, customerName: String, priority: String, message: String) -> Unit
) {
    var subject by remember { mutableStateOf("") }
    var customerName by remember { mutableStateOf("") }
    var priority by remember { mutableStateOf("medium") }
    var message by remember { mutableStateOf("") }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 8.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Text("Buat Tiket Baru", fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(16.dp))

            OutlinedTextField(
                value = subject,
                onValueChange = { subject = it },
                label = { Text("Subjek / Judul") },
                leadingIcon = { Icon(Icons.Default.Title, null) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                singleLine = true
            )
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = customerName,
                onValueChange = { customerName = it },
                label = { Text("Nama Pelanggan") },
                leadingIcon = { Icon(Icons.Default.Person, null) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                singleLine = true
            )
            Spacer(Modifier.height(12.dp))

            Text("Prioritas:", fontWeight = FontWeight.Medium)
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("low" to Color(0xFF2E7D32), "medium" to Color(0xFFEF6C00), "high" to Color(0xFFC62828)).forEach { (p, color) ->
                    FilterChip(
                        selected = priority == p,
                        onClick = { priority = p },
                        label = { Text(p.replaceFirstChar { it.uppercase() }) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = color.copy(alpha = 0.15f),
                            selectedLabelColor = color
                        )
                    )
                }
            }

            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = message,
                onValueChange = { message = it },
                label = { Text("Pesan Awal") },
                leadingIcon = { Icon(Icons.Default.Message, null) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                minLines = 3
            )

            Spacer(Modifier.height(16.dp))
            Button(
                onClick = {
                    if (subject.isNotBlank() && customerName.isNotBlank()) {
                        onSave(subject, customerName, priority, message)
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(20.dp),
                enabled = subject.isNotBlank() && customerName.isNotBlank()
            ) {
                Text("Buat Tiket", fontSize = 16.sp, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.height(32.dp))
        }
    }
}
