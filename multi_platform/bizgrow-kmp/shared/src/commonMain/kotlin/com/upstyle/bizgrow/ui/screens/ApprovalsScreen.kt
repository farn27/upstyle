package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
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
import com.upstyle.bizgrow.data.ApprovalRequest
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.components.*
import com.upstyle.bizgrow.ui.theme.BizgrowColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ApprovalsScreen(viewModel: AppViewModel) {
    val approvalsData by viewModel.approvalsData.collectAsState()
    val uiState by viewModel.uiState.collectAsState()
    var selectedTab by remember { mutableStateOf(0) }
    val tabs = listOf("Pending", "Disetujui", "Ditolak")
    var showCreateDialog by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { viewModel.loadApprovals() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Column {
                        Text("Approval Center", fontWeight = FontWeight.Bold)
                        Text("Reimbursement & Pinjaman", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                navigationIcon = { IconButton(onClick = { viewModel.navigateBack() }) { Icon(Icons.Default.ArrowBack, null) } }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { showCreateDialog = true }, containerColor = BizgrowColors.Primary) {
                Icon(Icons.Default.Add, "Ajukan", tint = Color.White)
            }
        },
        bottomBar = { BottomNavBar(viewModel, com.upstyle.bizgrow.ui.Screen.Approvals) }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            TabRow(selectedTabIndex = selectedTab) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = { 
                            val count = when (index) {
                                0 -> approvalsData?.pending?.size ?: 0
                                1 -> approvalsData?.approved?.size ?: 0
                                else -> approvalsData?.rejected?.size ?: 0
                            }
                            Text("$title ($count)") 
                        }
                    )
                }
            }

            val requests = when (selectedTab) {
                0 -> approvalsData?.pending ?: emptyList()
                1 -> approvalsData?.approved ?: emptyList()
                else -> approvalsData?.rejected ?: emptyList()
            }

            if (uiState.isLoading && approvalsData == null) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            } else if (requests.isEmpty()) {
                EmptyState(Icons.Default.CheckCircle, "Tidak ada pengajuan", if (selectedTab == 0) "Pengajuan pending akan muncul di sini" else null)
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(requests, key = { it.id }) { request ->
                        ApprovalRequestCard(
                            request = request,
                            onApprove = { viewModel.approveRequest(it, "approve") },
                            onReject = { viewModel.approveRequest(it, "reject") },
                            showActions = selectedTab == 0
                        )
                    }
                }
            }
        }
    }

    if (showCreateDialog) {
        CreateApprovalDialog(
            onDismiss = { showCreateDialog = false },
            onCreate = { type, amount, desc ->
                viewModel.createApprovalRequest(type, amount, desc)
                showCreateDialog = false
            }
        )
    }
}

@Composable
fun ApprovalRequestCard(
    request: ApprovalRequest,
    onApprove: (Int) -> Unit,
    onReject: (Int) -> Unit,
    showActions: Boolean
) {
    val typeIcon = if (request.type == "reimbursement") Icons.Default.Receipt else Icons.Default.AccountBalance
    val typeLabel = if (request.type == "reimbursement") "Reimbursement" else "Pinjaman"

    BizCard {
        Row(verticalAlignment = Alignment.Top) {
            Box(
                modifier = Modifier.size(48.dp).padding(8.dp),
                contentAlignment = Alignment.Center
            ) {
                Icon(typeIcon, null, tint = BizgrowColors.Primary, modifier = Modifier.size(32.dp))
            }
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(request.employeeName, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    Spacer(Modifier.width(8.dp))
                    StatusBadge(request.status.uppercase())
                }
                Spacer(Modifier.height(4.dp))
                Text(typeLabel, fontSize = 12.sp, color = BizgrowColors.Gray500)
                Spacer(Modifier.height(8.dp))
                Text(request.description, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(8.dp))
                Text(request.amount.toRupiah(), fontSize = 18.sp, fontWeight = FontWeight.Black, color = BizgrowColors.Primary)
                Spacer(Modifier.height(4.dp))
                Text("Diajukan: ${request.createdAt.take(10)}", fontSize = 11.sp, color = BizgrowColors.Gray500)
            }
        }

        if (showActions) {
            Spacer(Modifier.height(12.dp))
            HorizontalDivider()
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(
                    onClick = { onReject(request.id) },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = BizgrowColors.Danger)
                ) {
                    Icon(Icons.Default.Close, null, Modifier.size(18.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Tolak")
                }
                Button(
                    onClick = { onApprove(request.id) },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = BizgrowColors.Success)
                ) {
                    Icon(Icons.Default.Check, null, Modifier.size(18.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Setuju")
                }
            }
        }
    }
}

@Composable
fun CreateApprovalDialog(
    onDismiss: () -> Unit,
    onCreate: (String, Double, String) -> Unit
) {
    var type by remember { mutableStateOf("reimbursement") }
    var amount by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Ajukan Approval", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(
                        selected = type == "reimbursement",
                        onClick = { type = "reimbursement" },
                        label = { Text("Reimbursement") },
                        leadingIcon = { Icon(Icons.Default.Receipt, null, Modifier.size(18.dp)) }
                    )
                    FilterChip(
                        selected = type == "loan",
                        onClick = { type = "loan" },
                        label = { Text("Pinjaman") },
                        leadingIcon = { Icon(Icons.Default.AccountBalance, null, Modifier.size(18.dp)) }
                    )
                }
                OutlinedTextField(
                    value = amount,
                    onValueChange = { amount = it },
                    label = { Text("Nominal (Rp)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Keterangan") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 3,
                    shape = RoundedCornerShape(12.dp)
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val amt = amount.toDoubleOrNull() ?: 0.0
                    if (amt > 0 && description.isNotBlank()) {
                        onCreate(type, amt, description)
                    }
                },
                enabled = amount.toDoubleOrNull() != null && description.isNotBlank()
            ) { Text("Ajukan") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Batal") } }
    )
}
