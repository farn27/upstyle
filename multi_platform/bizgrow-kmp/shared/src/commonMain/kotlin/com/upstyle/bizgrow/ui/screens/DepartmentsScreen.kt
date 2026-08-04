package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.upstyle.bizgrow.data.Department
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.components.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DepartmentsScreen(viewModel: AppViewModel) {
    val departments by viewModel.departments.collectAsStateWithLifecycle()
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var showCreateDialog by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.loadDepartments()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Column {
                        Text("Departemen", fontWeight = FontWeight.Bold)
                        Text("${departments.size} departemen terdaftar", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                navigationIcon = { IconButton(onClick = { viewModel.navigateBack() }) { Icon(Icons.Default.ArrowBack, null) } }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { showCreateDialog = true }, containerColor = BizgrowColors.Primary) {
                Icon(Icons.Default.Add, "Tambah Departemen", tint = Color.White)
            }
        },
        bottomBar = { BottomNavBar(viewModel, com.upstyle.bizgrow.ui.Screen.Departments) }
    ) { padding ->
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            if (uiState.isLoading && departments.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else if (departments.isEmpty()) {
                EmptyState(Icons.Default.BusinessCenter, "Belum ada departemen", "Tambah departemen untuk mengatur struktur organisasi")
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(departments, key = { it.id }) { department ->
                        DepartmentCard(
                            department = department,
                            onEdit = { /* TODO: Implement edit */ },
                            onDelete = { viewModel.deleteDepartment(it) }
                        )
                    }
                }
            }
        }
    }

    if (showCreateDialog) {
        CreateDepartmentDialog(
            onDismiss = { showCreateDialog = false },
            onCreate = { name, description, manager, budget ->
                viewModel.createDepartment(name, description, manager, budget)
                showCreateDialog = false
            }
        )
    }

    uiState.error?.let { error ->
        LaunchedEffect(error) {
            // Show error snackbar or toast
        }
    }
}

@Composable
fun DepartmentCard(
    department: Department,
    onEdit: (Department) -> Unit,
    onDelete: (Int) -> Unit
) {
    var showDeleteDialog by remember { mutableStateOf(false) }

    BizCard {
        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.BusinessCenter,
                    contentDescription = null,
                    tint = BizgrowColors.Primary,
                    modifier = Modifier.size(32.dp)
                )
                Spacer(Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(department.name, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    if (department.description.isNotEmpty()) {
                        Text(department.description, fontSize = 12.sp, color = BizgrowColors.Gray500)
                    }
                    if (department.manager.isNotEmpty()) {
                        Spacer(Modifier.height(4.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Person, null, modifier = Modifier.size(14.dp), tint = BizgrowColors.Gray400)
                            Spacer(Modifier.width(4.dp))
                            Text("Manager: ${department.manager}", fontSize = 11.sp, color = BizgrowColors.Gray600)
                        }
                    }
                }
                IconButton(onClick = { showDeleteDialog = true }) {
                    Icon(Icons.Default.Delete, "Hapus", tint = BizgrowColors.Danger)
                }
            }
            
            if (department.budget > 0) {
                Spacer(Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.AttachMoney, null, modifier = Modifier.size(14.dp), tint = BizgrowColors.Success)
                    Spacer(Modifier.width(4.dp))
                    Text("Budget: ${department.budget.toRupiah()}", fontSize = 12.sp, color = BizgrowColors.Gray600)
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Surface(
                    color = if (department.isActive) BizgrowColors.Success.copy(alpha = 0.1f) else BizgrowColors.Gray100,
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text(
                        text = if (department.isActive) "AKTIF" else "NONAKTIF",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (department.isActive) BizgrowColors.Success else BizgrowColors.Gray500,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
                Surface(color = BizgrowColors.Gray100, shape = RoundedCornerShape(6.dp)) {
                    Text(
                        "ID: ${department.id}",
                        fontSize = 10.sp,
                        color = BizgrowColors.Gray500,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }
        }
    }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Hapus Departemen", fontWeight = FontWeight.Bold) },
            text = { Text("Apakah Anda yakin ingin menghapus departemen '${department.name}'? Tindakan ini tidak dapat dibatalkan.") },
            confirmButton = {
                Button(
                    onClick = {
                        onDelete(department.id)
                        showDeleteDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = BizgrowColors.Danger)
                ) { Text("Hapus", color = Color.White) }
            },
            dismissButton = { TextButton(onClick = { showDeleteDialog = false }) { Text("Batal") } }
        )
    }
}

@Composable
fun CreateDepartmentDialog(
    onDismiss: () -> Unit,
    onCreate: (String, String, String, Double) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var manager by remember { mutableStateOf("") }
    var budget by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Departemen Baru", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Nama Departemen *") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Deskripsi") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    maxLines = 3
                )
                OutlinedTextField(
                    value = manager,
                    onValueChange = { manager = it },
                    label = { Text("Manager") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                OutlinedTextField(
                    value = budget,
                    onValueChange = { budget = it.filter { char -> char.isDigit() } },
                    label = { Text("Budget (Rp)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    prefix = { Text("Rp ") }
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (name.isNotBlank()) {
                        val budgetValue = budget.toDoubleOrNull() ?: 0.0
                        onCreate(name, description, manager, budgetValue)
                    }
                },
                enabled = name.isNotBlank()
            ) { Text("Simpan") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Batal") } }
    )
}