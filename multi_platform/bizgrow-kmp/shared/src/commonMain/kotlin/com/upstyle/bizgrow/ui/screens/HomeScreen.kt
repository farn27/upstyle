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
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.LocalDining
import androidx.compose.material.icons.rounded.MiscellaneousServices
import androidx.compose.material.icons.rounded.Store
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.upstyle.bizgrow.data.BusinessUnit
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.theme.BizgrowColors
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(viewModel: AppViewModel) {
    val units by viewModel.units.collectAsStateWithLifecycle()
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
                    shape = RoundedCornerShape(16.dp),
                    elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 6.dp)
                ) {
                    Icon(Icons.Default.Add, "Tambah Bisnis", modifier = Modifier.size(28.dp))
                }
            }
        }
    ) { paddingValues ->
        Box(modifier = Modifier.fillMaxSize()) {
            // Top Background Decor
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(280.dp)
                    .background(
                        brush = Brush.verticalGradient(
                            colors = listOf(BizgrowColors.Primary, BizgrowColors.PrimaryDark)
                        )
                    )
            )

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                // Header Profile Section
                AnimatedVisibility(
                    visible = isVisible,
                    enter = fadeIn(animationSpec = tween(500)) + slideInVertically(initialOffsetY = { -20 })
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(start = 24.dp, end = 24.dp, top = 40.dp, bottom = 20.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "Halo, Selamat datang!",
                                style = MaterialTheme.typography.titleSmall,
                                color = BizgrowColors.PrimaryLight.copy(alpha = 0.8f),
                                fontWeight = FontWeight.Normal
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = user?.username ?: "Pengusaha",
                                style = MaterialTheme.typography.headlineMedium,
                                color = BizgrowColors.White,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            IconButton(
                                onClick = { viewModel.navigate(Screen.Settings) },
                                modifier = Modifier
                                    .size(44.dp)
                                    .background(BizgrowColors.White.copy(alpha = 0.15f), CircleShape)
                            ) {
                                Icon(Icons.Default.Settings, "Pengaturan", tint = BizgrowColors.White)
                            }
                            IconButton(
                                onClick = { viewModel.navigate(Screen.Profile) },
                                modifier = Modifier
                                    .size(44.dp)
                                    .background(BizgrowColors.White.copy(alpha = 0.15f), CircleShape)
                            ) {
                                Icon(Icons.Default.Person, "Profil", tint = BizgrowColors.White)
                            }
                        }
                    }
                }

                // Overview Card
                AnimatedVisibility(
                    visible = isVisible,
                    enter = fadeIn(animationSpec = tween(600, delayMillis = 100)) + slideInVertically(initialOffsetY = { 20 }, animationSpec = tween(600, delayMillis = 100))
                ) {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 24.dp)
                            .shadow(12.dp, RoundedCornerShape(20.dp), spotColor = BizgrowColors.Primary.copy(alpha = 0.2f)),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = BizgrowColors.White)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "Total Bisnis Anda",
                                    fontSize = 13.sp,
                                    color = BizgrowColors.Slate500,
                                    fontWeight = FontWeight.Medium
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "${units.size} Cabang",
                                    fontSize = 24.sp,
                                    color = BizgrowColors.Slate900,
                                    fontWeight = FontWeight.Black
                                )
                            }
                            Box(
                                modifier = Modifier
                                    .size(56.dp)
                                    .background(BizgrowColors.SecondaryContainer, CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Business, contentDescription = null, tint = BizgrowColors.Secondary, modifier = Modifier.size(28.dp))
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))

                // Title for List
                AnimatedVisibility(
                    visible = isVisible,
                    enter = fadeIn(animationSpec = tween(600, delayMillis = 200))
                ) {
                    Text(
                        text = "Pilih Bisnis untuk Dikelola",
                        modifier = Modifier.padding(horizontal = 24.dp),
                        style = MaterialTheme.typography.titleMedium,
                        color = BizgrowColors.Slate900,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // List of Business Units
                LazyColumn(
                    contentPadding = PaddingValues(start = 24.dp, end = 24.dp, bottom = 100.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    if (units.isEmpty()) {
                        item {
                            AnimatedVisibility(
                                visible = isVisible,
                                enter = fadeIn(animationSpec = tween(600, delayMillis = 300))
                            ) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(top = 40.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Business,
                                        contentDescription = null,
                                        modifier = Modifier.size(64.dp),
                                        tint = BizgrowColors.Slate400
                                    )
                                    Spacer(modifier = Modifier.height(16.dp))
                                    Text(
                                        text = "Belum ada bisnis",
                                        color = BizgrowColors.Slate500,
                                        style = MaterialTheme.typography.titleMedium
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = "Ketuk tombol + di bawah untuk membuat",
                                        color = BizgrowColors.Slate400,
                                        style = MaterialTheme.typography.bodyMedium
                                    )
                                }
                            }
                        }
                    } else {
                        itemsIndexed(units) { index, unit ->
                            var itemVisible by remember { mutableStateOf(false) }
                            LaunchedEffect(Unit) {
                                delay(300L + (index * 100L))
                                itemVisible = true
                            }
                            
                            AnimatedVisibility(
                                visible = itemVisible,
                                enter = fadeIn(animationSpec = tween(500)) + slideInVertically(initialOffsetY = { 30 }, animationSpec = tween(500))
                            ) {
                                BusinessUnitCard(unit, onClick = {
                                    viewModel.selectUnit(unit)
                                })
                            }
                        }
                    }
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
            isLoading = viewModel.uiState.collectAsStateWithLifecycle().value.isLoading
        )
    }
}

