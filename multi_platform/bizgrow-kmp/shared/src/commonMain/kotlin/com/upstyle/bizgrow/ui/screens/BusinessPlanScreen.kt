package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.upstyle.bizgrow.data.BusinessPlan
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.components.BizCard
import com.upstyle.bizgrow.ui.components.EmptyState
import com.upstyle.bizgrow.ui.components.ErrorState
import com.upstyle.bizgrow.ui.components.StatusBadge
import com.upstyle.bizgrow.ui.theme.BizgrowColors

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun BusinessPlanScreen(viewModel: AppViewModel) {
    val state by viewModel.businessPlansState.collectAsStateWithLifecycle()

    var showCreate by remember { mutableStateOf(false) }
    var editingPlan by remember { mutableStateOf<BusinessPlan?>(null) }
    var planTitle by remember { mutableStateOf("") }
    var planDescription by remember { mutableStateOf("") }
    var planStatus by remember { mutableStateOf("DRAFT") }
    var deleteTarget by remember { mutableStateOf<BusinessPlan?>(null) }

    LaunchedEffect(Unit) {
        viewModel.loadBusinessPlans()
    }

    val statusColor = when (planStatus.uppercase()) {
        "ACTIVE" -> BizgrowColors.Success
        "DRAFT" -> BizgrowColors.Warning
        else -> BizgrowColors.Danger
    }

    Scaffold(
        containerColor = BizgrowColors.Background,
        topBar = {
            TopAppBar(
                title = {
                    Text("Business Plan", fontWeight = FontWeight.Black, color = BizgrowColors.Gray950, fontSize = 20.sp)
                },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali", tint = BizgrowColors.Gray900)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BizgrowColors.Surface)
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    planTitle = ""
                    planDescription = ""
                    planStatus = "DRAFT"
                    editingPlan = null
                    showCreate = true
                },
                containerColor = BizgrowColors.Primary,
                contentColor = Color.White,
                shape = RoundedCornerShape(16.dp),
                elevation = FloatingActionButtonDefaults.elevation(2.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = "Buat Plan")
            }
        },
        bottomBar = { BottomNavBar(viewModel, Screen.BusinessPlan) }
    ) { paddingValues ->
        Column(modifier = Modifier.fillMaxSize().padding(paddingValues)) {
            if (state.isLoading && state.plans.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = BizgrowColors.Primary)
                }
            } else if (state.error != null && state.plans.isEmpty()) {
                ErrorState(message = state.error ?: "Gagal memuat", onRetry = { viewModel.loadBusinessPlans() })
            } else if (state.plans.isEmpty()) {
                EmptyState(
                    icon = Icons.Default.Lightbulb,
                    title = "Belum ada Business Plan",
                    subtitle = "Buat plan strategis untuk bisnis Anda",
                    actionLabel = "Buat Plan",
                    onAction = {
                        planTitle = ""
                        planDescription = ""
                        planStatus = "DRAFT"
                        editingPlan = null
                        showCreate = true
                    }
                )
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(state.plans, key = { it.id }) { plan ->
                        BusinessPlanCard(
                            plan = plan,
                            onEdit = {
                                editingPlan = it
                                planTitle = it.title
                                planDescription = it.description
                                planStatus = it.status
                                showCreate = true
                            },
                            onDelete = { deleteTarget = it },
                            onApply = { viewModel.applyBusinessPlan(it.id) }
                        )
                    }
                    item { Spacer(modifier = Modifier.height(80.dp)) }
                }
            }
        }
    }

    if (showCreate) {
        AlertDialog(
            onDismissRequest = {
                showCreate = false
                editingPlan = null
            },
            title = {
                Text(if (editingPlan == null) "Buat Business Plan" else "Edit Business Plan", fontWeight = FontWeight.Bold)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = planTitle,
                        onValueChange = { planTitle = it },
                        label = { Text("Judul Plan *") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = planDescription,
                        onValueChange = { planDescription = it },
                        label = { Text("Deskripsi") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        minLines = 3
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        StatusChip("DRAFT", planStatus == "DRAFT", BizgrowColors.Warning) { planStatus = "DRAFT" }
                        StatusChip("ACTIVE", planStatus == "ACTIVE", BizgrowColors.Success) { planStatus = "ACTIVE" }
                        StatusChip("ARCHIVED", planStatus == "ARCHIVED", BizgrowColors.Gray500) { planStatus = "ARCHIVED" }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (planTitle.isBlank()) return@Button
                        if (editingPlan == null) {
                            viewModel.createBusinessPlan(planTitle.trim(), planDescription.trim(), planStatus)
                        } else {
                            viewModel.updateBusinessPlan(editingPlan!!.id, planTitle.trim(), planDescription.trim(), planStatus)
                        }
                        showCreate = false
                        editingPlan = null
                    },
                    enabled = planTitle.isNotBlank(),
                    shape = RoundedCornerShape(12.dp)
                ) { Text("Simpan") }
            },
            dismissButton = {
                TextButton(onClick = { showCreate = false; editingPlan = null }) { Text("Batal") }
            }
        )
    }

    if (deleteTarget != null) {
        AlertDialog(
            onDismissRequest = { deleteTarget = null },
            title = { Text("Hapus Plan", fontWeight = FontWeight.Bold) },
            text = { Text("Hapus \"${deleteTarget?.title}\"? Aksi ini tidak bisa dibatalkan.") },
            confirmButton = {
                Button(
                    onClick = { viewModel.deleteBusinessPlan(deleteTarget!!.id); deleteTarget = null },
                    colors = ButtonDefaults.buttonColors(containerColor = BizgrowColors.Danger),
                    shape = RoundedCornerShape(12.dp)
                ) { Text("Hapus") }
            },
            dismissButton = { TextButton(onClick = { deleteTarget = null }) { Text("Batal") } }
        )
    }
}

