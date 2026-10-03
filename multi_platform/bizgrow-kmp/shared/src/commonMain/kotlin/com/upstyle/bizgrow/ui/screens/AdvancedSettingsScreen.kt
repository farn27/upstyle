package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.BugReport
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.FloatingActionButtonDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import androidx.compose.runtime.collectAsState
import com.upstyle.bizgrow.data.BusinessUnit
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.ui.components.BizCard
import com.upstyle.bizgrow.ui.components.ErrorState
import com.upstyle.bizgrow.ui.theme.BizgrowColors

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun AdvancedSettingsScreen(viewModel: AppViewModel) {
    val state by viewModel.advancedSettingsState.collectAsState(initial = viewModel.advancedSettingsState.value)
    val units by viewModel.units.collectAsState(initial = viewModel.units.value)
    val activeUnit by viewModel.activeUnit.collectAsState(initial = viewModel.activeUnit.value)

    // Tab state
    var selectedTab by remember { mutableStateOf(0) }

    // Profil tab state
    var profileName by remember { mutableStateOf("") }
    var profileEmail by remember { mutableStateOf("") }
    var profilePhone by remember { mutableStateOf("") }
    var currentPassword by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var showPasswordDialog by remember { mutableStateOf(false) }

    // Preferensi tab state
    var darkMode by remember { mutableStateOf(false) }
    var notifEnabled by remember { mutableStateOf(true) }

    // Workspace tab state
    var showCreateUnitDialog by remember { mutableStateOf(false) }
    var newUnitName by remember { mutableStateOf("") }
    var newUnitType by remember { mutableStateOf("retail") }
    var showDeleteConfirm by remember { mutableStateOf<BusinessUnit?>(null) }

    // Load profile on first open
    LaunchedEffect(Unit) { viewModel.loadProfileSettings() }

    // Populate fields from state
    LaunchedEffect(state.username, state.email, state.phone) {
        profileName = state.username
        profileEmail = state.email
        profilePhone = state.phone
    }
    LaunchedEffect(state.darkMode, state.notifEnabled) {
        darkMode = state.darkMode
        notifEnabled = state.notifEnabled
    }

    val tabs = listOf("Profil", "Workspace", "Preferensi")

    Scaffold(
        containerColor = BizgrowColors.Background,
        topBar = {
            TopAppBar(
                title = { Text("Pengaturan", fontWeight = FontWeight.Black, color = BizgrowColors.Gray950, fontSize = 20.sp) },
                navigationIcon = {
                    IconButton(onClick = { viewModel.navigateBack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali", tint = BizgrowColors.Gray900)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = BizgrowColors.Surface)
            )
        },
        floatingActionButton = {
            // Only show save FAB on Profil and Preferensi tabs
            if (selectedTab == 0 || selectedTab == 2) {
                FloatingActionButton(
                    onClick = {
                        if (selectedTab == 0) {
                            viewModel.saveProfile(profileName.trim(), profileEmail.trim(), profilePhone.trim())
                        } else {
                            viewModel.updatePreferences(darkMode, notifEnabled)
                        }
                    },
                    containerColor = BizgrowColors.Primary,
                    contentColor = Color.White,
                    shape = RoundedCornerShape(16.dp),
                    elevation = FloatingActionButtonDefaults.elevation(2.dp)
                ) {
                    if (state.isSaving) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.White, strokeWidth = 2.dp)
                    } else {
                        Icon(Icons.Default.Save, contentDescription = "Simpan")
                    }
                }
            }
        },
        bottomBar = { BottomNavBar(viewModel, Screen.AdvancedSettings) }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Tab row
            TabRow(selectedTabIndex = selectedTab) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = { Text(title) }
                    )
                }
            }

            when (selectedTab) {
                0 -> ProfilTab(
                    state = state,
                    profileName = profileName,
                    profileEmail = profileEmail,
                    profilePhone = profilePhone,
                    onNameChange = { profileName = it },
                    onEmailChange = { profileEmail = it },
                    onPhoneChange = { profilePhone = it },
                    onShowPasswordDialog = { showPasswordDialog = true }
                )

                1 -> WorkspaceTab(
                    units = units,
                    activeUnit = activeUnit,
                    onSelectUnit = { viewModel.selectUnit(it.id) },
                    onDeleteUnit = { showDeleteConfirm = it },
                    onAddUnit = { showCreateUnitDialog = true },
                    onNavigateExportImport = { viewModel.navigate(Screen.ExportImport) },
                    onNavigateDiagnostics = { viewModel.navigate(Screen.Diagnostics) }
                )

                2 -> PreferensiTab(
                    darkMode = darkMode,
                    notifEnabled = notifEnabled,
                    onDarkModeChange = { darkMode = it },
                    onNotifChange = { notifEnabled = it }
                )
            }
        }
    }

    // Password change dialog
    if (showPasswordDialog) {
        AlertDialog(
            onDismissRequest = { showPasswordDialog = false },
            title = { Text("Ubah Password", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = currentPassword,
                        onValueChange = { currentPassword = it },
                        label = { Text("Password Saat Ini") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = newPassword,
                        onValueChange = { newPassword = it },
                        label = { Text("Password Baru") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = confirmPassword,
                        onValueChange = { confirmPassword = it },
                        label = { Text("Konfirmasi Password") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        singleLine = true
                    )
                    if (newPassword.isNotBlank() && confirmPassword.isNotBlank() && newPassword != confirmPassword) {
                        Text("Password tidak cocok", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (newPassword.isNotBlank() && newPassword == confirmPassword) {
                            viewModel.changePassword(currentPassword, newPassword)
                            showPasswordDialog = false
                            currentPassword = ""; newPassword = ""; confirmPassword = ""
                        }
                    },
                    enabled = newPassword.isNotBlank() && newPassword == confirmPassword,
                    shape = RoundedCornerShape(12.dp)
                ) { Text("Simpan") }
            },
            dismissButton = { TextButton(onClick = { showPasswordDialog = false }) { Text("Batal") } }
        )
    }

    // Create unit dialog
    if (showCreateUnitDialog) {
        AlertDialog(
            onDismissRequest = { showCreateUnitDialog = false; newUnitName = "" },
            title = { Text("Tambah Unit Bisnis", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = newUnitName,
                        onValueChange = { newUnitName = it },
                        label = { Text("Nama Bisnis") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        singleLine = true
                    )
                    // Simple type selector
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("retail", "cafe", "jasa").forEach { type ->
                            val selected = newUnitType == type
                            Button(
                                onClick = { newUnitType = type },
                                colors = if (selected)
                                    androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = BizgrowColors.Primary)
                                else
                                    androidx.compose.material3.ButtonDefaults.outlinedButtonColors(),
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                            ) {
                                Text(type, fontSize = 12.sp)
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (newUnitName.isNotBlank()) {
                            viewModel.createUnit(newUnitName.trim(), newUnitType)
                            showCreateUnitDialog = false
                            newUnitName = ""
                        }
                    },
                    enabled = newUnitName.isNotBlank(),
                    shape = RoundedCornerShape(12.dp)
                ) { Text("Buat") }
            },
            dismissButton = {
                TextButton(onClick = { showCreateUnitDialog = false; newUnitName = "" }) { Text("Batal") }
            }
        )
    }

    // Delete unit confirmation dialog
    showDeleteConfirm?.let { unit ->
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = null },
            title = { Text("Hapus Bisnis?", fontWeight = FontWeight.Bold) },
            text = { Text("Unit bisnis \"${unit.name}\" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.") },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.deleteUnit(unit.id)
                        showDeleteConfirm = null
                    },
                    colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                    shape = RoundedCornerShape(12.dp)
                ) { Text("Hapus") }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = null }) { Text("Batal") }
            }
        )
    }
}

