package com.upstyle.bizgrow.ui.screens

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Inventory
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.LocalDining
import androidx.compose.material.icons.rounded.MiscellaneousServices
import androidx.compose.material.icons.rounded.Store
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.runtime.collectAsState
import com.upstyle.bizgrow.data.BusinessUnit
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.theme.BizgrowColors
import kotlinx.coroutines.delay

@Composable
fun HomeScreen(viewModel: AppViewModel) {
    val units by viewModel.units.collectAsState()
    val user = viewModel.currentUser
    var showDialog by remember { mutableStateOf(false) }
    var isVisible by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.loadUnits()
        isVisible = true
    }

    Scaffold(
        containerColor = BizgrowColors.Background,
        floatingActionButton = {
            AnimatedVisibility(
                visible = isVisible,
                enter = scaleIn(animationSpec = spring(dampingRatio = 0.6f, stiffness = 400f))
            ) {
                FloatingActionButton(
                    onClick = { showDialog = true },
                    containerColor = BizgrowColors.Primary,
                    contentColor = BizgrowColors.White,
                    shape = CircleShape,
                    elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 2.dp)
                ) {
                    Icon(Icons.Default.Add, "Tambah", modifier = Modifier.size(24.dp))
                }
            }
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
            contentPadding = PaddingValues(bottom = 24.dp)
        ) {
            item {
                // Header
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 24.dp, end = 24.dp, top = 48.dp, bottom = 24.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "Selamat malam \uD83D\uDC4B",
                                style = MaterialTheme.typography.titleMedium,
                                color = BizgrowColors.Gray500,
                                fontWeight = FontWeight.Medium
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = user?.username ?: "Farn",
                                style = MaterialTheme.typography.displayLarge.copy(fontSize = 28.sp),
                                color = BizgrowColors.Gray950,
                            )
                            Text(
                                text = "Kelola ${units.size} Bisnis",
                                style = MaterialTheme.typography.titleSmall,
                                color = BizgrowColors.Primary,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            IconButton(onClick = { }) {
                                Icon(Icons.Default.Notifications, "Notifikasi", tint = BizgrowColors.Gray500)
                            }
                            IconButton(onClick = { viewModel.navigate(Screen.Settings) }) {
                                Icon(Icons.Default.Settings, "Pengaturan", tint = BizgrowColors.Gray500)
                            }
                        }
                    }
                }
            }

            item {
                // Quick Actions Grid
                Column(modifier = Modifier.padding(horizontal = 24.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        QuickActionCard(
                            title = "Tambah Bisnis",
                            icon = Icons.Default.Add,
                            color = BizgrowColors.Primary,
                            modifier = Modifier.weight(1f),
                            onClick = { showDialog = true }
                        )
                        QuickActionCard(
                            title = "Laporan",
                            icon = Icons.Default.Assessment,
                            color = BizgrowColors.Success,
                            modifier = Modifier.weight(1f),
                            onClick = { /* TODO */ }
                        )
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        QuickActionCard(
                            title = "Keuangan",
                            icon = Icons.Default.AccountBalanceWallet,
                            color = BizgrowColors.Warning,
                            modifier = Modifier.weight(1f),
                            onClick = { /* TODO */ }
                        )
                        QuickActionCard(
                            title = "Produk",
                            icon = Icons.Default.Inventory,
                            color = BizgrowColors.Secondary,
                            modifier = Modifier.weight(1f),
                            onClick = { /* TODO */ }
                        )
                    }
                }
                Spacer(modifier = Modifier.height(32.dp))
            }

            item {
                Text(
                    text = "Semua Bisnis",
                    modifier = Modifier.padding(start = 24.dp, end = 24.dp, bottom = 16.dp),
                    style = MaterialTheme.typography.titleLarge,
                    color = BizgrowColors.Gray950,
                    fontWeight = FontWeight.Bold
                )
            }

            if (units.isEmpty()) {
                item {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(top = 40.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(Icons.Default.Business, contentDescription = null, modifier = Modifier.size(48.dp), tint = BizgrowColors.Gray300)
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Belum ada bisnis", color = BizgrowColors.Gray500, style = MaterialTheme.typography.titleMedium)
                    }
                }
            } else {
                itemsIndexed(units) { index, unit ->
                    BusinessUnitCard(unit = unit, onClick = { viewModel.selectUnit(unit) })
                    Spacer(modifier = Modifier.height(16.dp))
                }
            }
        }
    }

    if (showDialog) {
        CreateUnitDialog(
            onDismiss = { showDialog = false },
            onConfirm = { name, type ->
                viewModel.createUnit(name, type)
                showDialog = false
            },
            isLoading = viewModel.uiState.collectAsState().value.isLoading
        )
    }
}

