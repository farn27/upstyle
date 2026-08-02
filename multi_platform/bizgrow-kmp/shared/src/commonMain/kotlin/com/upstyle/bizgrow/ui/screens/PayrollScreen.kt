package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.upstyle.bizgrow.ui.AppViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PayrollScreen(viewModel: AppViewModel) {
    val hrData by viewModel.hrData.collectAsStateWithLifecycle()
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Manajemen Payroll") },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { /* show process sheet */ }) {
                Text("Proses")
            }
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp)) {
            // Month selector placeholder
            OutlinedButton(onClick = {}, modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)) {
                Text("Bulan: Agustus 2026")
            }
            
            Row(modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Card(modifier = Modifier.weight(1f), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Total Payroll", style = MaterialTheme.typography.labelSmall)
                        Text("Rp 15.000.000", fontWeight = FontWeight.Bold)
                    }
                }
                Card(modifier = Modifier.weight(1f)) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Karyawan", style = MaterialTheme.typography.labelSmall)
                        Text("3", fontWeight = FontWeight.Bold)
                    }
                }
            }
            
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                val records = hrData?.payroll ?: emptyList()
                items(records) { record ->
                    Card(shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                        Row(modifier = Modifier.padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Column {
                                Text("Karyawan ID: ${record.employeeId}", fontWeight = FontWeight.Bold)
                                Text("Rp ${"%,.0f".format(record.netSalary)}", color = MaterialTheme.colorScheme.primary)
                            }
                            Surface(color = if (record.status.equals("PAID", ignoreCase = true)) Color(0xFF2E7D32).copy(alpha = 0.1f) else Color(0xFFEF6C00).copy(alpha = 0.1f), shape = RoundedCornerShape(8.dp)) {
                                Text(record.status, color = if (record.status.equals("PAID", ignoreCase = true)) Color(0xFF2E7D32) else Color(0xFFEF6C00), modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}