// ─── Profil Tab ───────────────────────────────────────────────────────────────

@Composable
private fun ProfilTab(
    state: com.upstyle.bizgrow.ui.state.AdvancedSettingsState,
    profileName: String,
    profileEmail: String,
    profilePhone: String,
    onNameChange: (String) -> Unit,
    onEmailChange: (String) -> Unit,
    onPhoneChange: (String) -> Unit,
    onShowPasswordDialog: () -> Unit
) {
    if (state.isLoading) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = BizgrowColors.Primary)
        }
        return
    }

    if (state.error != null && profileName.isBlank() && profileEmail.isBlank()) {
        ErrorState(message = state.error, onRetry = {})
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Profil", style = MaterialTheme.typography.labelLarge, color = BizgrowColors.Gray700, fontWeight = FontWeight.Bold)
        }
        item {
            BizCard {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = profileName,
                        onValueChange = onNameChange,
                        label = { Text("Nama Lengkap") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        singleLine = true,
                        leadingIcon = { Icon(Icons.Default.Edit, null, tint = BizgrowColors.Gray400) }
                    )
                    OutlinedTextField(
                        value = profileEmail,
                        onValueChange = onEmailChange,
                        label = { Text("Email") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        singleLine = true,
                        leadingIcon = { Icon(Icons.Default.Email, null, tint = BizgrowColors.Gray400) }
                    )
                    OutlinedTextField(
                        value = profilePhone,
                        onValueChange = onPhoneChange,
                        label = { Text("Telepon") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        singleLine = true,
                        leadingIcon = { Icon(Icons.Default.Phone, null, tint = BizgrowColors.Gray400) }
                    )
                }
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Keamanan", style = MaterialTheme.typography.labelLarge, color = BizgrowColors.Gray700, fontWeight = FontWeight.Bold)
                TextButton(onClick = onShowPasswordDialog) {
                    Text("Ubah Password", color = BizgrowColors.Primary, fontWeight = FontWeight.Bold)
                }
            }
        }
        item {
            BizCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Icon(Icons.Default.Security, contentDescription = null, tint = BizgrowColors.Gray500)
                        Column {
                            Text("Password", fontWeight = FontWeight.Bold, color = BizgrowColors.Gray950)
                            Text("Klik untuk mengubah password", style = MaterialTheme.typography.bodySmall, color = BizgrowColors.Gray500)
                        }
                    }
                    IconButton(onClick = onShowPasswordDialog) {
                        Icon(Icons.Default.Lock, contentDescription = null, tint = BizgrowColors.Gray500)
                    }
                }
            }
        }
        item { Spacer(modifier = Modifier.height(80.dp)) }
    }
}

