package com.upstyle.bizgrow.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.upstyle.bizgrow.data.BusinessUnit
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.theme.BizgrowColors

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
            ExtendedFloatingActionButton(
                onClick = { showDialog = true },
                icon = { Icon(Icons.Default.Add, "Tambah Bisnis") },
                text = { Text("Bisnis Baru", fontWeight = FontWeight.Bold) },
                containerColor = BizgrowColors.Primary,
                contentColor = BizgrowColors.White,
                shape = RoundedCornerShape(16.dp),
                elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 4.dp)
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Premium Header with Gradient
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        brush = Brush.verticalGradient(
                            colors = listOf(BizgrowColors.Primary, BizgrowColors.PrimaryDark)
                        ),
                        shape = RoundedCornerShape(bottomStart = 32.dp, bottomEnd = 32.dp)
                    )
                    .padding(horizontal = 24.dp, vertical = 32.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Selamat Datang,",
                            style = MaterialTheme.typography.titleMedium,
                            color = BizgrowColors.PrimaryLight.copy(alpha = 0.8f)
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = user?.username ?: "Pengusaha",
                            style = MaterialTheme.typography.headlineLarge,
                            color = BizgrowColors.White
                        )
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        IconButton(
                            onClick = { viewModel.navigate(Screen.Settings) },
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(Color.White.copy(alpha = 0.2f))
                                .size(40.dp)
                        ) {
                            Icon(Icons.Default.Settings, contentDescription = "Settings", tint = BizgrowColors.White, modifier = Modifier.size(20.dp))
                        }
                        IconButton(
                            onClick = { viewModel.navigate(Screen.Profile) },
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(Color.White.copy(alpha = 0.2f))
                                .size(40.dp)
                        ) {
                            Icon(Icons.Default.Person, contentDescription = "Profile", tint = BizgrowColors.White, modifier = Modifier.size(20.dp))
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Unit Bisnis Section
            Column(modifier = Modifier.padding(horizontal = 24.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Unit Bisnis Anda",
                        style = MaterialTheme.typography.titleLarge,
                        color = BizgrowColors.Slate900
                    )
                    if (units.isNotEmpty()) {
                        Text(
                            text = "${units.size} unit",
                            style = MaterialTheme.typography.labelMedium,
                            color = BizgrowColors.Slate500,
                            modifier = Modifier
                                .background(BizgrowColors.Slate200, RoundedCornerShape(12.dp))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                AnimatedVisibility(
                    visible = isVisible,
                    enter = fadeIn() + slideInVertically(initialOffsetY = { 50 })
                ) {
                    if (units.isEmpty()) {
                        EmptyStateCard(onAddClick = { showDialog = true })
                    } else {
                        LazyVerticalGrid(
                            columns = GridCells.Fixed(2),
                            horizontalArrangement = Arrangement.spacedBy(16.dp),
                            verticalArrangement = Arrangement.spacedBy(16.dp),
                            contentPadding = PaddingValues(bottom = 80.dp) // space for FAB
                        ) {
                            items(units) { unit ->
                                BusinessUnitCard(
                                    unit = unit,
                                    onClick = { viewModel.selectUnit(unit) }
                                )
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
            onCreate = { name, type ->
                if (name.isNotBlank()) {
                    viewModel.createUnit(name, type)
                    showDialog = false
                }
            }
        )
    }
}

@Composable
fun EmptyStateCard(onAddClick: () -> Unit) {
    Card(
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = BizgrowColors.White),
        modifier = Modifier
            .fillMaxWidth()
            .shadow(elevation = 8.dp, shape = RoundedCornerShape(24.dp), spotColor = BizgrowColors.Slate200)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Surface(
                color = BizgrowColors.PrimaryLight,
                shape = CircleShape,
                modifier = Modifier.size(72.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Rounded.Store,
                        contentDescription = null,
                        tint = BizgrowColors.Primary,
                        modifier = Modifier.size(36.dp)
                    )
                }
            }
            Text(
                text = "Belum Ada Unit Bisnis",
                style = MaterialTheme.typography.titleMedium,
                color = BizgrowColors.Slate900
            )
            Text(
                text = "Mulai kelola usaha Anda dengan membuat unit bisnis pertama sekarang juga.",
                style = MaterialTheme.typography.bodyMedium,
                color = BizgrowColors.Slate500,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )
            Spacer(modifier = Modifier.height(8.dp))
            Button(
                onClick = onAddClick,
                colors = ButtonDefaults.buttonColors(containerColor = BizgrowColors.Primary),
                shape = RoundedCornerShape(12.dp),
                contentPadding = PaddingValues(horizontal = 24.dp, vertical = 12.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Buat Unit Bisnis", fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BusinessUnitCard(unit: BusinessUnit, onClick: () -> Unit) {
    val (icon, color, bgColor) = when (unit.type.uppercase()) {
        "FNB" -> Triple(Icons.Rounded.LocalDining, BizgrowColors.Warning, BizgrowColors.WarningLight)
        "RETAIL" -> Triple(Icons.Rounded.Store, BizgrowColors.Primary, BizgrowColors.PrimaryLight)
        "JASA" -> Triple(Icons.Rounded.MiscellaneousServices, BizgrowColors.Secondary, BizgrowColors.SecondaryContainer)
        else -> Triple(Icons.Default.Business, BizgrowColors.Slate700, BizgrowColors.Slate100)
    }

    Card(
        onClick = onClick,
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = BizgrowColors.White),
        modifier = Modifier
            .fillMaxWidth()
            .shadow(elevation = 6.dp, shape = RoundedCornerShape(20.dp), spotColor = BizgrowColors.Slate200, ambientColor = BizgrowColors.Slate200)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.Start
        ) {
            Surface(
                color = bgColor,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.size(48.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = color,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = unit.name,
                style = MaterialTheme.typography.titleMedium,
                color = BizgrowColors.Slate900,
                maxLines = 2,
                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = unit.type,
                style = MaterialTheme.typography.labelSmall,
                color = color,
                fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .background(bgColor, RoundedCornerShape(6.dp))
                    .padding(horizontal = 6.dp, vertical = 2.dp)
            )
        }
    }
}

@Composable
fun CreateUnitDialog(onDismiss: () -> Unit, onCreate: (String, String) -> Unit) {
    var name by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("RETAIL") }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = BizgrowColors.Surface,
        shape = RoundedCornerShape(24.dp),
        title = { Text("Buat Unit Bisnis", style = MaterialTheme.typography.titleLarge) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Nama Bisnis") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = BizgrowColors.Primary,
                        unfocusedBorderColor = BizgrowColors.Slate200
                    )
                )
                Text("Kategori Usaha", style = MaterialTheme.typography.labelMedium, color = BizgrowColors.Slate500)
                FlowRowPolyfill(
                    items = listOf("RETAIL", "FNB", "JASA", "LAINNYA"),
                    selectedItem = type,
                    onItemSelected = { type = it }
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onCreate(name, type) },
                colors = ButtonDefaults.buttonColors(containerColor = BizgrowColors.Primary),
                shape = RoundedCornerShape(12.dp)
            ) { Text("Buat Bisnis") }
        },
        dismissButton = {
            TextButton(
                onClick = onDismiss,
                colors = ButtonDefaults.textButtonColors(contentColor = BizgrowColors.Slate500)
            ) { Text("Batal") }
        }
    )
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun FlowRowPolyfill(items: List<String>, selectedItem: String, onItemSelected: (String) -> Unit) {
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items.forEach { t ->
            val selected = selectedItem == t
            Surface(
                onClick = { onItemSelected(t) },
                shape = RoundedCornerShape(20.dp),
                color = if (selected) BizgrowColors.Primary else BizgrowColors.Slate100,
                contentColor = if (selected) BizgrowColors.White else BizgrowColors.Slate700,
                modifier = Modifier.padding(bottom = 4.dp)
            ) {
                Text(
                    text = t,
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )
            }
        }
    }
}