@Composable
fun BusinessUnitCard(unit: BusinessUnit, onClick: () -> Unit) {
    val icon = when (unit.type.lowercase()) {
        "retail" -> Icons.Rounded.Store
        "fnb" -> Icons.Rounded.LocalDining
        else -> Icons.Rounded.MiscellaneousServices
    }
    
    val iconBgColor = when (unit.type.lowercase()) {
        "retail" -> BizgrowColors.PrimaryLight
        "fnb" -> BizgrowColors.SecondaryContainer
        else -> BizgrowColors.WarningLight
    }
    
    val iconColor = when (unit.type.lowercase()) {
        "retail" -> BizgrowColors.Primary
        "fnb" -> BizgrowColors.Secondary
        else -> BizgrowColors.Warning
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .shadow(4.dp, RoundedCornerShape(16.dp), spotColor = BizgrowColors.Slate200),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = BizgrowColors.White)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .background(iconBgColor, RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = iconColor, modifier = Modifier.size(28.dp))
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = unit.name,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = BizgrowColors.Slate900,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = unit.type.uppercase(),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = iconColor,
                    modifier = Modifier
                        .background(iconBgColor.copy(alpha = 0.5f), RoundedCornerShape(4.dp))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                )
            }
            Icon(Icons.Rounded.ChevronRight, contentDescription = null, tint = BizgrowColors.Slate400)
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
                Text("Bisnis Baru", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = BizgrowColors.Slate900)
                Spacer(modifier = Modifier.height(8.dp))
                Text("Buat profil bisnis baru untuk dikelola", color = BizgrowColors.Slate500, fontSize = 14.sp, textAlign = TextAlign.Center)
                
                Spacer(modifier = Modifier.height(24.dp))
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Nama Bisnis") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                Spacer(modifier = Modifier.height(16.dp))
                
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text("Tipe Bisnis", fontSize = 13.sp, color = BizgrowColors.Slate700, fontWeight = FontWeight.Medium)
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
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (isSelected) BizgrowColors.Primary else BizgrowColors.Slate100)
                                    .clickable { selectedType = type }
                                    .padding(vertical = 10.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = type,
                                    color = if (isSelected) BizgrowColors.White else BizgrowColors.Slate500,
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
                        shape = RoundedCornerShape(12.dp),
                        enabled = !isLoading,
                        border = androidx.compose.foundation.BorderStroke(1.dp, BizgrowColors.Slate200)
                    ) {
                        Text("Batal", color = BizgrowColors.Slate700, fontWeight = FontWeight.Bold)
                    }
                    Button(
                        onClick = { onConfirm(name, selectedType) },
                        modifier = Modifier.weight(1f).height(48.dp),
                        shape = RoundedCornerShape(12.dp),
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
