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
import kotlinx.datetime.toLocalDateTime
import com.upstyle.bizgrow.ui.design.*
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
    var hapusKaryawanId by remember { mutableStateOf<Int?>(null) }

    LaunchedEffect(Unit) { viewModel.loadHrData() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Column {
                    Text("HR & SDM", fontWeight = FontWeight.Bold)
                    Text("${hrData?.ringkasan?.karyawanAktif ?: 0} karyawan aktif", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }},
                navigationIcon = { IconButton(onClick = { viewModel.navigateBack() }) { Icon(Icons.Default.ArrowBack, null) } },
                actions = {
                    IconButton(onClick = { viewModel.navigate(Screen.Approvals) }) { Icon(Icons.Default.HowToVote, contentDescription = "Persetujuan") }
                    IconButton(onClick = { viewModel.navigate(Screen.LeaveRequests) }) { Icon(Icons.Default.DateRange, contentDescription = "Cuti & Izin") }
                    IconButton(onClick = { viewModel.navigate(Screen.Payroll) }) { Icon(Icons.Default.Receipt, contentDescription = "Payroll") }
                    IconButton(onClick = { viewModel.navigate(Screen.Departments) }) { Icon(Icons.Default.AccountTree, contentDescription = "Departemen") }
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

            // Ringkasan eksekutif (dihitung server untuk seluruh karyawan unit)
            val r = hrData?.ringkasan ?: RingkasanHr()
            Column(Modifier.padding(horizontal = 16.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    StatCard("Karyawan Aktif", "${r.karyawanAktif}", icon = Icons.Default.People, gradient = BizgrowColors.GradPrimary, modifier = Modifier.weight(1f))
                    StatCard("Hadir Hari Ini", "${r.hadirHariIni}/${r.karyawanAktif}", icon = Icons.Default.CheckCircle, gradient = BizgrowColors.GradSuccess, modifier = Modifier.weight(1f))
                    StatCard("Cuti Menunggu", "${r.cutiMenunggu}", icon = Icons.Default.HourglassEmpty, gradient = BizgrowColors.GradWarning, modifier = Modifier.weight(1f))
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    com.upstyle.bizgrow.ui.design.StatTile("Beban gaji / bln", r.bebanGaji.rupiahRingkas(), Icons.Default.Payments, BizgrowColors.Primary, Modifier.weight(1f))
                    com.upstyle.bizgrow.ui.design.StatTile(
                        "Payroll bulan ini", "${r.payrollBulanIni.dibayar}/${r.payrollBulanIni.dibayar + r.payrollBulanIni.belumDibayar}",
                        Icons.Default.Receipt, if (r.payrollBulanIni.belumDibayar > 0) BizgrowColors.Warning else BizgrowColors.Success, Modifier.weight(1f),
                        caption = if (r.payrollBulanIni.belumDibayar > 0) "${r.payrollBulanIni.nominalBelum.rupiahRingkas()} belum dibayar" else "lunas"
                    )
                }
                if (r.kontrakSegeraHabis > 0 || r.kontrakLewat > 0) {
                    Row(
                        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(BizgrowColors.Warning.copy(alpha = 0.12f)).padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.EventBusy, null, tint = BizgrowColors.WarningDark, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(10.dp))
                        Text(
                            listOfNotNull(
                                r.kontrakSegeraHabis.takeIf { it > 0 }?.let { "$it kontrak berakhir ≤30 hari" },
                                r.kontrakLewat.takeIf { it > 0 }?.let { "$it kontrak sudah lewat" }
                            ).joinToString(" • "),
                            style = MaterialTheme.typography.bodySmall, color = BizgrowColors.WarningDark, fontWeight = FontWeight.SemiBold
                        )
                    }
                }
                r.kpiRataRata?.let { Text("KPI rata-rata tim: ${(it * 10).toLong() / 10.0}", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            }

            ScrollableTabRow(selectedTabIndex = selectedTab, edgePadding = 16.dp) {
                tabs.forEachIndexed { i, t -> Tab(selected = selectedTab == i, onClick = { selectedTab = i }, text = { Text(t) }) }
            }

            when (selectedTab) {
                0 -> EmployeeTab(hrData?.employees ?: emptyList(), expandedEmployeeId,
                    onToggle = { expandedEmployeeId = if (expandedEmployeeId == it) null else it },
                    onDelete = { hapusKaryawanId = it },
                    onCheckIn = { id ->
                        viewModel.checkIn(id, todayDate(), currentTime())
                    },
                    onCheckOut = { id ->
                        viewModel.checkOut(id, todayDate(), currentTime())
                    },
                    onDetail = { viewModel.bukaKaryawan(it) }
                )
                1 -> AttendanceTab(hrData?.attendance ?: emptyList(), hrData?.employees ?: emptyList())
                2 -> PayrollHistoryTab(hrData?.payroll ?: emptyList(), hrData?.employees ?: emptyList())
                3 -> LeaveTab(hrData?.leaveRequests ?: emptyList(), hrData?.employees ?: emptyList(), onBuka = { viewModel.navigate(Screen.LeaveRequests) })
            }
        }
    }

    hapusKaryawanId?.let { id ->
        val nama = hrData?.employees?.firstOrNull { it.id == id }?.fullName ?: "karyawan ini"
        KonfirmasiHapus("Hapus $nama?", "Seluruh data karyawan termasuk absensi, payroll, dan KPI-nya akan ikut terhapus dan tidak bisa dikembalikan.", { viewModel.deleteEmployee(id); hapusKaryawanId = null }, { hapusKaryawanId = null })
    }

    if (showAddSheet) AddEmployeeBottomSheet(onDismiss = { showAddSheet = false }) { body ->
        viewModel.createEmployee(body)
        showAddSheet = false
    }

    if (showPayrollSheet) ProcessPayrollBottomSheet(
        employees = hrData?.employees ?: emptyList(),
        komponen = hrData?.salaryComponents ?: emptyList(),
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
    onCheckOut: (Int) -> Unit,
    onDetail: (Int) -> Unit = {}
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
                    BizButton("Lihat profil lengkap", { onDetail(emp.id) }, Modifier.fillMaxWidth(), icon = Icons.Default.Person, height = 44.dp)
                    Spacer(modifier = Modifier.height(8.dp))
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
fun AttendanceTab(records: List<AttendanceRecord>, employees: List<Employee> = emptyList()) {
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
                        Text(employees.firstOrNull { it.id == rec.employeeId }?.fullName ?: "Karyawan #${rec.employeeId}", fontWeight = FontWeight.SemiBold)
                        Text("${rec.date}  ·  Masuk: ${rec.checkIn}${rec.checkOut?.let { "  Keluar: $it" } ?: ""}", style = MaterialTheme.typography.bodySmall)
                    }
                    StatusBadge(rec.status)
                }
            }
        }
    }
}

