package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.collectAsState
import com.upstyle.bizgrow.ui.AppViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LeaveRequestsScreen(viewModel: AppViewModel) {
    val leaveRequests by viewModel.leaveRequests.collectAsState(initial = viewModel.leaveRequests.value)
    val uiState by viewModel.uiState.collectAsState(initial = viewModel.uiState.value)

    LaunchedEffect(Unit) {
        viewModel.loadLeaveRequests()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Pengajuan Cuti & Izin") },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali")
                    }
                }
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp)
        ) {
            if (uiState.isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else if (leaveRequests.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Belum ada riwayat pengajuan cuti", color = Color.Gray)
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(leaveRequests) { item ->
                        Card(
                            shape = RoundedCornerShape(20.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.DateRange,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(36.dp)
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("Tipe: ${item.type}", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                    Text("Tanggal: ${item.startDate} s/d ${item.endDate}", fontSize = 12.sp, color = Color.Gray)
                                    Text("Alasan: ${item.reason?.ifEmpty { "-" } ?: "-"}", fontSize = 12.sp, color = Color.Gray)
                                }
                                AssistChip(
                                    onClick = {},
                                    label = { Text(item.status, fontSize = 11.sp, fontWeight = FontWeight.Bold) },
                                    colors = AssistChipDefaults.assistChipColors(
                                        containerColor = when (item.status) {
                                            "APPROVED" -> MaterialTheme.colorScheme.primaryContainer
                                            "REJECTED" -> MaterialTheme.colorScheme.errorContainer
                                            else -> MaterialTheme.colorScheme.surface
                                        }
                                    )
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
