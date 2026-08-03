package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.upstyle.bizgrow.data.Employee
import com.upstyle.bizgrow.data.PayrollRecord
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.todayDate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PayrollScreen(viewModel: AppViewModel) {
    val hrData by viewModel.hrData.collectAsStateWithLifecycle()
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    // Month/year picker state — default to current month
    val today = todayDate() // e.g. "2026-08-02"
    val defaultMonth = today.take(7) // "2026-08"
    var selectedMonth by remember { mutableStateOf(defaultMonth) }

    var showProcessSheet by remember { mutableStateOf(false) }
    var selectedEmployee: Employee? by remember { mutableStateOf(null) }

    LaunchedEffect(Unit) { viewModel.loadHrData() }

    val payrollRecords = hrData?.payroll ?: emptyList()
    val filteredRecords = payrollRecords.filter { it.monthYear.startsWith(selectedMonth) }
    val totalPayroll = filteredRecords.sumOf { it.netSalary }
    val employees = hrData?.employees ?: emptyList()

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
            if (employees.isNotEmpty()) {
                ExtendedFloatingActionButton(
                    onClick = { showProcessSheet = true },
                    icon = { Icon(Icons.Default.Add, null) },
                    text = { Text("Proses Payroll") }
                )
            }
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp)) {
            Spacer(Modifier.height(12.dp))

            // Month selector
            MonthSelector(
                currentMonth = selectedMonth,
                onPrev = {
                    val parts = selectedMonth.split("-")
                    val y = parts[0].toInt(); val m = parts[1].toInt()
                    val newM = if (m == 1) 12 else m - 1
                    val newY = if (m == 1) y - 1 else y
                    selectedMonth = "$newY-${newM.toString().padStart(2, '0')}"
                },
                onNext = {
                    val parts = selectedMonth.split("-")
                    val y = parts[0].toInt(); val m = parts[1].toInt()
                    val newM = if (m == 12) 1 else m + 1
                    val newY = if (m == 12) y + 1 else y
                    selectedMonth = "$newY-${newM.toString().padStart(2, '0')}"
                }
            )

            Spacer(Modifier.height(12.dp))

            // Summary cards
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Card(modifier = Modifier.weight(1f), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant), shape = RoundedCornerShape(20.dp)) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Total Payroll", style = MaterialTheme.typography.labelSmall)
                        Text(formatCurrency(totalPayroll), fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    }
                }
                Card(modifier = Modifier.weight(1f), shape = RoundedCornerShape(20.dp)) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Karyawan Diproses", style = MaterialTheme.typography.labelSmall)
                        Text("${filteredRecords.size} / ${employees.size}", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            if (uiState.isLoading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            } else if (filteredRecords.isEmpty()) {
                Box(Modifier.fillMaxWidth().padding(top = 32.dp), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.MoneyOff, null, Modifier.size(64.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f))
                        Spacer(Modifier.height(8.dp))
                        Text("Belum ada payroll bulan ini", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(filteredRecords) { record ->
                        PayrollRecordCard(record, employees)
                    }
                    item { Spacer(Modifier.height(80.dp)) }
                }
            }
        }

        uiState.successMessage?.let { LaunchedEffect(it) { viewModel.clearMessages() } }
        uiState.error?.let { LaunchedEffect(it) { viewModel.clearMessages() } }
    }

    if (showProcessSheet) {
        ProcessPayrollSheet(
            employees = employees,
            onDismiss = { showProcessSheet = false },
            onProcess = { emp, monthYear, salary, allowance, deduction ->
                val net = salary + allowance - deduction
                viewModel.processPayroll(emp.id, monthYear, salary, allowance, deduction, net)
                showProcessSheet = false
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProcessPayrollSheet(
    employees: List<Employee>,
    onDismiss: () -> Unit,
    onProcess: (Employee, String, Double, Double, Double) -> Unit
) {
    var selectedEmployee by remember { mutableStateOf<Employee?>(null) }
    var expandedEmp by remember { mutableStateOf(false) }
    var monthYear by remember { mutableStateOf("") }
    var allowance by remember { mutableStateOf("0") }
    var deduction by remember { mutableStateOf("0") }

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
            Text("Proses Payroll", fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(16.dp))

            // Employee dropdown
            ExposedDropdownMenuBox(expanded = expandedEmp, onExpandedChange = { expandedEmp = !expandedEmp }) {
                OutlinedTextField(
                    value = selectedEmployee?.fullName ?: "Pilih Karyawan",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Karyawan") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedEmp) },
                    modifier = Modifier.menuAnchor().fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp)
                )
                ExposedDropdownMenu(expanded = expandedEmp, onDismissRequest = { expandedEmp = false }) {
                    employees.forEach { emp ->
                        DropdownMenuItem(
                            text = { Text("${emp.fullName} — ${emp.position}") },
                            onClick = { selectedEmployee = emp; expandedEmp = false }
                        )
                    }
                }
            }

            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = monthYear,
                onValueChange = { monthYear = it },
                label = { Text("Bulan/Tahun (YYYY-MM)") },
                placeholder = { Text("2026-08") },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp)
            )
            Spacer(Modifier.height(8.dp))

            selectedEmployee?.let { emp ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                    shape = RoundedCornerShape(20.dp)
                ) {
                    Row(modifier = Modifier.padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Gaji Pokok")
                        Text(formatCurrency(emp.salary), fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = allowance,
                onValueChange = { allowance = it },
                label = { Text("Tunjangan (Rp)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp)
            )
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = deduction,
                onValueChange = { deduction = it },
                label = { Text("Potongan (Rp)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp)
            )

            // Calculated net
            val salaryVal = selectedEmployee?.salary ?: 0.0
            val allowanceVal = allowance.toDoubleOrNull() ?: 0.0
            val deductionVal = deduction.toDoubleOrNull() ?: 0.0
            val netSalary = salaryVal + allowanceVal - deductionVal

            Spacer(Modifier.height(12.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                shape = RoundedCornerShape(20.dp)
            ) {
                Row(modifier = Modifier.padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Gaji Bersih", fontWeight = FontWeight.Bold)
                    Text(formatCurrency(netSalary), fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                }
            }

            Spacer(Modifier.height(16.dp))
            Button(
                onClick = {
                    val emp = selectedEmployee ?: return@Button
                    if (monthYear.isNotBlank()) {
                        onProcess(emp, monthYear, salaryVal, allowanceVal, deductionVal)
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(20.dp),
                enabled = selectedEmployee != null && monthYear.isNotBlank()
            ) {
                Text("Proses Payroll", fontSize = 16.sp, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.height(32.dp))
        }
    }
}

@Composable
fun PayrollRecordCard(record: PayrollRecord, employees: List<Employee>) {
    val employee = employees.firstOrNull { it.id == record.employeeId }
    val isPaid = record.status.equals("PAID", ignoreCase = true)

    Card(
        shape = RoundedCornerShape(20.dp),
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(employee?.fullName ?: "Karyawan #${record.employeeId}", fontWeight = FontWeight.Bold)
                    Text(employee?.position ?: "", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Surface(
                    color = if (isPaid) Color(0xFF2E7D32).copy(alpha = 0.1f) else Color(0xFFEF6C00).copy(alpha = 0.1f),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(
                        record.status,
                        color = if (isPaid) Color(0xFF2E7D32) else Color(0xFFEF6C00),
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
            Spacer(Modifier.height(12.dp))
            HorizontalDivider()
            Spacer(Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column {
                    Text("Gaji Pokok", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(formatCurrency(record.salary), fontWeight = FontWeight.Medium)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("Tunjangan", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("+${formatCurrency(record.allowance)}", color = Color(0xFF2E7D32))
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("Potongan", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("-${formatCurrency(record.deduction)}", color = Color(0xFFC62828))
                }
            }
            Spacer(Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Gaji Bersih", fontWeight = FontWeight.Bold)
                Text(formatCurrency(record.netSalary), fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary, fontSize = 16.sp)
            }
        }
    }
}

@Composable
fun MonthSelector(currentMonth: String, onPrev: () -> Unit, onNext: () -> Unit) {
    val parts = currentMonth.split("-")
    val year = parts.getOrNull(0) ?: ""
    val month = parts.getOrNull(1)?.toIntOrNull() ?: 1
    val monthNames = listOf("", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember")

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Row(
            modifier = Modifier.padding(8.dp).fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onPrev) {
                Icon(Icons.Default.ChevronLeft, null, tint = MaterialTheme.colorScheme.onPrimaryContainer)
            }
            Text(
                "${monthNames.getOrElse(month) { "?" }} $year",
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )
            IconButton(onClick = onNext) {
                Icon(Icons.Default.ChevronRight, null, tint = MaterialTheme.colorScheme.onPrimaryContainer)
            }
        }
    }
}