@Composable
fun PayrollHistoryTab(records: List<PayrollRecord>, employees: List<Employee> = emptyList()) {
    if (records.isEmpty()) { EmptyState(Icons.Default.Payments, "Belum ada riwayat payroll"); return }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(records, key = { it.id }) { rec ->
            BizCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(employees.firstOrNull { it.id == rec.employeeId }?.fullName ?: "Karyawan #${rec.employeeId}", fontWeight = FontWeight.SemiBold)
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
fun LeaveTab(requests: List<LeaveRequest>, employees: List<Employee> = emptyList(), onBuka: () -> Unit = {}) {
    if (requests.isEmpty()) { EmptyState(Icons.Default.BeachAccess, "Belum ada pengajuan cuti"); return }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item { Button(onClick = onBuka, modifier = Modifier.fillMaxWidth()) { Text("Setujui / tolak pengajuan (${requests.count { it.status.equals("pending", true) }} menunggu)") } }
        items(requests, key = { it.id }) { req ->
            BizCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(req.employeeName.ifBlank { employees.firstOrNull { it.id == req.employeeId }?.fullName ?: "Karyawan #${req.employeeId}" }, fontWeight = FontWeight.SemiBold)
                        Text("${if (req.type.equals("overtime", true)) "Lembur" else "Cuti"} · ${req.startDate} s/d ${req.endDate}", style = MaterialTheme.typography.bodySmall)
                        req.reason?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    }
                    StatusBadge(req.status)
                }
            }
        }
    }
}

private val peranAkses = listOf("staff" to "Staff", "cashier" to "Kasir", "manager" to "Manajer", "finance" to "Keuangan", "hr" to "HR", "operator" to "Operator", "admin" to "Admin", "employee" to "Karyawan")
private val statusKerja = listOf("Tetap" to "Tetap", "Kontrak" to "Kontrak", "Magang" to "Magang", "Paruh Waktu" to "Paruh waktu")
private val golonganKerja = listOf("Junior" to "Junior", "Middle" to "Middle / Officer", "Senior" to "Senior / Lead", "Managerial" to "Managerial")
private val golDarah = listOf("A", "B", "AB", "O").map { it to it }

