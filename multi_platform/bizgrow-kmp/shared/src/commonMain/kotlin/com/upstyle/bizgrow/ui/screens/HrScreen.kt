package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.runtime.collectAsState
import com.upstyle.bizgrow.data.*
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.components.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors
import com.upstyle.bizgrow.ui.todayDate
import com.upstyle.bizgrow.ui.currentTime

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HrScreen(viewModel: AppViewModel) {
    var selectedTab by remember { mutableStateOf(0) }
    val tabs = listOf("Karyawan", "Absensi", "Payroll", "Cuti")
    val hrData by viewModel.hrData.collectAsState(initial = viewModel.hrData.value)
    val uiState by viewModel.uiState.collectAsState(initial = viewModel.uiState.value)
    var showAddSheet by remember { mutableStateOf(false) }
    var showPayrollSheet by remember { mutableStateOf(false) }
    var expandedEmployeeId by remember { mutableStateOf<Int?>(null) }

    LaunchedEffect(Unit) { viewModel.loadHrData() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Column {
                    Text("HR & SDM", fontWeight = FontWeight.Bold)
                    Text("${hrData?.employees?.size ?: 0} karyawan aktif", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }},
                navigationIcon = { IconButton(onClick = { viewModel.navigateBack() }) { Icon(Icons.Default.ArrowBack, null) } },
                actions = {
                    IconButton(onClick = { viewModel.navigate(Screen.LeaveRequests) }) { Icon(Icons.Default.DateRange, contentDescription = "Cuti & Izin") }
                    IconButton(onClick = { viewModel.navigate(Screen.Payroll) }) { Icon(Icons.Default.Receipt, contentDescription = "Payroll") }
                    IconButton(onClick = { viewModel.navigate(Screen.Absensi) }) { Icon(Icons.Default.AccessTime, contentDescription = "Absensi") }
                }
            )
        },
        floatingActionButton = {
            when (selectedTab) {
                0 -> ExtendedFloatingActionButton(onClick = { showAddSheet = true }, icon = { Icon(Icons.Default.PersonAdd, null) }, text = { Text("Karyawan Baru") })
                2 -> ExtendedFloatingActionButton(onClick = { showPayrollSheet = true }, icon = { Icon(Icons.Default.Payments, null) }, text = { Text("Proses Payroll") })
                else -> {}
            }
        },
        bottomBar = { BottomNavBar(viewModel, Screen.Hr) }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {

            // Summary Row
            Row(modifier = Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatCard("Karyawan", "${hrData?.employees?.size ?: 0}", icon = Icons.Default.People,
                    gradient = BizgrowColors.GradPrimary, modifier = Modifier.weight(1f))
                StatCard("Hadir Hari Ini", "${hrData?.attendance?.count { it.status == "HADIR" } ?: 0}",
                    icon = Icons.Default.CheckCircle, gradient = BizgrowColors.GradSuccess, modifier = Modifier.weight(1f))
            }

            ScrollableTabRow(selectedTabIndex = selectedTab, edgePadding = 16.dp) {
                tabs.forEachIndexed { i, t -> Tab(selected = selectedTab == i, onClick = { selectedTab = i }, text = { Text(t) }) }
            }

            when (selectedTab) {
                0 -> EmployeeTab(hrData?.employees ?: emptyList(), expandedEmployeeId,
                    onToggle = { expandedEmployeeId = if (expandedEmployeeId == it) null else it },
                    onDelete = { viewModel.deleteEmployee(it) },
                    onCheckIn = { id ->
                        viewModel.checkIn(id, todayDate(), currentTime())
                    },
                    onCheckOut = { id ->
                        viewModel.checkOut(id, todayDate(), currentTime())
                    }
                )
                1 -> AttendanceTab(hrData?.attendance ?: emptyList())
                2 -> PayrollHistoryTab(hrData?.payroll ?: emptyList())
                3 -> LeaveTab(hrData?.leaveRequests ?: emptyList())
            }
        }
    }

    if (showAddSheet) AddEmployeeBottomSheet(onDismiss = { showAddSheet = false }) { fullName, position, salary, pin, role, email, phone, division ->
        viewModel.createEmployee(fullName, position, salary, pin, role, email, phone, division)
        showAddSheet = false
    }

    if (showPayrollSheet) ProcessPayrollBottomSheet(
        employees = hrData?.employees ?: emptyList(),
        onDismiss = { showPayrollSheet = false },
        onSave = { empId, monthYear, salary, allowance, deduction, netSalary ->
            viewModel.processPayroll(empId, monthYear, salary, allowance, deduction, netSalary)
            showPayrollSheet = false
        }
    )
}

