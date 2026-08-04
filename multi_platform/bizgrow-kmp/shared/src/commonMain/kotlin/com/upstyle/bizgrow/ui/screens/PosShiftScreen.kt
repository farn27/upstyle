package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.collectAsState
import com.upstyle.bizgrow.data.PosShift
import com.upstyle.bizgrow.ui.AppViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PosShiftScreen(viewModel: AppViewModel) {
    val posShifts by viewModel.posShifts.collectAsState()
    val activeShift by viewModel.activeShift.collectAsState()
    val uiState by viewModel.uiState.collectAsState()

    var showOpenShiftDialog by remember { mutableStateOf(false) }
    var showCloseShiftDialog by remember { mutableStateOf(false) }
    var modalAwal by remember { mutableStateOf("") }
    var kasAkhirAktual by remember { mutableStateOf("") }
    var catatan by remember { mutableStateOf("") }

    LaunchedEffect(Unit) { viewModel.loadPosShifts() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Manajemen Shift Kasir") },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali")
                    }
                }
            )
        },
        floatingActionButton = {
            if (activeShift == null) {
                ExtendedFloatingActionButton(
                    onClick = { showOpenShiftDialog = true },
                    icon = { Icon(Icons.Default.PlayArrow, null) },
                    text = { Text("Buka Shift") },
                    containerColor = Color(0xFF2E7D32)
                )
            } else {
                ExtendedFloatingActionButton(
                    onClick = { showCloseShiftDialog = true },
                    icon = { Icon(Icons.Default.Check, null) },
                    text = { Text("Tutup Shift") },
                    containerColor = Color(0xFFC62828)
                )
            }
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize().padding(16.dp)) {

            // Active Shift Banner
            activeShift?.let { shift ->
                Card(
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1B5E20)),
                    modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Shift Aktif", color = Color.White, fontSize = 12.sp)
                        Text("Dibuka: ${shift.waktuBuka}", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Spacer(Modifier.height(8.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Column {
                                Text("Modal Awal", color = Color.White.copy(alpha = 0.7f), fontSize = 12.sp)
                                Text(formatCurrency(shift.modalAwal), color = Color.White, fontWeight = FontWeight.Bold)
                            }
                            Surface(color = Color(0xFF4CAF50), shape = RoundedCornerShape(12.dp)) {
                                Text(" OPEN ", color = Color.White, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            } ?: Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)
            ) {
                Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                    Text("Tidak ada shift aktif. Buka shift untuk mulai kasir.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }

            Text("Riwayat Shift", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(8.dp))

            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(posShifts) { shift ->
                    ShiftItem(shift)
                }
            }
        }

        uiState.error?.let { msg ->
            LaunchedEffect(msg) { viewModel.clearMessages() }
        }
        uiState.successMessage?.let {
            LaunchedEffect(it) { viewModel.clearMessages() }
        }
    }

    // Open Shift Dialog
    if (showOpenShiftDialog) {
        AlertDialog(
            onDismissRequest = { showOpenShiftDialog = false },
            title = { Text("Buka Shift Kasir") },
            text = {
                Column {
                    Text("Masukkan modal awal kas:", style = MaterialTheme.typography.bodyMedium)
                    Spacer(Modifier.height(12.dp))
                    OutlinedTextField(
                        value = modalAwal,
                        onValueChange = { modalAwal = it },
                        label = { Text("Modal Awal (Rp)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp)
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val amount = modalAwal.toDoubleOrNull() ?: 0.0
                        viewModel.openShift(amount)
                        showOpenShiftDialog = false
                        modalAwal = ""
                    }
                ) { Text("Buka Shift") }
            },
            dismissButton = {
                TextButton(onClick = { showOpenShiftDialog = false }) { Text("Batal") }
            }
        )
    }

    // Close Shift Dialog
    if (showCloseShiftDialog && activeShift != null) {
        AlertDialog(
            onDismissRequest = { showCloseShiftDialog = false },
            title = { Text("Tutup Shift Kasir") },
            text = {
                Column {
                    Text("Kas Akhir Sistem: ${formatCurrency(activeShift!!.kasAkhir)}", style = MaterialTheme.typography.bodyMedium)
                    Spacer(Modifier.height(12.dp))
                    OutlinedTextField(
                        value = kasAkhirAktual,
                        onValueChange = { kasAkhirAktual = it },
                        label = { Text("Kas Akhir Aktual (Rp)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp)
                    )
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = catatan,
                        onValueChange = { catatan = it },
                        label = { Text("Catatan (opsional)") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp)
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val amount = kasAkhirAktual.toDoubleOrNull() ?: 0.0
                        viewModel.closeShift(activeShift!!.id, amount, catatan)
                        showCloseShiftDialog = false
                        kasAkhirAktual = ""
                        catatan = ""
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFC62828))
                ) { Text("Tutup Shift") }
            },
            dismissButton = {
                TextButton(onClick = { showCloseShiftDialog = false }) { Text("Batal") }
            }
        )
    }
}

@Composable
fun ShiftItem(shift: PosShift) {
    val isOpen = shift.status == "OPEN"
    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Text(if (isOpen) "Shift Aktif" else "Shift #${shift.id}", fontWeight = FontWeight.Bold)
                    Text(shift.waktuBuka, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Surface(
                    color = if (isOpen) Color(0xFF4CAF50) else Color.Gray,
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(shift.status, color = Color.White, fontSize = 11.sp, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                }
            }
            if (!isOpen) {
                Spacer(Modifier.height(8.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Kas Akhir: ${formatCurrency(shift.kasAkhirAktual)}", fontSize = 13.sp)
                    val selisih = shift.selisih
                    Text(
                        if (selisih >= 0) "+${formatCurrency(selisih)}" else formatCurrency(selisih),
                        fontSize = 13.sp,
                        color = if (selisih >= 0) Color(0xFF2E7D32) else Color(0xFFC62828),
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}
