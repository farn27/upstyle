package com.example.ui

import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    viewModel: SaaSViewModel,
    modifier: Modifier = Modifier
) {
    var isRegisterMode by remember { mutableStateOf(false) }
    var selectedRole by remember { mutableStateOf("OWNER") } // "OWNER" or "STAFF"

    var usernameInput by remember { mutableStateOf("") }
    var emailInput by remember { mutableStateOf("") }
    var passwordInput by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }

    var infoMessage by remember { mutableStateOf<String?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var showGoogleChooser by remember { mutableStateOf(false) }

    val focusManager = LocalFocusManager.current
    val scrollState = rememberScrollState()
    val employees by viewModel.employees.collectAsStateWithLifecycle()

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.2f),
                        MaterialTheme.colorScheme.background
                    )
                )
            )
            .windowInsetsPadding(WindowInsets.safeDrawing)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp)
                .verticalScroll(scrollState),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(20.dp))

            // Premium Bizgrow Logo
            Surface(
                color = MaterialTheme.colorScheme.primary,
                shape = RoundedCornerShape(20.dp),
                modifier = Modifier.size(72.dp),
                tonalElevation = 4.dp
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Default.BusinessCenter,
                        contentDescription = "Logo",
                        tint = MaterialTheme.colorScheme.onPrimary,
                        modifier = Modifier.size(36.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            // App Titles
            Text(
                text = "Bizgrow",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Black,
                color = MaterialTheme.colorScheme.onBackground,
                textAlign = TextAlign.Center
            )

            Text(
                text = "Enterprise Multi-Platform ERP Hub",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.5.sp,
                textAlign = TextAlign.Center
            )

            Text(
                text = "Satu platform terpadu untuk POS, inventori, laporan keuangan real-time, HR, dan CRM.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 16.dp)
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Mode Selector (Login vs Register)
            TabRow(
                selectedTabIndex = if (isRegisterMode) 1 else 0,
                containerColor = Color.Transparent,
                contentColor = MaterialTheme.colorScheme.primary,
                divider = {}
            ) {
                Tab(
                    selected = !isRegisterMode,
                    onClick = {
                        isRegisterMode = false
                        errorMessage = null
                        infoMessage = null
                    },
                    text = { Text("Masuk Akun", fontWeight = FontWeight.Bold) }
                )
                Tab(
                    selected = isRegisterMode,
                    onClick = {
                        isRegisterMode = true
                        errorMessage = null
                        infoMessage = null
                    },
                    text = { Text("Daftar Baru", fontWeight = FontWeight.Bold) }
                )
            }

            // Input Form Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(
                        text = if (isRegisterMode) "Pendaftaran Owner Bisnis" else "Kredensial Akses Pengguna",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )

                    if (!isRegisterMode) {
                        // Role Selector for Login Only
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Surface(
                                onClick = { selectedRole = "OWNER" },
                                color = if (selectedRole == "OWNER") MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.weight(1f),
                                border = BorderStroke(1.dp, if (selectedRole == "OWNER") MaterialTheme.colorScheme.primary else Color.Transparent)
                            ) {
                                Row(
                                    modifier = Modifier.padding(10.dp),
                                    horizontalArrangement = Arrangement.Center,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(Icons.Default.AdminPanelSettings, contentDescription = null, modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Owner / Admin", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                                }
                            }

                            Surface(
                                onClick = { selectedRole = "STAFF" },
                                color = if (selectedRole == "STAFF") MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.weight(1f),
                                border = BorderStroke(1.dp, if (selectedRole == "STAFF") MaterialTheme.colorScheme.secondary else Color.Transparent)
                            ) {
                                Row(
                                    modifier = Modifier.padding(10.dp),
                                    horizontalArrangement = Arrangement.Center,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(Icons.Default.Badge, contentDescription = null, modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Staf / Kasir", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }

                    if (isRegisterMode) {
                        // Username Field
                        OutlinedTextField(
                            value = usernameInput,
                            onValueChange = {
                                usernameInput = it
                                errorMessage = null
                            },
                            label = { Text("Nama Lengkap / Username") },
                            leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            singleLine = true
                        )
                    }

                    // Email Field
                    OutlinedTextField(
                        value = emailInput,
                        onValueChange = {
                            emailInput = it
                            errorMessage = null
                        },
                        label = { Text("Alamat Email") },
                        leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email)
                    )

                    // Password Field
                    OutlinedTextField(
                        value = passwordInput,
                        onValueChange = {
                            passwordInput = it
                            errorMessage = null
                        },
                        label = { Text(if (selectedRole == "OWNER" || isRegisterMode) "Sandi Keamanan" else "PIN / Sandi") },
                        leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    imageVector = if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                                    contentDescription = null
                                )
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        singleLine = true,
                        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = if (selectedRole == "STAFF" && !isRegisterMode) KeyboardType.NumberPassword else KeyboardType.Password)
                    )

                    // Error Message
                    AnimatedVisibility(visible = errorMessage != null) {
                        Surface(
                            color = MaterialTheme.colorScheme.errorContainer,
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(Icons.Default.Error, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                                Text(
                                    text = errorMessage ?: "",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onErrorContainer,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }

                    // Info Message
                    AnimatedVisibility(visible = infoMessage != null) {
                        Surface(
                            color = Color(0xFFE8F5E9),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF2E7D32))
                                Text(
                                    text = infoMessage ?: "",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color(0xFF1B5E20),
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }

                    // Action Button
                    Button(
                        onClick = {
                            focusManager.clearFocus()
                            if (isRegisterMode) {
                                if (usernameInput.isNotEmpty() && emailInput.isNotEmpty() && passwordInput.isNotEmpty()) {
                                    viewModel.registerUser(usernameInput, emailInput, passwordInput) { success, msg ->
                                        if (success) {
                                            infoMessage = "Registrasi berhasil! Silakan masuk."
                                            isRegisterMode = false
                                            errorMessage = null
                                        } else {
                                            errorMessage = msg ?: "Registrasi gagal."
                                        }
                                    }
                                } else {
                                    errorMessage = "Semua kolom pendaftaran wajib diisi!"
                                }
                            } else {
                                viewModel.loginUser(emailInput, passwordInput, selectedRole) { success ->
                                    if (!success) {
                                        errorMessage = "Email atau password salah. Silakan coba lagi lurd."
                                    }
                                }
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(
                            text = if (isRegisterMode) "Daftar Akun Bizgrow" else "Masuk ke Bizgrow",
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp
                        )
                    }

                    HorizontalDivider()

                    // Google Login Button
                    OutlinedButton(
                        onClick = { showGoogleChooser = true },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp),
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Surface(
                                shape = CircleShape,
                                color = Color.White,
                                border = BorderStroke(1.dp, Color.LightGray),
                                modifier = Modifier.size(24.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text("G", color = Color(0xFF4285F4), fontWeight = FontWeight.Black, fontSize = 14.sp)
                                }
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = if (isRegisterMode) "Daftar dengan Google" else "Masuk dengan Google",
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }
                }
            }

            // Quick Demo Helper
            if (!isRegisterMode) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.04f)),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.1f))
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Icon(Icons.Default.Info, contentDescription = null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary)
                            Text("Demo Shortcuts", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                        }

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(
                                onClick = {
                                    selectedRole = "OWNER"
                                    emailInput = "owner@nusantara.com"
                                    passwordInput = "admin123"
                                    viewModel.loginUser("owner@nusantara.com", "admin123", "OWNER")
                                },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Owner", style = MaterialTheme.typography.labelSmall)
                            }

                            OutlinedButton(
                                onClick = {
                                    selectedRole = "STAFF"
                                    emailInput = "staff@nusantara.com"
                                    passwordInput = "staff123"
                                    viewModel.loginUser("staff@nusantara.com", "staff123", "STAFF")
                                },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Text("Staf", style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))
        }
    }

    // Google Account Chooser Dialog
    if (showGoogleChooser) {
        Dialog(onDismissRequest = { showGoogleChooser = false }) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "Masuk via Google",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.ExtraBold
                    )
                    Text(
                        text = "Pilih akun Google terdaftar untuk login ke Bizgrow secara instan lurd:",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )

                    val googleAccounts = listOf(
                        "fahmirahman022704@gmail.com",
                        "guest.bizgrow@gmail.com"
                    )

                    Column(
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        googleAccounts.forEach { email ->
                            Surface(
                                onClick = {
                                    showGoogleChooser = false
                                    viewModel.loginWithGoogle("mock-token-$email") { success ->
                                        if (!success) {
                                            errorMessage = "Gagal login Google. Silakan daftarkan akun tersebut."
                                        }
                                    }
                                },
                                shape = RoundedCornerShape(12.dp),
                                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Surface(
                                        shape = CircleShape,
                                        color = Color.White,
                                        modifier = Modifier.size(32.dp),
                                        border = BorderStroke(1.dp, Color.LightGray)
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Text(email.take(1).uppercase(), color = Color(0xFF4285F4), fontWeight = FontWeight.Bold)
                                        }
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column {
                                        Text(
                                            text = email.split("@")[0].uppercase(),
                                            style = MaterialTheme.typography.bodyMedium,
                                            fontWeight = FontWeight.Bold
                                        )
                                        Text(
                                            text = email,
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }
                            }
                        }
                    }

                    TextButton(onClick = { showGoogleChooser = false }) {
                        Text("Batal", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