@Composable
fun EmployeeTab(
    employees: List<Employee>,
    expandedId: Int?,
    onToggle: (Int) -> Unit,
    onDelete: (Int) -> Unit,
    onCheckIn: (Int) -> Unit,
    onCheckOut: (Int) -> Unit
) {
    if (employees.isEmpty()) { EmptyState(Icons.Default.People, "Belum ada karyawan", "Tambah karyawan pertama Anda"); return }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        items(employees, key = { it.id }) { emp ->
            BizCard(onClick = { onToggle(emp.id) }) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier.size(48.dp).clip(CircleShape)
                            .background(Brush.linearGradient(BizgrowColors.GradPrimary)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(emp.fullName.first().toString(), color = Color.White, fontWeight = FontWeight.Bold)
                    }
                    Spacer(modifier = Modifier.width(14.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(emp.fullName, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text("${emp.position} · ${emp.placementLocation ?: emp.role}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(emp.salary.toRupiah(), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                    }
                    StatusBadge(emp.employmentStatus ?: "-")
                }
                if (expandedId == emp.id) {
                    Spacer(modifier = Modifier.height(12.dp))
                    HorizontalDivider()
                    Spacer(modifier = Modifier.height(12.dp))
                    InfoRow("Email", emp.email.ifEmpty { "-" }, Icons.Default.Email)
                    InfoRow("Telepon", emp.phone.ifEmpty { "-" }, Icons.Default.Phone)
                    InfoRow("Status Kerja", emp.employmentStatus ?: "-", Icons.Default.Work)
                    InfoRow("Tanggal Bergabung", emp.joinDate ?: "-", Icons.Default.CalendarToday)
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(onClick = { onCheckIn(emp.id) }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(10.dp)) {
                            Icon(Icons.Default.Login, null, modifier = Modifier.size(16.dp)); Spacer(Modifier.width(4.dp)); Text("Check In")
                        }
                        OutlinedButton(onClick = { onCheckOut(emp.id) }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(10.dp)) {
                            Icon(Icons.Default.Logout, null, modifier = Modifier.size(16.dp)); Spacer(Modifier.width(4.dp)); Text("Check Out")
                        }
                        IconButton(onClick = { onDelete(emp.id) }, modifier = Modifier.size(40.dp)) {
                            Icon(Icons.Default.Delete, null, tint = MaterialTheme.colorScheme.error)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AttendanceTab(records: List<AttendanceRecord>) {
    if (records.isEmpty()) { EmptyState(Icons.Default.AccessTime, "Belum ada data absensi", "Data absensi akan muncul di sini"); return }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(records, key = { it.id }) { rec ->
            BizCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier.size(40.dp).clip(CircleShape)
                            .background(if (rec.status == "HADIR") BizgrowColors.SuccessLight else BizgrowColors.DangerLight),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(if (rec.status == "HADIR") Icons.Default.CheckCircle else Icons.Default.Cancel, null,
                            tint = if (rec.status == "HADIR") BizgrowColors.Success else BizgrowColors.Danger,
                            modifier = Modifier.size(20.dp))
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Karyawan #${rec.employeeId}", fontWeight = FontWeight.SemiBold)
                        Text("${rec.date}  ·  Masuk: ${rec.checkIn}${rec.checkOut?.let { "  Keluar: $it" } ?: ""}", style = MaterialTheme.typography.bodySmall)
                    }
                    StatusBadge(rec.status)
                }
            }
        }
    }
}

@Composable
fun PayrollHistoryTab(records: List<PayrollRecord>) {
    if (records.isEmpty()) { EmptyState(Icons.Default.Payments, "Belum ada riwayat payroll"); return }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(records, key = { it.id }) { rec ->
            BizCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Karyawan #${rec.employeeId}", fontWeight = FontWeight.SemiBold)
                        Text(rec.monthYear, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(6.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            Column { Text("Pokok", style = MaterialTheme.typography.labelSmall); Text(rec.salary.toRupiah(), style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold) }
                            Column { Text("Tunjangan", style = MaterialTheme.typography.labelSmall); Text(rec.allowance.toRupiah(), style = MaterialTheme.typography.labelMedium, color = BizgrowColors.Success) }
                            Column { Text("Potongan", style = MaterialTheme.typography.labelSmall); Text(rec.deduction.toRupiah(), style = MaterialTheme.typography.labelMedium, color = BizgrowColors.Danger) }
                        }
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text("Bersih", style = MaterialTheme.typography.labelSmall)
                        Text(rec.netSalary.toRupiah(), fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                        Spacer(Modifier.height(4.dp))
                        StatusBadge(rec.status)
                    }
                }
            }
        }
    }
}

@Composable
fun LeaveTab(requests: List<LeaveRequest>) {
    if (requests.isEmpty()) { EmptyState(Icons.Default.BeachAccess, "Belum ada pengajuan cuti"); return }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(requests, key = { it.id }) { req ->
            BizCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Karyawan #${req.employeeId}", fontWeight = FontWeight.SemiBold)
                        Text("${req.type} · ${req.startDate} s/d ${req.endDate}", style = MaterialTheme.typography.bodySmall)
                        req.reason?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    }
                    StatusBadge(req.status)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddEmployeeBottomSheet(
    onDismiss: () -> Unit,
    onSave: (String, String, Double, String, String, String, String, String) -> Unit
) {
    var fullName by remember { mutableStateOf("") }
    var position by remember { mutableStateOf("") }
    var salary by remember { mutableStateOf("") }
    var pin by remember { mutableStateOf("1234") }
    var role by remember { mutableStateOf("staff") }
    var email by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var division by remember { mutableStateOf("") }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Tambah Karyawan", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            OutlinedTextField(fullName, { fullName = it }, label = { Text("Nama Lengkap *") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp))
            OutlinedTextField(position, { position = it }, label = { Text("Jabatan *") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(salary, { salary = it }, label = { Text("Gaji Pokok") }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(20.dp), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                OutlinedTextField(pin, { pin = it }, label = { Text("PIN (4 digit)") }, modifier = Modifier.weight(0.8f), shape = RoundedCornerShape(20.dp), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(email, { email = it }, label = { Text("Email") }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(20.dp))
                OutlinedTextField(phone, { phone = it }, label = { Text("Telepon") }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(20.dp))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(division, { division = it }, label = { Text("Divisi") }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(20.dp))
                OutlinedTextField(role, { role = it }, label = { Text("Role") }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(20.dp))
            }
            Button(
                onClick = {
                    if (fullName.isNotBlank() && position.isNotBlank())
                        onSave(fullName, position, salary.toDoubleOrNull() ?: 0.0, pin.ifBlank { "1234" }, role, email, phone, division)
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(20.dp)
            ) { Text("Simpan Karyawan", fontWeight = FontWeight.Bold) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProcessPayrollBottomSheet(
    employees: List<Employee>,
    onDismiss: () -> Unit,
    onSave: (Int, String, Double, Double, Double, Double) -> Unit
) {
    var selectedEmpId by remember { mutableStateOf<Int?>(null) }
    var monthYear by remember { mutableStateOf("") }
    var salary by remember { mutableStateOf("") }
    var allowance by remember { mutableStateOf("0") }
    var deduction by remember { mutableStateOf("0") }
    var expanded by remember { mutableStateOf(false) }

    val selectedEmp = employees.find { it.id == selectedEmpId }
    val net = (salary.toDoubleOrNull() ?: 0.0) + (allowance.toDoubleOrNull() ?: 0.0) - (deduction.toDoubleOrNull() ?: 0.0)

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Proses Payroll", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
                OutlinedTextField(
                    value = selectedEmp?.fullName ?: "Pilih Karyawan",
                    onValueChange = {}, readOnly = true,
                    label = { Text("Karyawan") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                    modifier = Modifier.menuAnchor().fillMaxWidth(), shape = RoundedCornerShape(20.dp)
                )
                ExposedDropdownMenu(expanded, { expanded = false }) {
                    employees.forEach { emp ->
                        DropdownMenuItem(text = { Text(emp.fullName) }, onClick = { selectedEmpId = emp.id; salary = emp.salary.toString(); expanded = false })
                    }
                }
            }
            OutlinedTextField(monthYear, { monthYear = it }, label = { Text("Bulan/Tahun (mis. 08/2025)") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(salary, { salary = it }, label = { Text("Gaji Pokok") }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(20.dp), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                OutlinedTextField(allowance, { allowance = it }, label = { Text("Tunjangan") }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(20.dp), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
            }
            OutlinedTextField(deduction, { deduction = it }, label = { Text("Potongan") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
            BizCard { Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween) {
                Text("Gaji Bersih", fontWeight = FontWeight.SemiBold)
                Text(net.toRupiah(), fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.titleMedium)
            }}
            Button(
                onClick = {
                    if (selectedEmpId != null && monthYear.isNotBlank())
                        onSave(selectedEmpId!!, monthYear, salary.toDoubleOrNull() ?: 0.0, allowance.toDoubleOrNull() ?: 0.0, deduction.toDoubleOrNull() ?: 0.0, net)
                },
                modifier = Modifier.fillMaxWidth().height(52.dp), shape = RoundedCornerShape(20.dp)
            ) { Text("Proses Payroll", fontWeight = FontWeight.Bold) }
        }
    }
}
