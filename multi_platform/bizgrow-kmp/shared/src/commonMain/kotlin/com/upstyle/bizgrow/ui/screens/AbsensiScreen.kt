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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.upstyle.bizgrow.ui.AppViewModel
import androidx.compose.animation.animateContentSize

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AbsensiScreen(viewModel: AppViewModel) {
    val hrData by viewModel.hrData.collectAsStateWithLifecycle()
    var selectedEmployeeId by remember { mutableStateOf("") }
    var showPinDialog by remember { mutableStateOf(false) }
    var isCheckingIn by remember { mutableStateOf(true) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Absensi Karyawan") },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali")
                    }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp)) {
            Text("Pilih Karyawan", fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 8.dp))
            // Dropdown placeholder
            OutlinedTextField(
                value = selectedEmployeeId,
                onValueChange = { selectedEmployeeId = it },
                label = { Text("ID Karyawan") },
                modifier = Modifier.fillMaxWidth().padding(bottom = 24.dp)
            )

            Text("Hari Ini: 01 Agustus 2026", style = MaterialTheme.typography.titleMedium, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center)
            Spacer(modifier = Modifier.height(32.dp))

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Button(
                    onClick = { 
                        isCheckingIn = true
                        showPinDialog = true
                    },
                    modifier = Modifier.weight(1f).height(64.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32))
                ) {
                    Text("CHECK-IN")
                }
                Button(
                    onClick = {
                        isCheckingIn = false
                        showPinDialog = true
                    },
                    modifier = Modifier.weight(1f).height(64.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFC62828))
                ) {
                    Text("CHECK-OUT")
                }
            }
            
            Spacer(modifier = Modifier.height(32.dp))
            Text("Riwayat Hari Ini", fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 8.dp))
            
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                val records = hrData?.attendance?.filter { it.date == "Hari Ini" } ?: emptyList()
                items(records) { record ->
                    Card(shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().animateContentSize()) {
                        Row(modifier = Modifier.padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Karyawan ID: ${record.employeeId}")
                            Text("${record.checkIn} - ${record.checkOut ?: "-"}", color = Color.Gray)
                        }
                    }
                }
            }
        }
    }

    if (showPinDialog) {
        AlertDialog(
            onDismissRequest = { showPinDialog = false },
            title = { Text("Masukkan PIN") },
            text = {
                OutlinedTextField(
                    value = "",
                    onValueChange = {},
                    label = { Text("PIN Karyawan") }
                )
            },
            confirmButton = {
                Button(onClick = {
                    val empId = selectedEmployeeId.toIntOrNull() ?: 0
                    val date = "Hari Ini" // Hardcoded for demo
                    val time = "08:00" // Hardcoded for demo
                    if (isCheckingIn) viewModel.checkIn(empId, date, time) else viewModel.checkOut(empId, date, time)
                    showPinDialog = false
                }) {
                    Text("Konfirmasi")
                }
            },
            dismissButton = {
                TextButton(onClick = { showPinDialog = false }) { Text("Batal") }
            }
        )
    }
}