@Composable
fun QuickActionCard(title: String, icon: androidx.compose.ui.graphics.vector.ImageVector, color: Color, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Card(
        modifier = modifier
            .height(86.dp)
            .clickable(onClick = onClick)
            .shadow(2.dp, RoundedCornerShape(20.dp), spotColor = BizgrowColors.Gray200),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = BizgrowColors.White)
    ) {
        Column(
            modifier = Modifier.fillMaxSize().padding(16.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.Start
        ) {
            Icon(icon, contentDescription = title, tint = color, modifier = Modifier.size(24.dp))
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = title, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = BizgrowColors.Gray900)
        }
    }
}

@Composable
fun BusinessUnitCard(unit: BusinessUnit, onClick: () -> Unit) {
    val icon = when (unit.type.lowercase()) {
        "retail" -> Icons.Rounded.Store
        "fnb" -> Icons.Rounded.LocalDining
        else -> Icons.Rounded.MiscellaneousServices
    }
    val iconBgColor = BizgrowColors.PrimaryLight
    val iconColor = BizgrowColors.Primary
    val categoryColor = when (unit.type.lowercase()) {
        "retail" -> BizgrowColors.Success
        "fnb" -> BizgrowColors.Secondary
        else -> BizgrowColors.Warning
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp)
            .clickable(onClick = onClick)
            .shadow(4.dp, RoundedCornerShape(20.dp), spotColor = BizgrowColors.Gray300.copy(alpha = 0.5f)),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = BizgrowColors.White)
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .background(iconBgColor, RoundedCornerShape(20.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(icon, contentDescription = null, tint = iconColor, modifier = Modifier.size(24.dp))
                }
                Spacer(modifier = Modifier.width(16.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = unit.name,
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = BizgrowColors.Gray950,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = unit.type,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = categoryColor,
                        modifier = Modifier
                            .background(categoryColor.copy(alpha = 0.1f), RoundedCornerShape(6.dp))
                            .padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }
                Icon(Icons.Rounded.ChevronRight, contentDescription = null, tint = BizgrowColors.Gray400)
            }
            
            HorizontalDivider(modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp), color = BizgrowColors.Gray100)
            
            Text(
                "Klik untuk masuk dashboard",
                fontSize = 12.sp,
                color = BizgrowColors.Gray500,
                fontWeight = FontWeight.Medium,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
fun CreateUnitDialog(
    onDismiss: () -> Unit,
    onConfirm: (String, String) -> Unit,
    isLoading: Boolean
) {
    var name by remember { mutableStateOf("") }
    var selectedType by remember { mutableStateOf("Retail") }
    val types = listOf("Retail", "FnB", "Service")

    Dialog(onDismissRequest = { if (!isLoading) onDismiss() }) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(BizgrowColors.White, RoundedCornerShape(24.dp))
                .padding(24.dp)
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .background(BizgrowColors.PrimaryLight, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.Add, contentDescription = null, tint = BizgrowColors.Primary)
                }
                Spacer(modifier = Modifier.height(16.dp))
                Text("Bisnis Baru", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = BizgrowColors.Gray900)
                Spacer(modifier = Modifier.height(8.dp))
                Text("Buat profil bisnis baru untuk dikelola", color = BizgrowColors.Gray500, fontSize = 14.sp, textAlign = TextAlign.Center)
                
                Spacer(modifier = Modifier.height(24.dp))
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Nama Bisnis") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp)
                )
                Spacer(modifier = Modifier.height(16.dp))
                
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text("Tipe Bisnis", fontSize = 13.sp, color = BizgrowColors.Gray700, fontWeight = FontWeight.Medium)
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        types.forEach { type ->
                            val isSelected = selectedType == type
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(if (isSelected) BizgrowColors.Primary else BizgrowColors.Gray100)
                                    .clickable { selectedType = type }
                                    .padding(vertical = 10.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = type,
                                    color = if (isSelected) BizgrowColors.White else BizgrowColors.Gray500,
                                    fontSize = 13.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                                )
                            }
                        }
                    }
                }
                
                Spacer(modifier = Modifier.height(32.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f).height(48.dp),
                        shape = RoundedCornerShape(20.dp),
                        enabled = !isLoading,
                        border = androidx.compose.foundation.BorderStroke(1.dp, BizgrowColors.Gray200)
                    ) {
                        Text("Batal", color = BizgrowColors.Gray700, fontWeight = FontWeight.Bold)
                    }
                    Button(
                        onClick = { onConfirm(name, selectedType) },
                        modifier = Modifier.weight(1f).height(48.dp),
                        shape = RoundedCornerShape(20.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = BizgrowColors.Primary),
                        enabled = name.isNotBlank() && !isLoading
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(color = BizgrowColors.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                        } else {
                            Text("Simpan", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
