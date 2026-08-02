package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.data.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CsInboxScreen(viewModel: AppViewModel) {
    var selectedTab by remember { mutableStateOf(0) }
    val tabs = listOf("Open", "In Progress", "Resolved")
    val tickets by viewModel.tickets.collectAsStateWithLifecycle()
    var showAddTicketSheet by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.loadTickets()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("CS Inbox") },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { showAddTicketSheet = true }) {
                Icon(Icons.Default.Add, contentDescription = "Buat Tiket")
            }
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            TabRow(selectedTabIndex = selectedTab) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = { Text(title) }
                    )
                }
            }

            val statusFilter = tabs[selectedTab]
            val filteredTickets = tickets.filter { it.status == statusFilter }

            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(filteredTickets) { ticket ->
                    Card(
                        modifier = Modifier.fillMaxWidth().clickable { viewModel.navigate(Screen.TicketDetail(ticket.id)) },
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(ticket.subject, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                                val priorityColor = when(ticket.priority.lowercase()) {
                                    "high" -> Color(0xFFC62828)
                                    "medium" -> Color(0xFFEF6C00)
                                    else -> Color.Gray
                                }
                                SuggestionChip(
                                    onClick = {},
                                    label = { Text(ticket.priority) },
                                    colors = SuggestionChipDefaults.suggestionChipColors(containerColor = priorityColor.copy(alpha = 0.1f))
                                )
                            }
                            Text("Pelanggan: ${ticket.customerName}", style = MaterialTheme.typography.bodyMedium)
                            Spacer(Modifier.height(8.dp))
                            Text(ticket.lastMessage ?: "", style = MaterialTheme.typography.bodySmall, maxLines = 1)
                            Text(ticket.createdAt, style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                        }
                    }
                }
            }
        }

        if (showAddTicketSheet) {
            ModalBottomSheet(onDismissRequest = { showAddTicketSheet = false }) {
                Column(Modifier.padding(16.dp)) {
                    Text("Buat Tiket Baru", style = MaterialTheme.typography.titleLarge)
                    Spacer(Modifier.height(16.dp))
                    OutlinedTextField(value = "", onValueChange = {}, label = { Text("Subjek") }, modifier = Modifier.fillMaxWidth())
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(value = "", onValueChange = {}, label = { Text("Prioritas") }, modifier = Modifier.fillMaxWidth())
                    Spacer(Modifier.height(16.dp))
                    Button(onClick = { showAddTicketSheet = false }, modifier = Modifier.fillMaxWidth()) { Text("Simpan") }
                    Spacer(Modifier.height(16.dp))
                }
            }
        }
    }
}