/** Form "Tambah Anggota Tim" — setara web: identitas, pekerjaan, kompensasi, kontak darurat, akses portal. */
@Composable
fun AddEmployeeBottomSheet(
    onDismiss: () -> Unit,
    onSave: (CreateEmployeeBody) -> Unit
) {
    var nama by remember { mutableStateOf("") }
    var nik by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var telepon by remember { mutableStateOf("") }
    var alamat by remember { mutableStateOf("") }
    var darah by remember { mutableStateOf<String?>(null) }
    var jabatan by remember { mutableStateOf("") }
    var divisi by remember { mutableStateOf("") }
    var golongan by remember { mutableStateOf("Junior") }
    var statusK by remember { mutableStateOf("Tetap") }
    var peran by remember { mutableStateOf("staff") }
    var lokasi by remember { mutableStateOf("") }
    var gabung by remember { mutableStateOf("") }
    var kontrakMulai by remember { mutableStateOf("") }
    var kontrakSelesai by remember { mutableStateOf("") }
    var gaji by remember { mutableStateOf("") }
    var bank by remember { mutableStateOf("") }
    var rekening by remember { mutableStateOf("") }
    var npwp by remember { mutableStateOf("") }
    var darurat by remember { mutableStateOf("") }
    var hubungan by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var pin by remember { mutableStateOf("") }

    val emailValid = email.isBlank() || ('@' in email && '.' in email.substringAfter('@'))
    val valid = nama.trim().length >= 2 && jabatan.isNotBlank() && pin.length == 4 && password.length >= 6 && emailValid

    FormSheet(
        "Tambah Anggota Tim", subjudul = "Isi data utama dulu; sisanya boleh dilengkapi nanti.",
        onDismiss = onDismiss, labelSimpan = "Simpan karyawan", simpanAktif = valid,
        onSimpan = {
            onSave(
                CreateEmployeeBody(
                    fullName = nama.trim(), position = jabatan.trim(), salary = gaji.toDoubleOrNull() ?: 0.0, pin = pin, role = peran, unitId = 0,
                    email = email.trim(), phone = telepon.trim(), joinDate = gabung, address = alamat.trim(), employmentStatus = statusK,
                    placementLocation = lokasi.trim(), idNumber = nik.trim(), emergencyContact = darurat.trim(), emergencyRelation = hubungan.trim(),
                    bloodType = darah ?: "", password = password, division = divisi.trim(), jobGrade = golongan,
                    contractStart = kontrakMulai, contractEnd = kontrakSelesai, bankName = bank.trim(), bankAccountNumber = rekening.trim(), taxId = npwp.trim()
                )
            )
            onDismiss()
        }
    ) {
        Text("IDENTITAS", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Black, color = BizgrowColors.Primary)
        BizTextField(nama, { nama = it }, "Nama lengkap *", placeholder = "Nama sesuai KTP")
        BizTextField(nik, { nik = it.filter(Char::isDigit) }, "NIK / No. KTP", keyboardType = KeyboardType.Number)
        BizTextField(email, { email = it }, "Email", placeholder = "nama@perusahaan.com", keyboardType = KeyboardType.Email, isError = !emailValid, supportingText = if (!emailValid) "Format email belum benar" else null)
        BizTextField(telepon, { telepon = it }, "Telepon / WhatsApp", keyboardType = KeyboardType.Phone)
        BizTextField(alamat, { alamat = it }, "Alamat", singleLine = false)
        PilihanPil("Golongan darah", golDarah, darah) { darah = it }

        Text("PEKERJAAN", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Black, color = BizgrowColors.Primary, modifier = Modifier.padding(top = 6.dp))
        BizTextField(jabatan, { jabatan = it }, "Jabatan *", placeholder = "Kasir, Barista, Manajer Toko…")
        BizTextField(divisi, { divisi = it }, "Divisi", placeholder = "Operations, Finance, Marketing…")
        PilihanField("Golongan", golonganKerja, golongan, { golongan = it })
        PilihanPil("Status kerja", statusKerja, statusK) { statusK = it }
        PilihanField("Peran akses", peranAkses, peran, { peran = it })
        BizTextField(lokasi, { lokasi = it }, "Lokasi penempatan", placeholder = "Contoh: Jakarta HQ")
        TanggalField("Tanggal bergabung", gabung) { gabung = it }
        if (statusK == "Kontrak" || statusK == "Magang") {
            TanggalField("Kontrak mulai", kontrakMulai) { kontrakMulai = it }
            TanggalField("Kontrak berakhir", kontrakSelesai) { kontrakSelesai = it }
        }

        Text("KOMPENSASI", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Black, color = BizgrowColors.Primary, modifier = Modifier.padding(top = 6.dp))
        AngkaField(gaji, { gaji = it }, "Gaji pokok (Rp)", desimal = false)
        BizTextField(bank, { bank = it }, "Nama bank", placeholder = "Contoh: BCA")
        BizTextField(rekening, { rekening = it.filter(Char::isDigit) }, "Nomor rekening", keyboardType = KeyboardType.Number)
        BizTextField(npwp, { npwp = it }, "NPWP")

        Text("KONTAK DARURAT", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Black, color = BizgrowColors.Primary, modifier = Modifier.padding(top = 6.dp))
        BizTextField(darurat, { darurat = it }, "Nama / telepon kontak darurat")
        BizTextField(hubungan, { hubungan = it }, "Hubungan", placeholder = "Suami / Istri / Orang tua")

        Text("AKSES PORTAL KARYAWAN", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Black, color = BizgrowColors.Primary, modifier = Modifier.padding(top = 6.dp))
        BizTextField(password, { password = it }, "Password portal *", isPassword = true, supportingText = "Minimal 6 karakter")
        AngkaField(pin, { pin = it.take(4) }, "PIN 4 digit *", desimal = false, supporting = "Untuk otorisasi di kasir")
    }
}

