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
import androidx.compose.runtime.collectAsState
import com.upstyle.bizgrow.data.SalesTarget
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.components.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SalesTargetsScreen(viewModel: AppViewModel) {
    val salesTargetData by viewModel.salesTargetData.collectAsState()
    val uiState by viewModel.uiState.collectAsState()
    var showCreateDialog by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { viewModel.loadSalesTargets() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Column {
                        Text("Target Penjualan", fontWeight = FontWeight.Bold)
                        salesTargetData?.summary?.let { 
                            Text("Pencapaian Rata-rata: ${it.avgAchievement.toInt()}%", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                },
                navigationIcon = { IconButton(onClick = { viewModel.navigateBack() }) { Icon(Icons.Default.ArrowBack, null) } }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { showCreateDialog = true }, containerColor = BizgrowColors.Primary) {
                Icon(Icons.Default.Add, "Tambah Target", tint = Color.White)
            }
        },
        bottomBar = { BottomNavBar(viewModel, com.upstyle.bizgrow.ui.Screen.SalesTargets) }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            // Summary Cards
            salesTargetData?.summary?.let { summary ->
                Row(modifier = Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    StatCard("Target Total", "Rp ${"%,.0f".format(summary.totalTarget)}", icon = Icons.Default.Flag, gradient = BizgrowColors.GradPrimary, modifier = Modifier.weight(1f))
                    StatCard("Realisasi", "Rp ${"%,.0f".format(summary.totalActual)}", icon = Icons.Default.TrendingUp, gradient = BizgrowColors.GradSuccess, modifier = Modifier.weight(1f))
                }
            }

            if (uiState.isLoading && salesTargetData == null) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            } else if (salesTargetData?.targets?.isEmpty() == true) {
                EmptyState(Icons.Default.Flag, "Belum ada target penjualan", "Buat target untuk memotivasi tim sales Anda")
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(salesTargetData?.targets ?: emptyList(), key = { it.id }) { target ->
                        SalesTargetCard(target = target, onDelete = { viewModel.deleteSalesTarget(target.id) })
                    }
                }
            }
        }
    }

    if (showCreateDialog) {
        CreateTargetDialog(
            onDismiss = { showCreateDialog = false },
            onCreate = { empId, empName, periode, amount ->
                viewModel.createSalesTarget(empId, empName, periode, amount)
                showCreateDialog = false
            }
        )
    }
}

@Composable
fun SalesTargetCard(target: SalesTarget, onDelete: (Int) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    val achievement = if (target.targetAmount > 0) (target.actualAmount / target.targetAmount * 100).toInt() else 0
    val statusColor = when {
        achievement >= 100 -> BizgrowColors.Success
        achievement >= 70 -> BizgrowColors.Warning
        else -> BizgrowColors.Danger
    }

    BizCard(onClick = { expanded = !expanded }) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(target.employeeName.ifEmpty { "Target Unit" }, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                Text("Periode: ${target.periode}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    Column {
                        Text("Target", fontSize = 11.sp, color = BizgrowColors.Gray500)
                            Text("Rp ${"%,.0f".format(target.targetAmount)}", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                    Column {
                        Text("Realisasi", fontSize = 11.sp, color = BizgrowColors.Gray500)
                            Text("Rp ${"%,.0f".format(target.actualAmount)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = statusColor)
                    }
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("$achievement%", fontSize = 24.sp, fontWeight = FontWeight.Black, color = statusColor)
                StatusBadge(target.status.uppercase())
            }
        }
        if (expanded) {
            Spacer(Modifier.height(12.dp))
            HorizontalDivider()
            Spacer(Modifier.height(12.dp))
            LinearProgressIndicator(
                progress = { (achievement / 100f).coerceIn(0f, 1f) },
                modifier = Modifier.fillMaxWidth().height(8.dp),
                color = statusColor,
                trackColor = statusColor.copy(alpha = 0.2f),
            )
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                TextButton(onClick = { /* TODO: Edit */ }) { Text("Edit Target") }
                TextButton(onClick = { onDelete(target.id) }, colors = ButtonDefaults.textButtonColors(contentColor = BizgrowColors.Danger)) { Text("Hapus") }
            }
        }
    }
}

@Composable
fun CreateTargetDialog(
    onDismiss: () -> Unit,
    onCreate: (Int?, String, String, Double) -> Unit
) {
    var employeeName by remember { mutableStateOf("") }
    var periode by remember { mutableStateOf("") }
    var targetAmount by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Target Penjualan Baru", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = employeeName,
                    onValueChange = { employeeName = it },
                    label = { Text("Nama Karyawan (opsional)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                OutlinedTextField(
                    value = periode,
                    onValueChange = { periode = it },
                    label = { Text("Periode (YYYY-MM)") },
                    placeholder = { Text("2025-08") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                OutlinedTextField(
                    value = targetAmount,
                    onValueChange = { targetAmount = it },
                    label = { Text("Target (Rp)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val amount = targetAmount.toDoubleOrNull() ?: 0.0
                    if (periode.isNotBlank() && amount > 0) {
                        onCreate(null, employeeName.ifBlank { "Tim Sales" }, periode, amount)
                    }
                },
                enabled = periode.isNotBlank() && targetAmount.toDoubleOrNull() != null
            ) { Text("Simpan") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Batal") } }
    )
}


