package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.upstyle.bizgrow.data.AttendanceRecord
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.components.BizCard
import com.upstyle.bizgrow.ui.components.EmptyState
import com.upstyle.bizgrow.ui.components.StatusBadge
import com.upstyle.bizgrow.ui.todayDate
import com.upstyle.bizgrow.ui.currentTime
import com.upstyle.bizgrow.ui.theme.BizgrowColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AbsensiScreen(viewModel: AppViewModel) {
    val hrData by viewModel.hrData.collectAsStateWithLifecycle()
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    // PIN dialog state
    var showPinDialog by remember { mutableStateOf(false) }
    var pinInput by remember { mutableStateOf("") }
    var pinError by remember { mutableStateOf("") }
    var isCheckIn by remember { mutableStateOf(true) }
    var selectedEmployeeId by remember { mutableStateOf<Int?>(null) }
    var expandedEmpPicker by remember { mutableStateOf(false) }

    val employees = hrData?.employees ?: emptyList()
    val selectedEmp = employees.find { it.id == selectedEmployeeId }
    val todayRecords = hrData?.attendance ?: emptyList()

    LaunchedEffect(Unit) { viewModel.loadHrData() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Absensi Karyawan", fontWeight = FontWeight.Bold)
                        Text(todayDate(), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                navigationIcon = { IconButton(onClick = { viewModel.navigateBack() }) { Icon(Icons.Default.ArrowBack, null) } }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {

            // Ringkasan hari ini
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Card(modifier = Modifier.weight(1f), colors = CardDefaults.cardColors(containerColor = BizgrowColors.SuccessLight), shape = RoundedCornerShape(20.dp)) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Text("Hadir", style = MaterialTheme.typography.labelSmall, color = BizgrowColors.Success)
                        Text("${todayRecords.count { it.status == "HADIR" }}", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = BizgrowColors.Success)
                    }
                }
                Card(modifier = Modifier.weight(1f), colors = CardDefaults.cardColors(containerColor = BizgrowColors.DangerLight), shape = RoundedCornerShape(20.dp)) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Text("Alfa/Izin", style = MaterialTheme.typography.labelSmall, color = BizgrowColors.Danger)
                        Text("${todayRecords.count { it.status != "HADIR" }}", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = BizgrowColors.Danger)
                    }
                }
                Card(modifier = Modifier.weight(1f), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant), shape = RoundedCornerShape(20.dp)) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Text("Total", style = MaterialTheme.typography.labelSmall)
                        Text("${employees.size}", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    }
                }
            }

            // Pilih Karyawan
            ExposedDropdownMenuBox(expanded = expandedEmpPicker, onExpandedChange = { expandedEmpPicker = it }) {
                OutlinedTextField(
                    value = selectedEmp?.fullName ?: "Pilih Karyawan",
                    onValueChange = {}, readOnly = true,
                    label = { Text("Karyawan") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expandedEmpPicker) },
                    modifier = Modifier.menuAnchor().fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp)
                )
                ExposedDropdownMenu(expandedEmpPicker, { expandedEmpPicker = false }) {
                    employees.forEach { emp ->
                        DropdownMenuItem(
                            text = { Column { Text(emp.fullName, fontWeight = FontWeight.SemiBold); Text(emp.position, style = MaterialTheme.typography.bodySmall) } },
                            onClick = { selectedEmployeeId = emp.id; expandedEmpPicker = false }
                        )
                    }
                }
            }

            // Location Tracker instance
            val locationTracker = com.upstyle.bizgrow.device.rememberLocationTracker()
            var currentLocation by remember { mutableStateOf<com.upstyle.bizgrow.device.LocationData?>(null) }
            var locationError by remember { mutableStateOf<String?>(null) }

            // Tombol Check-In / Check-Out
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Button(
                    onClick = { 
                        locationTracker.getCurrentLocation(
                            onSuccess = { loc ->
                                currentLocation = loc
                                isCheckIn = true; pinInput = ""; pinError = ""; showPinDialog = true
                            },
                            onError = { err ->
                                locationError = err
                                // Tetap bolehkan absen walau tanpa GPS (atau bisa diblokir jika strict)
                                isCheckIn = true; pinInput = ""; pinError = ""; showPinDialog = true
                            }
                        )
                    },
                    modifier = Modifier.weight(1f).height(56.dp),
                    shape = RoundedCornerShape(20.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = BizgrowColors.Success),
                    enabled = selectedEmployeeId != null
                ) {
                    Icon(Icons.Default.Login, null, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("CHECK IN", fontWeight = FontWeight.Bold)
                }
                Button(
                    onClick = { 
                        locationTracker.getCurrentLocation(
                            onSuccess = { loc ->
                                currentLocation = loc
                                isCheckIn = false; pinInput = ""; pinError = ""; showPinDialog = true
                            },
                            onError = { err ->
                                locationError = err
                                isCheckIn = false; pinInput = ""; pinError = ""; showPinDialog = true
                            }
                        )
                    },
                    modifier = Modifier.weight(1f).height(56.dp),
                    shape = RoundedCornerShape(20.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = BizgrowColors.Danger),
                    enabled = selectedEmployeeId != null
                ) {
                    Icon(Icons.Default.Logout, null, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("CHECK OUT", fontWeight = FontWeight.Bold)
                }
            }

            if (locationError != null) {
                Text(locationError ?: "", color = BizgrowColors.Danger, style = MaterialTheme.typography.bodySmall, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center)
            } else if (currentLocation != null) {
                Text("Lokasi terdeteksi: ${currentLocation!!.latitude.toString().take(7)}, ${currentLocation!!.longitude.toString().take(7)}", color = BizgrowColors.Success, style = MaterialTheme.typography.bodySmall, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center)
            }

            if (selectedEmployeeId == null) {
                Text("Pilih karyawan terlebih dahulu", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
            }

            // Riwayat hari ini
            Text("Riwayat Absensi Hari Ini", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)

            if (todayRecords.isEmpty()) {
                EmptyState(Icons.Default.AccessTime, "Belum ada catatan absensi hari ini")
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(todayRecords, key = { it.id }) { rec ->
                        AbsensiItemCard(rec, employees.find { it.id == rec.employeeId }?.fullName)
                    }
                }
            }
        }
    }

    // PIN Dialog
    if (showPinDialog) {
        AlertDialog(
            onDismissRequest = { showPinDialog = false },
            title = { Text(if (isCheckIn) "Konfirmasi Check In" else "Konfirmasi Check Out", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("${selectedEmp?.fullName} — ${currentTime()}", style = MaterialTheme.typography.bodyMedium)
                    OutlinedTextField(
                        value = pinInput,
                        onValueChange = { if (it.length <= 6) pinInput = it; pinError = "" },
                        label = { Text("PIN Karyawan") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                        isError = pinError.isNotEmpty(),
                        supportingText = if (pinError.isNotEmpty()) {{ Text(pinError, color = MaterialTheme.colorScheme.error) }} else null,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp)
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (pinInput.length < 4) { pinError = "PIN minimal 4 digit"; return@Button }
                        val empId = selectedEmployeeId ?: return@Button
                        val date = todayDate()
                        val time = currentTime()
                        if (isCheckIn) viewModel.checkIn(empId, date, time)
                        else viewModel.checkOut(empId, date, time)
                        showPinDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = if (isCheckIn) BizgrowColors.Success else BizgrowColors.Danger)
                ) { Text(if (isCheckIn) "Check In" else "Check Out") }
            },
            dismissButton = { TextButton(onClick = { showPinDialog = false }) { Text("Batal") } }
        )
    }
}

@Composable
fun AbsensiItemCard(rec: AttendanceRecord, employeeName: String?) {
    val isHadir = rec.status == "HADIR"
    BizCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier.size(42.dp).clip(CircleShape)
                    .background(if (isHadir) BizgrowColors.SuccessLight else BizgrowColors.DangerLight),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    if (isHadir) Icons.Default.CheckCircle else Icons.Default.Cancel, null,
                    tint = if (isHadir) BizgrowColors.Success else BizgrowColors.Danger,
                    modifier = Modifier.size(22.dp)
                )
            }
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(employeeName ?: "Karyawan #${rec.employeeId}", fontWeight = FontWeight.SemiBold)
                Text("${rec.date}  ·  Masuk: ${rec.checkIn}${rec.checkOut?.let { "  ·  Keluar: $it" } ?: ""}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            StatusBadge(rec.status)
        }
    }
}
