package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.data.*
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TicketDetailScreen(viewModel: AppViewModel, ticketId: Int) {
    val messages by viewModel.ticketMessages.collectAsStateWithLifecycle()
    var replyText by remember { mutableStateOf("") }
    var showStatusMenu by remember { mutableStateOf(false) }

    LaunchedEffect(ticketId) {
        viewModel.loadTicketMessages(ticketId)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Detail Tiket #$ticketId") },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali")
                    }
                },
                actions = {
                    Box {
                        TextButton(onClick = { showStatusMenu = true }) {
                            Text("Status")
                        }
                        DropdownMenu(expanded = showStatusMenu, onDismissRequest = { showStatusMenu = false }) {
                            DropdownMenuItem(text = { Text("Open") }, onClick = { showStatusMenu = false })
                            DropdownMenuItem(text = { Text("In Progress") }, onClick = { showStatusMenu = false })
                            DropdownMenuItem(text = { Text("Resolved") }, onClick = { showStatusMenu = false })
                            DropdownMenuItem(text = { Text("Closed") }, onClick = { showStatusMenu = false })
                        }
                    }
                }
            )
        },
        bottomBar = {
            Surface(modifier = Modifier.fillMaxWidth().padding(8.dp), tonalElevation = 8.dp) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(8.dp)) {
                    OutlinedTextField(
                        value = replyText,
                        onValueChange = { replyText = it },
                        modifier = Modifier.weight(1f),
                        placeholder = { Text("Ketik balasan...") }
                    )
                    Spacer(Modifier.width(8.dp))
                    IconButton(onClick = {
                        if (replyText.isNotBlank()) {
                            viewModel.replyTicket(ticketId, replyText)
                            replyText = ""
                        }
                    }) {
                        Icon(Icons.Default.Send, contentDescription = "Kirim", tint = MaterialTheme.colorScheme.primary)
                    }
                }
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.padding(padding).fillMaxSize().padding(horizontal = 16.dp),
            reverseLayout = true,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(messages.reversed()) { msg ->
                val isAgent = msg.senderType == "agent"
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = if (isAgent) Arrangement.End else Arrangement.Start
                ) {
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = if (isAgent) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant
                        ),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(msg.message, color = if (isAgent) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(msg.createdAt, style = MaterialTheme.typography.labelSmall, modifier = Modifier.align(Alignment.End))
                        }
                    }
                }
            }
        }
    }
}