@Composable
fun BusinessPlanCard(
    plan: BusinessPlan,
    onEdit: (BusinessPlan) -> Unit,
    onDelete: (BusinessPlan) -> Unit,
    onApply: (BusinessPlan) -> Unit
) {
    var showMenu by remember { mutableStateOf(false) }
    val statusColor = when (plan.status.uppercase()) {
        "ACTIVE" -> BizgrowColors.Success
        "DRAFT" -> BizgrowColors.Warning
        else -> BizgrowColors.Gray500
    }

    BizCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(plan.title, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = BizgrowColors.Gray950)
                if (plan.description.isNotBlank()) {
                    Text(
                        plan.description,
                        style = MaterialTheme.typography.bodySmall,
                        color = BizgrowColors.Gray600,
                        maxLines = 2
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    StatusBadge(plan.status.uppercase())
                    Text("•", color = BizgrowColors.Gray400, fontSize = 12.sp)
                    Text(
                        plan.updatedAt.takeWhile { !it.startsWith("T") },
                        style = MaterialTheme.typography.bodySmall,
                        color = BizgrowColors.Gray500
                    )
                }
            }
            Box {
                IconButton(onClick = { showMenu = true }) {
                    Icon(Icons.Default.MoreVert, contentDescription = null, tint = BizgrowColors.Gray700)
                }
                DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }) {
                    DropdownMenuItem(
                        text = { Text("Edit") },
                        leadingIcon = { Icon(Icons.Default.Edit, null) },
                        onClick = { showMenu = false; onEdit(plan) }
                    )
                    DropdownMenuItem(
                        text = { Text("Terapkan") },
                        leadingIcon = { Icon(Icons.Default.CheckCircle, null) },
                        onClick = { showMenu = false; onApply(plan) }
                    )
                    DropdownMenuItem(
                        text = { Text("Hapus", color = BizgrowColors.Danger) },
                        leadingIcon = { Icon(Icons.Default.Delete, null, tint = BizgrowColors.Danger) },
                        onClick = { showMenu = false; onDelete(plan) }
                    )
                }
            }
        }
    }
}

@Composable
fun StatusChip(label: String, selected: Boolean, selectedColor: Color, onClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = if (selected) selectedColor else BizgrowColors.White,
        contentColor = if (selected) Color.White else BizgrowColors.Gray700,
        border = if (!selected) androidx.compose.foundation.BorderStroke(1.dp, BizgrowColors.Gray200) else null,
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
            fontSize = 13.sp
        )
    }
}