// ─── Workspace Tab ────────────────────────────────────────────────────────────

@Composable
private fun WorkspaceTab(
    units: List<BusinessUnit>,
    activeUnit: BusinessUnit?,
    onSelectUnit: (BusinessUnit) -> Unit,
    onDeleteUnit: (BusinessUnit) -> Unit,
    onAddUnit: () -> Unit,
    onNavigateExportImport: () -> Unit,
    onNavigateDiagnostics: () -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Unit Bisnis", style = MaterialTheme.typography.labelLarge, color = BizgrowColors.Gray700, fontWeight = FontWeight.Bold)
                TextButton(onClick = onAddUnit) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                    Text(" Tambah", color = BizgrowColors.Primary, fontWeight = FontWeight.Bold)
                }
            }
        }

        if (units.isEmpty()) {
            item {
                BizCard {
                    Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                        Text("Belum ada unit bisnis", color = BizgrowColors.Gray500, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        } else {
            items(units.size) { index ->
                val unit = units[index]
                val isActive = unit.id == activeUnit?.id
                BizCard {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onSelectUnit(unit) },
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(
                                Icons.Default.Business,
                                contentDescription = null,
                                tint = if (isActive) BizgrowColors.Primary else BizgrowColors.Gray400
                            )
                            Column {
                                Text(
                                    unit.name,
                                    fontWeight = if (isActive) FontWeight.Bold else FontWeight.Normal,
                                    color = if (isActive) BizgrowColors.Primary else BizgrowColors.Gray950,
                                    fontSize = 14.sp
                                )
                                Text(
                                    unit.type,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = BizgrowColors.Gray500
                                )
                            }
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            if (isActive) {
                                Icon(Icons.Default.Check, contentDescription = "Aktif", tint = BizgrowColors.Primary, modifier = Modifier.size(20.dp))
                            }
                            if (units.size > 1) {
                                IconButton(onClick = { onDeleteUnit(unit) }) {
                                    Icon(Icons.Default.Delete, contentDescription = "Hapus", tint = BizgrowColors.Gray400, modifier = Modifier.size(20.dp))
                                }
                            }
                        }
                    }
                }
            }
        }

        item {
            Text("Utilitas", style = MaterialTheme.typography.labelLarge, color = BizgrowColors.Gray700, fontWeight = FontWeight.Bold)
        }

        item {
            BizCard {
                Column(verticalArrangement = Arrangement.spacedBy(0.dp)) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onNavigateExportImport() }
                            .padding(vertical = 14.dp, horizontal = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Icon(Icons.Default.SwapHoriz, contentDescription = null, tint = BizgrowColors.Gray500)
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Export / Import Data", fontWeight = FontWeight.Bold, color = BizgrowColors.Gray950, fontSize = 14.sp)
                            Text("Ekspor atau impor data bisnis", style = MaterialTheme.typography.bodySmall, color = BizgrowColors.Gray500)
                        }
                    }

                    HorizontalDivider(color = BizgrowColors.Gray200)

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onNavigateDiagnostics() }
                            .padding(vertical = 14.dp, horizontal = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Icon(Icons.Default.BugReport, contentDescription = null, tint = BizgrowColors.Gray500)
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Diagnostik Sistem", fontWeight = FontWeight.Bold, color = BizgrowColors.Gray950, fontSize = 14.sp)
                            Text("Periksa koneksi dan status sistem", style = MaterialTheme.typography.bodySmall, color = BizgrowColors.Gray500)
                        }
                    }
                }
            }
        }

        item { Spacer(modifier = Modifier.height(80.dp)) }
    }
}

