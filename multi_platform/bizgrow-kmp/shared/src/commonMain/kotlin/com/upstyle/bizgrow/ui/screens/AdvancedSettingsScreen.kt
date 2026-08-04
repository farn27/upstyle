package com.upstyle.bizgrow.ui.screens

import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Security
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
import androidx.compose.material3.PaddingValues
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.upstyle.bizgrow.ui.AppViewModel
import com.upstyle.bizgrow.ui.components.BizCard
import com.upstyle.bizgrow.ui.components.ErrorState
import com.upstyle.bizgrow.ui.theme.BizgrowColors

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun AdvancedSettingsScreen(viewModel: AppViewModel) {
    // Use advancedSettingsState which exists in AppViewModel
    val state by viewModel.advancedSettingsState.collectAsStateWithLifecycle()

    var profileName by remember { mutableStateOf("") }
    var profileEmail by remember { mutableStateOf("") }
    var profilePhone by remember { mutableStateOf("") }
    var currentPassword by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var darkMode by remember { mutableStateOf(false) }
    var notifEnabled by remember { mutableStateOf(true) }
    var showPasswordDialog by remember { mutableStateOf(false) }

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
            FloatingActionButton(
                onClick = {
                    viewModel.saveProfile(profileName.trim(), profileEmail.trim(), profilePhone.trim())
                    viewModel.updatePreferences(darkMode, notifEnabled)
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
        },
        bottomBar = { BottomNavBar(viewModel, AppViewModel.Screen.AdvancedSettings) }
    ) { paddingValues ->
        if (state.isLoading) {
            Box(Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = BizgrowColors.Primary)
            }
        } else if (state.error != null && profileName.isBlank() && profileEmail.isBlank()) {
            ErrorState(message = state.error ?: "Gagal memuat", onRetry = { viewModel.loadProfileSettings() })
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(paddingValues),
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
                                onValueChange = { profileName = it },
                                label = { Text("Nama Lengkap") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                singleLine = true,
                                leadingIcon = { Icon(Icons.Default.Edit, null, tint = BizgrowColors.Gray400) }
                            )
                            OutlinedTextField(
                                value = profileEmail,
                                onValueChange = { profileEmail = it },
                                label = { Text("Email") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                singleLine = true,
                                leadingIcon = { Icon(Icons.Default.Email, null, tint = BizgrowColors.Gray400) }
                            )
                            OutlinedTextField(
                                value = profilePhone,
                                onValueChange = { profilePhone = it },
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
                        TextButton(onClick = { showPasswordDialog = true }) {
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
                            IconButton(onClick = { showPasswordDialog = true }) {
                                Icon(Icons.Default.Lock, contentDescription = null, tint = BizgrowColors.Gray500)
                            }
                        }
                    }
                }

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
                                Switch(checked = darkMode, onCheckedChange = { darkMode = it })
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
                                Switch(checked = notifEnabled, onCheckedChange = { notifEnabled = it })
                            }
                        }
                    }
                }
                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }
    }

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
}