@Composable
fun ProcessPayrollBottomSheet(
    employees: List<Employee>,
    komponen: List<SalaryComponent> = emptyList(),
    onDismiss: () -> Unit,
    onSave: (Int, String, Double, Double, Double, Double) -> Unit
) {
    val hari = remember { kotlinx.datetime.Clock.System.now().toLocalDateTime(kotlinx.datetime.TimeZone.of("Asia/Jakarta")).date }
    var selectedEmpId by remember { mutableStateOf<String?>(null) }
    var bulan by remember { mutableStateOf(hari.monthNumber.toString()) }
    var tahun by remember { mutableStateOf(hari.year.toString()) }
    var salary by remember { mutableStateOf("") }
    var allowance by remember { mutableStateOf("0") }
    var deduction by remember { mutableStateOf("0") }
    val net = (salary.toDoubleOrNull() ?: 0.0) + (allowance.toDoubleOrNull() ?: 0.0) - (deduction.toDoubleOrNull() ?: 0.0)
    val namaBulan = listOf("Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember")
    val punyaKomponen = selectedEmpId?.toIntOrNull()?.let { id -> komponen.filter { it.employeeId == id } }.orEmpty()

    FormSheet(
        "Proses payroll", subjudul = "Tunjangan & potongan terisi dari komponen gaji karyawan",
        onDismiss = onDismiss, labelSimpan = "Proses payroll",
        simpanAktif = selectedEmpId != null && salary.toDoubleOrNull() != null && net >= 0 && (tahun.toIntOrNull() ?: 0) in 2020..2100,
        onSimpan = {
            val b = bulan.toInt()
            onSave(selectedEmpId!!.toInt(), "${b.toString().padStart(2, '0')}/$tahun", salary.toDouble(), allowance.toDoubleOrNull() ?: 0.0, deduction.toDoubleOrNull() ?: 0.0, net)
        }
    ) {
        PilihanField("Karyawan", employees.map { it.id.toString() to it.fullName }, selectedEmpId, { id ->
            selectedEmpId = id
            val emp = employees.firstOrNull { it.id.toString() == id }
            salary = emp?.salary?.toLong()?.toString() ?: ""
            val k = komponen.filter { it.employeeId == emp?.id }
            allowance = k.filter { it.type == "addition" }.sumOf { it.amount }.toLong().toString()
            deduction = k.filter { it.type == "deduction" }.sumOf { it.amount }.toLong().toString()
        }, placeholder = "Pilih karyawan…")
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(Modifier.weight(1.3f)) { PilihanField("Bulan", namaBulan.mapIndexed { i, n -> (i + 1).toString() to n }, bulan, { bulan = it }) }
            Box(Modifier.weight(1f)) { AngkaField(tahun, { tahun = it }, "Tahun", desimal = false) }
        }
        AngkaField(salary, { salary = it }, "Gaji pokok (Rp)", desimal = false)
        AngkaField(allowance, { allowance = it }, "Tunjangan (Rp)", desimal = false)
        AngkaField(deduction, { deduction = it }, "Potongan (Rp)", desimal = false)
        if (punyaKomponen.isNotEmpty()) Text(punyaKomponen.joinToString(" • ") { (if (it.type == "addition") "+" else "−") + it.name }, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        BizCard { Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween) {
            Text("Gaji bersih", fontWeight = FontWeight.SemiBold)
            Text(net.toRupiah(), fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.titleMedium)
        }}
    }
}