// ─── Preferensi Tab ───────────────────────────────────────────────────────────

@Composable
private fun PreferensiTab(
    darkMode: Boolean,
    notifEnabled: Boolean,
    onDarkModeChange: (Boolean) -> Unit,
    onNotifChange: (Boolean) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Preferensi", style = MaterialTheme.typography.labelLarge, color = BizgrowColors.Gray700, fontWeight = FontWeight.Bold)
        }
        item {
            BizCard {
                Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Icon(Icons.Default.DarkMode, null, tint = BizgrowColors.Gray500)
                            Column {
                                Text("Dark Mode", fontWeight = FontWeight.Bold, color = BizgrowColors.Gray950, fontSize = 14.sp)
                                Text("Tampilan tema gelap", style = MaterialTheme.typography.bodySmall, color = BizgrowColors.Gray500)
                            }
                        }
                        Switch(checked = darkMode, onCheckedChange = onDarkModeChange)
                    }
                    HorizontalDivider(color = BizgrowColors.Gray200)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Icon(Icons.Default.Notifications, null, tint = BizgrowColors.Gray500)
                            Column {
                                Text("Notifikasi", fontWeight = FontWeight.Bold, color = BizgrowColors.Gray950, fontSize = 14.sp)
                                Text("Aktifkan notifikasi push", style = MaterialTheme.typography.bodySmall, color = BizgrowColors.Gray500)
                            }
                        }
                        Switch(checked = notifEnabled, onCheckedChange = onNotifChange)
                    }
                }
            }
        }
        item { Spacer(modifier = Modifier.height(80.dp)) }
    }
}
